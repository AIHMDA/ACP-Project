import { 
  IWorkflowData, 
  INode, 
  IExecutionContext, 
  WorkflowResult,
  INodeInput,
  INodeOutput
} from '../types';
import { NodeType, NodeTypeRegistry } from './registry';

export interface IConnection {
  sourceNode: string;
  sourceOutput: string;
  targetNode: string;
  targetInput: string;
}

export class ConnectionManager {
  validateConnection(
    connection: IConnection,
    sourceNode: INode,
    targetNode: INode,
    nodeTypes: NodeTypeRegistry
  ): boolean {
    const sourceType = nodeTypes.getByName(sourceNode.type);
    const targetType = nodeTypes.getByName(targetNode.type);
    
    if (!sourceType || !targetType) return false;
    
    // Find output og input definitioner
    const output = sourceType.description.outputs?.find(
      o => o.name === connection.sourceOutput
    );
    const input = targetType.description.inputs?.find(
      i => i.name === connection.targetInput
    );
    
    if (!output || !input) return false;
    
    // Tjek type kompatibilitet
    if (output.type !== input.type) return false;
    
    // Tjek max connections
    if (input.maxConnections !== undefined) {
      const currentConnections = this.countInputConnections(
        connection.targetNode,
        connection.targetInput
      );
      if (currentConnections >= input.maxConnections) return false;
    }
    
    return true;
  }
  
  private countInputConnections(nodeId: string, inputName: string): number {
    return 0; // Placeholder implementation
  }
}

export class WorkflowEngine {
  private connectionManager: ConnectionManager;
  
  constructor(private nodeTypes: NodeTypeRegistry) {
    this.connectionManager = new ConnectionManager();
  }
  
  async executeWorkflow(
    workflowData: IWorkflowData, 
    context: IExecutionContext = {} as IExecutionContext
  ): Promise<WorkflowResult> {
    try {
      // Validér workflow
      this.validateWorkflow(workflowData);
      
      // Find startnode
      const startNode = this.findStartNode(workflowData);
      if (!startNode) {
        throw new Error('Ingen startnode fundet i workflow');
      }
      
      const startTime = new Date();
      context.startTime = startTime;
      
      // Eksekver workflow fra startnode
      const result = await this.executeNode(
        workflowData,
        startNode.id,
        null,
        context
      );
      
      return {
        id: workflowData.id,
        status: 'completed',
        data: result,
        startTime,
        endTime: new Date(),
        error: undefined
      };
    } catch (error) {
      return {
        id: workflowData.id,
        status: 'failed',
        data: {},
        startTime: context.startTime || new Date(),
        endTime: new Date(),
        error: error instanceof Error ? error.message : 'Ukendt fejl'
      };
    }
  }
  
  private async executeNode(
    workflow: IWorkflowData,
    nodeId: string,
    inputData: any,
    context: IExecutionContext
  ): Promise<any> {
    const node = workflow.nodes[nodeId];
    if (!node) {
      throw new Error(`Node "${nodeId}" ikke fundet i workflow`);
    }
    
    // Log eksekvering start
    console.log(`Eksekverer node: ${node.name} (${node.type})`);
    
    // Hent node type
    const nodeType = this.nodeTypes.getByName(node.type);
    if (!nodeType) {
      throw new Error(`Node type "${node.type}" ikke fundet`);
    }
    
    // Eksekver node
    const nodeOutput = await nodeType.execute({
      node,
      inputData,
      context: {
        ...context,
        workflow,
        nodeId
      }
    });
    
    // Find og eksekver child nodes
    const childNodeIds = this.getChildNodes(workflow, nodeId);
    const results: { [nodeId: string]: any } = {
      [nodeId]: nodeOutput
    };
    
    for (const childId of childNodeIds) {
      const childResults = await this.executeNode(
        workflow,
        childId,
        nodeOutput,
        context
      );
      
      Object.assign(results, childResults);
    }
    
    return results;
  }
  
