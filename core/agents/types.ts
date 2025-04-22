export interface AgentCapability {
  name: string;
  description: string;
  parameters: {
    [key: string]: {
      type: string;
      description: string;
      required: boolean;
    };
  };
  handler: string;
}

export interface AgentMetadata {
  name: string;
  description: string;
  version: string;
  author: string;
  type: string;
  supportedModalities?: string[];
  configuration?: Record<string, unknown>;
}

export interface ExecutionResult {
  success: boolean;
  data?: unknown;
  error?: {
    message: string;
    code: string;
    details?: Record<string, unknown>;
  };
  metadata: {
    startTime: Date;
    endTime: Date;
    duration: number;
    resourceUsage?: {
      cpu?: number;
      memory?: number;
    };
  };
}

export interface ExecutionContext {
  workspace: {
    id: string;
    settings: any;
    vectors: any[];
  };
  user?: string;
  input?: unknown;
}

export interface IACPAgent {
  id: string;
  name: string;
  description?: string;
  capabilities: string[];
  execute(prompt: string, context: any): Promise<unknown>;
} 