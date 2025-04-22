import { IACPAgent } from './types';
import { ACPWorkspace } from '../workspace/workspace';

export interface IACPAgentInvocation {
  id: string;
  agentId: string;
  workspaceId: string;
  prompt: string;
  timestamp: string;
  userId?: string;
  status: InvocationStatus;
  result?: unknown;
  error?: string;
  metadata?: InvocationMetadata;
}

export type InvocationStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface InvocationMetadata {
  startTime?: string;
  endTime?: string;
  duration?: number;
  retries?: number;
  resourceUsage?: {
    cpu?: number;
    memory?: number;
  };
}

export interface IACPAgentManager {
  invokeAgent(
    agent: IACPAgent,
    prompt: string,
    workspace: ACPWorkspace,
    user?: string
  ): Promise<string>;
  
  getInvocationStatus(invocationId: string): IACPAgentInvocation | null;
  
  waitForCompletion(
    invocationId: string,
    timeout?: number
  ): Promise<IACPAgentInvocation>;
  
  cancelInvocation(invocationId: string): boolean;
  
  clearInvocation(invocationId: string): boolean;
  
  getActiveInvocations(): IACPAgentInvocation[];
} 