  private validateWorkflow(workflow: IWorkflowData): void {
    // Tjek for cykler i workflow grafen
    this.detectCycles(workflow);
    
    // Tjek om alle node typer findes og valider forbindelser
    for (const nodeId in workflow.nodes) {
      const node = workflow.nodes[nodeId];
      const nodeType = this.nodeTypes.getByName(node.type);
      if (!nodeType) {
        throw new Error(
          `Node type "${node.type}" for node "${node.name}" ikke fundet`
        );
      }
      
      // Valider alle udgående forbindelser
      const connections = workflow.connections[nodeId];
      if (connections) {
        for (const type in connections) {
          for (const outputIndex in connections[type]) {
            const targets = connections[type][outputIndex];
            if (targets) {
              for (const target of targets) {
                const targetNode = workflow.nodes[target.node];
                if (!targetNode) {
                  throw new Error(
                    `Target node "${target.node}" ikke fundet for forbindelse fra "${nodeId}"`
                  );
                }
                
                const isValid = this.connectionManager.validateConnection(
                  {
                    sourceNode: nodeId,
                    sourceOutput: outputIndex,
                    targetNode: target.node,
                    targetInput: target.input
                  },
                  node,
                  targetNode,
                  this.nodeTypes
                );
                
                if (!isValid) {
                  throw new Error(
                    `Ugyldig forbindelse fra "${nodeId}" til "${target.node}"`
                  );
                }
              }
            }
          }
        }
      }
    }
  }
  
  private findStartNode(workflow: IWorkflowData): INode | null {
    // Find alle nodes uden indgående forbindelser
    const nodesWithoutIncoming = Object.values(workflow.nodes).filter(
      node => !this.hasIncomingConnections(workflow, node.id)
    );
    
    // Prioritér trigger nodes
    const triggerNodes = nodesWithoutIncoming.filter(
      node => node.type === 'trigger' || node.type.includes('Trigger')
    );
    
    if (triggerNodes.length > 0) return triggerNodes[0];
    if (nodesWithoutIncoming.length > 0) return nodesWithoutIncoming[0];
    
    return null;
  }
  
  private getChildNodes(workflow: IWorkflowData, nodeId: string): string[] {
    const childNodes: string[] = [];
    const nodeConnections = workflow.connections[nodeId];
    
    if (!nodeConnections) return [];
    
    for (const type in nodeConnections) {
      for (const outputIndex in nodeConnections[type]) {
        const connections = nodeConnections[type][outputIndex];
        if (connections) {
          connections.forEach(connection => {
            childNodes.push(connection.node);
          });
        }
      }
    }
    
    return childNodes;
  }
  
  private hasIncomingConnections(
    workflow: IWorkflowData, 
    nodeId: string
  ): boolean {
    for (const sourceId in workflow.connections) {
      const sourceConnections = workflow.connections[sourceId];
      for (const type in sourceConnections) {
        for (const outputIndex in sourceConnections[type]) {
          const connections = sourceConnections[type][outputIndex];
          if (connections && connections.some(conn => conn.node === nodeId)) {
            return true;
          }
        }
      }
    }
    return false;
  }
  
  private detectCycles(workflow: IWorkflowData): void {
    const visited = new Set<string>();
    const path = new Set<string>();
    
    const dfs = (nodeId: string) => {
      if (path.has(nodeId)) {
        throw new Error(`Cyklus detekteret i workflow ved node "${nodeId}"`);
      }
      
      if (visited.has(nodeId)) return;
      
      visited.add(nodeId);
      path.add(nodeId);
      
      const childNodeIds = this.getChildNodes(workflow, nodeId);
      for (const childId of childNodeIds) {
        dfs(childId);
      }
      
      path.delete(nodeId);
    };
    
    // Start DFS fra hver node uden indgående forbindelser
    for (const nodeId in workflow.nodes) {
      if (!this.hasIncomingConnections(workflow, nodeId)) {
        dfs(nodeId);
      }
    }
  }
}

interface NodeTypeRegistry {
  getByName(name: string): NodeType | null;
}

interface NodeType {
  execute(params: {
    node: INode;
    inputData: any;
    context: any;
  }): Promise<any>;
} 