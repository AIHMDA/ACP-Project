import { IACPNode } from '../orchestration/types';

export interface IWorkflowData {
  id: string;
  name: string;
  nodes: Record<string, IACPNode>;
  connections: IWorkflowConnections;
  variables?: Record<string, unknown>;
  metadata?: IWorkflowMetadata;
}

export interface IWorkflowConnections {
  [sourceNodeId: string]: {
    [outputName: string]: Array<{
      nodeId: string;
      inputName: string;
    }>;
  };
}

export interface IWorkflowMetadata {
  description?: string;
  tags?: string[];
  created: Date;
  modified: Date;
  version: string;
  author?: string;
}

export interface IExecutionContext {
  startTime?: Date;
  workspace?: {
    id: string;
    settings: any;
  };
  user?: string;
  variables?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface WorkflowResult {
  id: string;
  status: 'completed' | 'failed';
  data: Record<string, unknown>;
  startTime: Date;
  endTime: Date;
  error: string | null;
} 