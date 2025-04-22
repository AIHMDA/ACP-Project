import { AgentCapability, AgentMetadata, ExecutionResult } from './types';

export abstract class BaseAgent {
  protected id: string;
  protected capabilities: Map<string, AgentCapability>;
  protected metadata: AgentMetadata;
  protected state: Map<string, unknown>;
  protected auditLog: Array<{
    timestamp: Date;
    action: string;
    details: Record<string, unknown>;
  }>;

  constructor(id: string, metadata: AgentMetadata) {
    this.id = id;
    this.capabilities = new Map();
    this.metadata = metadata;
    this.state = new Map();
    this.auditLog = [];
    
    // Initialize agent state
    this.state.set('status', 'idle');
    this.state.set('lastActivity', null);
    this.state.set('errors', []);
  }

  public getId(): string {
    return this.id;
  }

  public getState(): Record<string, unknown> {
    return Object.fromEntries(this.state);
  }

  public getMetadata(): AgentMetadata {
    return this.metadata;
  }

  public getCapabilities(): AgentCapability[] {
    return Array.from(this.capabilities.values());
  }

  public async executeCapability(
    capabilityName: string, 
    params: Record<string, unknown>
  ): Promise<ExecutionResult> {
    const capability = this.capabilities.get(capabilityName);
    if (!capability) {
      throw new Error(`Capability ${capabilityName} not found`);
    }
    
    const startTime = new Date();
    this.state.set('status', 'executing');
    this.state.set('lastActivity', startTime);

    try {
      await this.validateParameters(capability, params);
      const result = await this.execute(capability, params);
      
      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();
      
      const executionResult: ExecutionResult = {
        success: true,
        data: result,
        metadata: {
          startTime,
          endTime,
          duration,
          resourceUsage: await this.getResourceUsage()
        }
      };

      await this.logExecution(capability, params, executionResult);
      this.state.set('status', 'idle');
      return executionResult;

    } catch (error) {
      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      const executionResult: ExecutionResult = {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Unknown error',
          code: 'EXECUTION_ERROR',
          details: { originalError: error }
        },
        metadata: {
          startTime,
          endTime,
          duration,
          resourceUsage: await this.getResourceUsage()
        }
      };

      await this.handleError(error, capability, params);
      this.state.set('status', 'error');
      return executionResult;
    }
  }

  protected abstract execute(
    capability: AgentCapability, 
    params: Record<string, unknown>
  ): Promise<unknown>;

  protected abstract validateParameters(
    capability: AgentCapability, 
    params: Record<string, unknown>
  ): Promise<void>;

  protected async getResourceUsage(): Promise<{ cpu?: number; memory?: number }> {
    // Implementer ressourceovervågning her
    return {};
  }

  protected async logExecution(
    capability: AgentCapability,
    params: Record<string, unknown>,
    result: ExecutionResult
  ): Promise<void> {
    this.auditLog.push({
      timestamp: new Date(),
      action: `execute_${capability.name}`,
      details: {
        params,
        result,
        metadata: this.metadata,
        state: this.getState()
      }
    });
  }

  protected async handleError(
    error: Error,
    capability: AgentCapability,
    params: Record<string, unknown>
  ): Promise<void> {
    const errors = this.state.get('errors') as Error[] || [];
    errors.push(error);
    this.state.set('errors', errors);

    this.auditLog.push({
      timestamp: new Date(),
      action: `error_${capability.name}`,
      details: {
        error: error.message,
        stack: error.stack,
        params,
        metadata: this.metadata,
        state: this.getState()
      }
    });
  }

  public getAuditLog(): Array<{
    timestamp: Date;
    action: string;
    details: Record<string, unknown>;
  }> {
    return [...this.auditLog];
  }

  public clearErrors(): void {
    this.state.set('errors', []);
  }
} 