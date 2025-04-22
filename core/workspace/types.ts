import { IACPAgent } from '../agents/types';
import { WorkflowDefinition } from '../orchestration/types';

export interface IWorkspaceSettings {
  openAiPrompt: string;
  agentProvider: string | null;
  agentModel: string | null;
  similarityThreshold: number;
  vectorSearchMode: 'default' | 'rerank';
}

export interface IWorkspaceUser {
  id: string;
  role: string;
}

export interface IWorkspaceContext {
  id: string;
  settings: IWorkspaceSettings;
  vectors: any[];
  user?: string;
  input?: unknown;
}

export interface IAgentInvocationResult {
  invocation: {
    id: string;
    workspace: string;
    agent: string;
    prompt: string;
    timestamp: string;
    user?: string;
  };
  result: unknown;
}

export interface IWorkflowResult {
  id: string;
  workflowId: string;
  status: 'success' | 'error';
  output?: unknown;
  error?: string;
  startTime: string;
  endTime: string;
  duration: number;
}

export interface IWorkspace {
  id: string;
  name: string;
  slug: string;
  vectors: any[];
  agents: IACPAgent[];
  workflows: WorkflowDefinition[];
  users: IWorkspaceUser[];
  settings: IWorkspaceSettings;
  
  addAgent(agent: IACPAgent): void;
  addWorkflow(workflow: WorkflowDefinition): void;
  addUser(userId: string, role?: string): void;
  invokeAgent(agentId: string, prompt: string, user?: string): Promise<IAgentInvocationResult>;
  executeWorkflow(workflowId: string, input?: unknown, user?: string): Promise<IWorkflowResult>;
} 