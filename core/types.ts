export interface INodeTypeDescription {
  type: string;
  name: string;
  description?: string;
  version: number;
  group: string;
  icon?: string;
  color?: string;
  properties?: INodeProperty[];
  inputs?: INodeInput[];
  outputs?: INodeOutput[];
  hooks?: {
    [key: string]: (...args: any[]) => Promise<any>;
  };
}

export interface INodeProperty {
  displayName: string;
  name: string;
  type: 'string' | 'number' | 'boolean' | 'options' | 'collection';
  default?: any;
  description?: string;
  required?: boolean;
  options?: Array<{
    name: string;
    value: string | number | boolean;
    description?: string;
  }>;
  displayOptions?: {
    show?: { [key: string]: any[] };
    hide?: { [key: string]: any[] };
  };
}

export interface INodeInput {
  name: string;
  type: string;
  required?: boolean;
  description?: string;
  maxConnections?: number;
}

export interface INodeOutput {
  name: string;
  type: string;
  description?: string;
  maxConnections?: number;
}

export interface IExecutionContext {
  workspaceId: string;
  userId?: string;
  startTime?: Date;
  variables?: { [key: string]: any };
  metadata?: { [key: string]: any };
}

export interface IWorkflowData {
  id: string;
  name: string;
  nodes: {
    [nodeId: string]: INode;
  };
  connections: {
    [sourceNodeId: string]: {
      [type: string]: {
        [outputIndex: string]: Array<{
          node: string;
          input: string;
        }>;
      };
    };
  };
}

export interface INode {
  id: string;
  name: string;
  type: string;
  parameters: { [key: string]: any };
  position: [number, number];
  disabled?: boolean;
}

export interface WorkflowResult {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  data: { [key: string]: any };
  startTime: Date;
  endTime: Date;
  error?: string;
}

export interface ValidationResult {
  valid: boolean;
  issues?: string[];
}

export interface AgentExecutionResult {
  success: boolean;
  output?: any;
  error?: string;
  metadata?: { [key: string]: any };
} 