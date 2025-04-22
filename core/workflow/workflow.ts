import { NodeTypeRegistry } from '../orchestration/node_type_registry';
import { IACPNode } from '../orchestration/types';
import { IWorkflowData, IWorkflowConnections } from './types';

export class ACPWorkflow {
  id: string;
  name: string;
  nodes: Record<string, IACPNode>;
  connections: IWorkflowConnections;
  nodeTypes: NodeTypeRegistry;

  constructor(params: {
    id: string;
    name: string;
    nodes: Record<string, IACPNode>;
    connections: IWorkflowConnections;
    nodeTypes: NodeTypeRegistry;
  }) {
    this.id = params.id;
    this.name = params.name;
    this.nodes = params.nodes;
    this.connections = params.connections;
    this.nodeTypes = params.nodeTypes;
  }

  getStartNode(): IACPNode | null {
    // Find noder uden indgående forbindelser
    const nodesWithoutIncoming = Object.entries(this.nodes)
      .filter(([nodeId]) => !this.hasIncomingConnections(nodeId))
      .map(([_, node]) => node);

    if (nodesWithoutIncoming.length === 0) {
      return null;
    }

    // Hvis der er flere start noder, vælg den første
    // TODO: Håndter multiple start noder bedre
    return nodesWithoutIncoming[0];
  }

  getChildNodes(nodeId: string): string[] {
    const childNodes: string[] = [];
    const nodeConnections = this.connections[nodeId];

    if (!nodeConnections) {
      return childNodes;
    }

    // Gennemgå alle outputs og deres forbindelser
    Object.values(nodeConnections).forEach(connections => {
      connections.forEach(connection => {
        childNodes.push(connection.nodeId);
      });
    });

    return childNodes;
  }

  hasIncomingConnections(nodeId: string): boolean {
    // Tjek alle noder for forbindelser til den givne node
    return Object.values(this.connections).some(outputs =>
      Object.values(outputs).some(connections =>
        connections.some(connection => connection.nodeId === nodeId)
      )
    );
  }

  getNodeInputs(nodeId: string): Array<{ nodeId: string; outputName: string; inputName: string }> {
    const inputs: Array<{ nodeId: string; outputName: string; inputName: string }> = [];

    // Gennemgå alle noder og deres forbindelser
    Object.entries(this.connections).forEach(([sourceId, outputs]) => {
      Object.entries(outputs).forEach(([outputName, connections]) => {
        connections.forEach(connection => {
          if (connection.nodeId === nodeId) {
            inputs.push({
              nodeId: sourceId,
              outputName,
              inputName: connection.inputName
            });
          }
        });
      });
    });

    return inputs;
  }

  validate(): string[] {
    const errors: string[] = [];

    // Tjek for manglende noder
    Object.entries(this.connections).forEach(([sourceId, outputs]) => {
      if (!this.nodes[sourceId]) {
        errors.push(`Kilde node "${sourceId}" findes ikke`);
      }

      Object.values(outputs).forEach(connections => {
        connections.forEach(connection => {
          if (!this.nodes[connection.nodeId]) {
            errors.push(`Destination node "${connection.nodeId}" findes ikke`);
          }
        });
      });
    });

    // Tjek for ugyldige node typer
    Object.entries(this.nodes).forEach(([nodeId, node]) => {
      const nodeType = this.nodeTypes.get(node.type);
      if (!nodeType) {
        errors.push(`Node type "${node.type}" for node "${nodeId}" blev ikke fundet`);
      }
    });

    return errors;
  }

  toJSON(): IWorkflowData {
    return {
      id: this.id,
      name: this.name,
      nodes: this.nodes,
      connections: this.connections
    };
  }
} 