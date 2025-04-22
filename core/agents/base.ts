import { v4 as uuidv4 } from 'uuid';
import { AgentExecutionResult, ValidationResult } from '../types';

export interface IACPAgent {
  id: string;
  name: string;
  type: string;
  description?: string;
  capabilities: string[];
  
  execute(
    prompt: string, 
    context: {
      workspace: any;
      user?: string;
      data?: any;
    }
  ): Promise<AgentExecutionResult>;
  
  validate(): ValidationResult;
  getMetadata(): AgentMetadata;
}

export interface AgentMetadata {
  id: string;
  name: string;
  type: string;
  description?: string;
  capabilities: string[];
  config?: any;
}

export abstract class BaseAgent implements IACPAgent {
  id: string;
  name: string;
  type: string;
  description: string;
  capabilities: string[];
  
  constructor(config: Partial<IACPAgent>) {
    this.id = config.id || uuidv4();
    this.name = config.name || 'Unnamed Agent';
    this.type = this.constructor.name;
    this.description = config.description || '';
    this.capabilities = config.capabilities || [];
  }
  
  abstract execute(
    prompt: string, 
    context: {
      workspace: any;
      user?: string;
      data?: any;
    }
  ): Promise<AgentExecutionResult>;
  
  validate(): ValidationResult {
    return { valid: true };
  }
  
  getMetadata(): AgentMetadata {
    return {
      id: this.id,
      name: this.name,
      type: this.type,
      description: this.description,
      capabilities: this.capabilities
    };
  }
  
  protected async logActivity(
    action: string, 
    details: any, 
    success: boolean = true
  ): Promise<void> {
    console.log(
      `[Agent:${this.name}] ${action} - ${success ? 'SUCCESS' : 'ERROR'}`,
      details
    );
  }
} 