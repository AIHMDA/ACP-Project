import { Workspace } from '../workspace/workspace';
import { NodeTypeRegistry } from '../orchestration/node_type_registry';
import { IWorkflowData, IExecutionContext, WorkflowResult } from './types';
import { ACPWorkflow } from './workflow';

export interface WorkflowStep {
  id: string;
  type: 'AGENT_ACTION' | 'CONDITION' | 'LOOP' | 'WAIT';
  agentId?: string;
  capabilityName?: string;
  parameters?: Record<string, unknown>;
  next?: {
    default?: string;
    conditions?: Array<{
      condition: string;
      stepId: string;
    }>;
  };
  errorHandler?: string;
}

export interface WorkflowDefinition {
  id: string;
  name: string;
  description: string;
  version: string;
  steps: Record<string, WorkflowStep>;
  initialStep: string;
}

export class ACPWorkflowEngine {
  constructor(private nodeTypes: NodeTypeRegistry) {}
  
  async executeWorkflow(workflowData: IWorkflowData, context: IExecutionContext = {}): Promise<WorkflowResult> {
    // Opret workflow instance
    const workflow = new ACPWorkflow({
      id: workflowData.id,
      name: workflowData.name,
      nodes: workflowData.nodes,
      connections: workflowData.connections,
      nodeTypes: this.nodeTypes
    });
    
    try {
      // Valider workflow integritet
      this.validateWorkflow(workflow);
      
      // Find startnode
      const startNode = workflow.getStartNode();
      if (!startNode) {
        throw new Error("Ingen startnode fundet i workflow");
      }
      
      // Eksekver workflow fra startnode
      const result = await this.executeNode(workflow, startNode.name, null, context);
      
      return {
        id: workflowData.id,
        status: 'completed',
        data: result,
        startTime: context.startTime || new Date(),
        endTime: new Date(),
        error: null
      };
    } catch (error) {
      return {
        id: workflowData.id,
        status: 'failed',
        data: {},
        startTime: context.startTime || new Date(),
        endTime: new Date(),
        error: error.message
      };
    }
  }
  
  private async executeNode(
    workflow: ACPWorkflow, 
    nodeName: string, 
    inputData: any, 
    context: IExecutionContext
  ): Promise<any> {
    const node = workflow.nodes[nodeName];
    if (!node) {
      throw new Error(`Node "${nodeName}" blev ikke fundet i workflow`);
    }
    
    // Log eksekvering start
    console.log(`Eksekverer node: ${nodeName}`);
    
    // Hent node type
    const nodeType = this.nodeTypes.get(node.type);
    if (!nodeType) {
      throw new Error(`Node type "${node.type}" blev ikke fundet`);
    }
    
    // Eksekver node med dens implementering
    const nodeOutput = await node.execute(inputData, {
      ...context,
      workflow,
      nodeName
    });
    
    // Find child nodes og eksekver dem i korrekt rækkefølge
    const childNodeNames = workflow.getChildNodes(nodeName);
    const results: { [nodeName: string]: any } = {
      [nodeName]: nodeOutput
    };
    
    for (const childNodeName of childNodeNames) {
      const childResults = await this.executeNode(
        workflow, 
        childNodeName, 
        nodeOutput, 
        context
      );
      
      Object.assign(results, childResults);
    }
    
    return results;
  }
  
  private validateWorkflow(workflow: ACPWorkflow): void {
    // Tjek for cykler i workflow grafen
    this.detectCycles(workflow);
    
    // Tjek om alle node typer findes
    for (const nodeName in workflow.nodes) {
      const node = workflow.nodes[nodeName];
      const nodeType = this.nodeTypes.get(node.type);
      if (!nodeType) {
        throw new Error(`Node type "${node.type}" for node "${nodeName}" blev ikke fundet`);
      }
    }
  }
  
  private detectCycles(workflow: ACPWorkflow): void {
    const visited = new Set<string>();
    const path = new Set<string>();
    
    const dfs = (nodeName: string) => {
      if (path.has(nodeName)) {
        throw new Error(`Cyklus detekteret i workflow ved node "${nodeName}"`);
      }
      
      if (visited.has(nodeName)) return;
      
      visited.add(nodeName);
      path.add(nodeName);
      
      const childNodeNames = workflow.getChildNodes(nodeName);
      for (const childNodeName of childNodeNames) {
        dfs(childNodeName);
      }
      
      path.delete(nodeName);
    };
    
    // Start DFS fra hver node der ikke har indgående forbindelser
    for (const nodeName in workflow.nodes) {
      if (!workflow.hasIncomingConnections(nodeName)) {
        dfs(nodeName);
      }
    }
  }
} 