import { v4 as uuidv4 } from 'uuid';
import { IAgent, AgentResult, ExecutionContext } from '../interfaces/Agent';
import { db } from '../database/connection';

export abstract class BaseAgent implements IAgent {
  id: string;
  name: string;
  type: string;
  workspaceId: string;
  capabilities: string[];
  
  constructor(config: {
    id?: string;
    name: string;
    type: string;
    workspaceId: string;
    capabilities?: string[];
  }) {
    this.id = config.id || uuidv4();
    this.name = config.name;
    this.type = config.type;
    this.workspaceId = config.workspaceId;
    this.capabilities = config.capabilities || [];
  }
  
  abstract execute(input: any, context: ExecutionContext): Promise<AgentResult>;
  
  // Fælles hjælpemetoder for alle agenter
  protected async logActivity(
    activity: string, 
    details: any,
    success: boolean = true
  ): Promise<void> {
    // Log agent aktivitet til database
    try {
      await db.query(
        'INSERT INTO agent_activity_logs (agent_id, activity, details, success, timestamp) VALUES ($1, $2, $3, $4, $5)',
        [this.id, activity, JSON.stringify(details), success, new Date()]
      );
    } catch (error) {
      console.error('Kunne ikke logge agent aktivitet:', error);
    }
  }
} 