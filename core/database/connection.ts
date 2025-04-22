import { Pool } from 'pg';

// Opret connection pool
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT || '5432'),
  max: 20, // maksimum antal connections i poolen
  idleTimeoutMillis: 30000, // hvor længe en inaktiv connection holdes åben
  connectionTimeoutMillis: 2000, // hvor længe der ventes på en connection
});

// Håndtér pool errors
pool.on('error', (err, client) => {
  console.error('Uventet fejl på inaktiv client', err);
  process.exit(-1);
});

// Database query helper
export const db = {
  query: async (text: string, params?: any[]) => {
    const start = Date.now();
    try {
      const result = await pool.query(text, params);
      const duration = Date.now() - start;
      
      // Log langsomme queries for performance optimering
      if (duration > 200) {
        console.warn('Langsom query:', { text, duration, rows: result.rowCount });
      }
      
      return result;
    } catch (error) {
      console.error('Database query fejl:', error);
      throw error;
    }
  },
  
  getClient: async () => {
    const client = await pool.connect();
    const query = client.query;
    const release = client.release;
    
    // Override client.query for at logge
    client.query = (...args: any[]) => {
      client.lastQuery = args;
      return query.apply(client, args);
    };
    
    // Override client.release for at opdage fejl
    client.release = () => {
      client.query = query;
      client.release = release;
      return release.apply(client);
    };
    
    return client;
  }
}; 