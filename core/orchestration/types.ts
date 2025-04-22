import { ExecutionContext } from '../agents/types';

// Node interfaces
export interface IACPNode {
  id: string;
  name: string;
  type: string;
  typeVersion: number;
  parameters: INodeParameters;
  position: [number, number];
  disabled?: boolean;
  description?: string;
  
  execute(inputData: unknown, context: ExecutionContext): Promise<unknown>;
  validate?(): ValidationResult;
}

export interface INodeParameters {
  [key: string]: unknown;
}

export interface ValidationResult {
  valid: boolean;
  errors?: string[];
  warnings?: string[];
}

// Node type system
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
  name: string;
  type: string;
  label: string;
  description?: string;
  default?: any;
  required?: boolean;
  options?: { label: string; value: any }[];
}

export interface INodeInput {
  name: string;
  type: string;
  label: string;
  description?: string;
  required?: boolean;
}

export interface INodeOutput {
  name: string;
  type: string;
  label: string;
  description?: string;
}

export interface INodeProperties {
  displayName: string;
  name: string;
  type: NodePropertyType;
  default: unknown;
  description?: string;
  required?: boolean;
  options?: INodePropertyOptions[];
  typeOptions?: INodePropertyTypeOptions;
  displayOptions?: IDisplayOptions;
}

export type NodePropertyType = 
  | 'string'
  | 'number'
  | 'boolean'
  | 'options'
  | 'collection'
  | 'dateTime'
  | 'json'
  | 'expression';

export interface INodePropertyOptions {
  name: string;
  value: string | number | boolean;
  description?: string;
  action?: string;
}

export interface INodePropertyTypeOptions {
  multipleValues?: boolean;
  multipleValueButtonText?: string;
  maxValue?: number;
  minValue?: number;
  numberPrecision?: number;
  password?: boolean;
  rows?: number;
  sortable?: boolean;
  expirable?: boolean;
}

export interface IDisplayOptions {
  show?: { [key: string]: unknown[] };
  hide?: { [key: string]: unknown[] };
}

// Workflow definitioner
export interface WorkflowDefinition {
  id: string;
  name: string;
  description: string;
  version: string;
  nodes: Record<string, IACPNode>;
  connections: WorkflowConnections;
  variables?: WorkflowVariable[];
  metadata?: WorkflowMetadata;
  execute(context: ExecutionContext): Promise<unknown>;
}

export interface WorkflowMetadata {
  created: Date;
  modified: Date;
  owner: string;
  tags?: string[];
  category?: string;
  icon?: string;
  color?: string;
}

export interface WorkflowConnections {
  [sourceNodeId: string]: {
    [outputType: string]: {
      [outputIndex: string]: Array<{
        node: string;
        input?: string;
        metadata?: ConnectionMetadata;
      }>;
    };
  };
}

export interface ConnectionMetadata {
  label?: string;
  color?: string;
  condition?: string;
  priority?: number;
}

export interface WorkflowVariable {
  name: string;
  type: NodePropertyType;
  default?: unknown;
  description?: string;
  scope?: 'workflow' | 'global';
  secret?: boolean;
}

// Eksekvering
export interface WorkflowExecution {
  id: string;
  workflowId: string;
  status: ExecutionStatus;
  context: ExecutionContext;
  variables: Record<string, unknown>;
  currentNode?: string;
  nodeResults: Record<string, NodeExecutionResult>;
  startTime: Date;
  endTime?: Date;
  error?: {
    message: string;
    nodeId: string;
    details?: Record<string, unknown>;
  };
  metadata?: ExecutionMetadata;
}

export interface ExecutionMetadata {
  duration?: number;
  resourceUsage?: {
    cpu?: number;
    memory?: number;
    network?: {
      requests: number;
      bandwidth: number;
    };
  };
  cost?: {
    cpu?: number;
    memory?: number;
    api?: number;
    total: number;
  };
}

export type ExecutionStatus = 
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'paused';

export interface NodeExecutionResult {
  status: NodeExecutionStatus;
  startTime: Date;
  endTime?: Date;
  attempts: number;
  inputData?: unknown;
  outputData?: unknown;
  error?: {
    message: string;
    details?: Record<string, unknown>;
  };
  metadata?: {
    duration?: number;
    retries?: number;
    resourceUsage?: {
      cpu?: number;
      memory?: number;
    };
  };
}

export type NodeExecutionStatus = 
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'skipped'
  | 'cancelled';

// Node type registrering
export interface INodeTypeRegistry {
  register(nodeType: INodeTypeDescription): void;
  get(type: string): INodeTypeDescription | undefined;
  getAll(): INodeTypeDescription[];
  getByGroup(group: string): INodeTypeDescription[];
  getGroups(): string[];
  search(query: string): INodeTypeDescription[];
  getVersion(type: string): number | undefined;
  isVersionCompatible(type: string, version: number): boolean;
  clear(): void;
} 