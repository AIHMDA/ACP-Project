export interface IAgent {
  id: string;
  name: string;
  type: string;
  workspaceId: string;
  capabilities: string[];
  execute(input: any, context: ExecutionContext): Promise<AgentResult>;
}

export type AgentResult = {
  success: boolean;
  output?: any;
  error?: string;
  metadata?: Record<string, any>;
};

export type ExecutionContext = {
  workspaceId: string;
  userId?: string;
  executionId?: string;
  sessionId?: string;
  previousResults?: AgentResult[];
}; 