import { IAgent, ExecutionContext } from '../interfaces/Agent';
import { randomBytes, createHash, scrypt, timingSafeEqual } from 'crypto';
import { TokenOptions, AuthToken } from '../interfaces/auth.types';
import { performance } from 'perf_hooks';

export interface AuthError {
  code: string;
  message: string;
  details?: Record<string, any>;
}

export interface AuthenticationResult {
  success: boolean;
  token?: string;
  error?: AuthError;
  metadata?: Record<string, any>;
}

export class AuthenticationHandler {
  private static instance: AuthenticationHandler;
  private readonly tokenCache: Map<string, AuthToken> = new Map();
  private readonly SECRET_KEY: string = process.env.AUTH_SECRET_KEY || this.generateSecretKey();
  private readonly performanceMetrics: Map<string, number[]> = new Map();

  private constructor() {
    // Initialize performance metrics
    this.performanceMetrics.set('tokenGeneration', []);
    this.performanceMetrics.set('tokenValidation', []);
    this.performanceMetrics.set('authentication', []);
  }

  public static getInstance(): AuthenticationHandler {
    if (!AuthenticationHandler.instance) {
      AuthenticationHandler.instance = new AuthenticationHandler();
    }
    return AuthenticationHandler.instance;
  }

  private generateSecretKey(): string {
    return randomBytes(32).toString('hex');
  }

  private generateTokenId(): string {
    return randomBytes(16).toString('hex');
  }

  private async generateSecureToken(payload: string): Promise<string> {
    const salt = randomBytes(16);
    const key = await new Promise<Buffer>((resolve, reject) => {
      scrypt(this.SECRET_KEY, salt, 32, (err, key) => {
        if (err) reject(err);
        resolve(key);
      });
    });
    
    const hmac = createHash('sha256')
      .update(key)
      .update(payload)
      .digest();
      
    return Buffer.concat([salt, hmac]).toString('base64');
  }

  private async verifySecureToken(token: string, payload: string): Promise<boolean> {
    try {
      const tokenBuffer = Buffer.from(token, 'base64');
      const salt = tokenBuffer.slice(0, 16);
      const storedHmac = tokenBuffer.slice(16);

      const key = await new Promise<Buffer>((resolve, reject) => {
        scrypt(this.SECRET_KEY, salt, 32, (err, key) => {
          if (err) reject(err);
          resolve(key);
        });
      });

      const hmac = createHash('sha256')
        .update(key)
        .update(payload)
        .digest();

      return timingSafeEqual(hmac, storedHmac);
    } catch (error) {
      return false;
    }
  }

  private measurePerformance<T>(metricName: string, fn: () => Promise<T>): Promise<T> {
    const startTime = performance.now();
    return fn().then(result => {
      const duration = performance.now() - startTime;
      const metrics = this.performanceMetrics.get(metricName) || [];
      metrics.push(duration);
      this.performanceMetrics.set(metricName, metrics);
      return result;
    });
  }

  public getPerformanceMetrics(): Record<string, { 
    average: number;
    min: number;
    max: number;
    count: number;
  }> {
    const result: Record<string, any> = {};
    
    for (const [name, measurements] of this.performanceMetrics.entries()) {
      if (measurements.length === 0) continue;
      
      result[name] = {
        average: measurements.reduce((a, b) => a + b, 0) / measurements.length,
        min: Math.min(...measurements),
        max: Math.max(...measurements),
        count: measurements.length
      };
    }
    
    return result;
  }

  public async generateToken(options: TokenOptions): Promise<AuthToken> {
    return this.measurePerformance('tokenGeneration', async () => {
      const tokenId = this.generateTokenId();
      const timestamp = Date.now();
      const expiresAt = timestamp + (options.expiresIn || 3600000);

      const payload = {
        id: tokenId,
        agentId: options.agentId,
        capabilities: options.capabilities || [],
        issuedAt: timestamp,
        expiresAt: expiresAt
      };

      const payloadStr = JSON.stringify(payload);
      const signature = await this.generateSecureToken(payloadStr);

      const token: AuthToken = {
        ...payload,
        signature
      };

      this.tokenCache.set(tokenId, token);
      return token;
    });
  }

  public async validateToken(token: AuthToken): Promise<boolean> {
    return this.measurePerformance('tokenValidation', async () => {
      const cachedToken = this.tokenCache.get(token.id);
      if (!cachedToken) {
        return false;
      }

      if (Date.now() > token.expiresAt) {
        this.tokenCache.delete(token.id);
        return false;
      }

      const payload = { ...token };
      delete payload.signature;
      return this.verifySecureToken(token.signature, JSON.stringify(payload));
    });
  }

  public revokeToken(tokenId: string): void {
    this.tokenCache.delete(tokenId);
  }

  public clearExpiredTokens(): void {
    const now = Date.now();
    for (const [tokenId, token] of this.tokenCache.entries()) {
      if (token.expiresAt <= now) {
        this.tokenCache.delete(tokenId);
      }
    }
  }

  public async authenticateAgent(agent: IAgent, context: ExecutionContext): Promise<AuthenticationResult> {
    try {
      // Validér agent credentials
      if (!this.validateAgentCredentials(agent)) {
        return {
          success: false,
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Agent credentials are invalid or missing'
          }
        };
      }

      // Tjek cache for eksisterende token
      const cachedAuth = this.tokenCache.get(agent.id);
      if (cachedAuth && cachedAuth.expiresAt > Date.now()) {
        return {
          success: true,
          token: cachedAuth.id,
          metadata: { fromCache: true }
        };
      }

      // Generer nyt token
      const token = await this.generateToken({
        agentId: agent.id,
        capabilities: agent.capabilities,
        workspaceId: context.workspaceId,
        userId: context.userId
      });
      
      // Gem i cache
      this.tokenCache.set(agent.id, token);

      return {
        success: true,
        token: token.id,
        metadata: { fromCache: false }
      };

    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'AUTH_FAILED',
          message: 'Authentication failed',
          details: { error: error.message }
        }
      };
    }
  }

  private validateAgentCredentials(agent: IAgent): boolean {
    // Implementér credential validering
    return !!(agent.id && agent.type && agent.capabilities);
  }
} 