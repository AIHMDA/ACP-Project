import { v4 as uuidv4 } from 'uuid';
import { IACPAgent } from './types';
import { ACPWorkspace } from '../workspace/workspace';
import { IACPAgentManager, IACPAgentInvocation, InvocationStatus } from './invocation';

export class ACPAgentManager implements IACPAgentManager {
  private invocations: Map<string, IACPAgentInvocation> = new Map();
  private maxConcurrentInvocations: number = 10;
  private defaultTimeout: number = 30000; // 30 sekunder

  constructor(config?: { maxConcurrent?: number; defaultTimeout?: number }) {
    if (config?.maxConcurrent) {
      this.maxConcurrentInvocations = config.maxConcurrent;
    }
    if (config?.defaultTimeout) {
      this.defaultTimeout = config.defaultTimeout;
    }
  }

  async invokeAgent(
    agent: IACPAgent,
    prompt: string,
    workspace: ACPWorkspace,
    user?: string
  ): Promise<string> {
    // Tjek om vi har nået max antal samtidige invocations
    const activeInvocations = this.getActiveInvocations();
    if (activeInvocations.length >= this.maxConcurrentInvocations) {
      throw new Error('Maksimalt antal samtidige agent invocations er nået');
    }

    const invocationId = uuidv4();
    
    // Opret invocation record
    const invocation: IACPAgentInvocation = {
      id: invocationId,
      agentId: agent.id,
      workspaceId: workspace.id,
      prompt,
      timestamp: new Date().toISOString(),
      userId: user,
      status: 'pending',
      metadata: {
        startTime: new Date().toISOString()
      }
    };
    
    this.invocations.set(invocationId, invocation);
    
    // Start agentens eksekvering asynkront
    setTimeout(async () => {
      try {
        // Opdatér status
        invocation.status = 'running';
        this.invocations.set(invocationId, invocation);
        
        // Eksekver agent
        const result = await agent.execute(prompt, {
          workspace: {
            id: workspace.id,
            settings: workspace.settings,
            vectors: workspace.vectors
          },
          user
        });
        
        // Gem resultat
        const endTime = new Date().toISOString();
        invocation.status = 'completed';
        invocation.result = result;
        invocation.metadata = {
          ...invocation.metadata,
          endTime,
          duration: new Date(endTime).getTime() - new Date(invocation.metadata?.startTime!).getTime()
        };
        this.invocations.set(invocationId, invocation);
      } catch (error) {
        // Gem fejl
        const endTime = new Date().toISOString();
        invocation.status = 'failed';
        invocation.error = error.message;
        invocation.metadata = {
          ...invocation.metadata,
          endTime,
          duration: new Date(endTime).getTime() - new Date(invocation.metadata?.startTime!).getTime()
        };
        this.invocations.set(invocationId, invocation);
      }
    }, 0);
    
    return invocationId;
  }

  getInvocationStatus(invocationId: string): IACPAgentInvocation | null {
    return this.invocations.get(invocationId) || null;
  }

  async waitForCompletion(
    invocationId: string, 
    timeout: number = this.defaultTimeout
  ): Promise<IACPAgentInvocation> {
    const startTime = Date.now();
    
    return new Promise((resolve, reject) => {
      const checkStatus = () => {
        const invocation = this.getInvocationStatus(invocationId);
        
        if (!invocation) {
          return reject(new Error(`Invocation ${invocationId} blev ikke fundet`));
        }
        
        if (invocation.status === 'completed' || invocation.status === 'failed') {
          return resolve(invocation);
        }
        
        if (Date.now() - startTime > timeout) {
          // Opdatér invocation status til fejlet ved timeout
          invocation.status = 'failed';
          invocation.error = `Timeout efter ${timeout}ms`;
          this.invocations.set(invocationId, invocation);
          return reject(new Error(`Timeout for invocation ${invocationId}`));
        }
        
        // Check igen om 100ms
        setTimeout(checkStatus, 100);
      };
      
      checkStatus();
    });
  }

  cancelInvocation(invocationId: string): boolean {
    const invocation = this.invocations.get(invocationId);
    if (!invocation) return false;

    if (invocation.status === 'pending' || invocation.status === 'running') {
      invocation.status = 'cancelled';
      invocation.metadata = {
        ...invocation.metadata,
        endTime: new Date().toISOString()
      };
      this.invocations.set(invocationId, invocation);
      return true;
    }

    return false;
  }

  clearInvocation(invocationId: string): boolean {
    return this.invocations.delete(invocationId);
  }

  getActiveInvocations(): IACPAgentInvocation[] {
    return Array.from(this.invocations.values()).filter(
      inv => inv.status === 'pending' || inv.status === 'running'
    );
  }

  // Hjælpemetoder
  private isActive(status: InvocationStatus): boolean {
    return status === 'pending' || status === 'running';
  }
} 