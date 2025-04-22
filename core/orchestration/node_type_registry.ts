import { INodeTypeRegistry, INodeTypeDescription } from './types';

export class NodeTypeRegistry implements INodeTypeRegistry {
  private nodeTypes: Map<string, INodeTypeDescription> = new Map();
  private nodeTypesByGroup: Map<string, INodeTypeDescription[]> = new Map();

  register(nodeType: INodeTypeDescription): void {
    this.validateNodeType(nodeType);
    
    // Gem node typen
    this.nodeTypes.set(nodeType.type, nodeType);
    
    // Organiser efter gruppe
    if (!this.nodeTypesByGroup.has(nodeType.group)) {
      this.nodeTypesByGroup.set(nodeType.group, []);
    }
    this.nodeTypesByGroup.get(nodeType.group)?.push(nodeType);
  }

  get(type: string): INodeTypeDescription | undefined {
    return this.nodeTypes.get(type);
  }

  getAll(): INodeTypeDescription[] {
    return Array.from(this.nodeTypes.values());
  }

  getByGroup(group: string): INodeTypeDescription[] {
    return this.nodeTypesByGroup.get(group) || [];
  }

  getGroups(): string[] {
    return Array.from(this.nodeTypesByGroup.keys());
  }

  search(query: string): INodeTypeDescription[] {
    const searchTerm = query.toLowerCase();
    return this.getAll().filter(nodeType => 
      nodeType.name.toLowerCase().includes(searchTerm) ||
      nodeType.description?.toLowerCase().includes(searchTerm) ||
      nodeType.type.toLowerCase().includes(searchTerm)
    );
  }

  getVersion(type: string): number | undefined {
    return this.get(type)?.version;
  }

  isVersionCompatible(type: string, version: number): boolean {
    const nodeType = this.get(type);
    if (!nodeType) return false;
    return nodeType.version >= version;
  }

  clear(): void {
    this.nodeTypes.clear();
    this.nodeTypesByGroup.clear();
  }

  private validateNodeType(nodeType: INodeTypeDescription): void {
    if (!nodeType.type) {
      throw new Error('Node type must have a type');
    }
    if (!nodeType.name) {
      throw new Error('Node type must have a name');
    }
    if (!nodeType.group) {
      throw new Error('Node type must have a group');
    }
    if (typeof nodeType.version !== 'number') {
      throw new Error('Node type must have a version number');
    }

    // Valider properties hvis de findes
    if (nodeType.properties) {
      nodeType.properties.forEach(prop => {
        if (!prop.name || !prop.type || !prop.label) {
          throw new Error('Node property must have name, type and label');
        }
      });
    }

    // Valider inputs hvis de findes
    if (nodeType.inputs) {
      nodeType.inputs.forEach(input => {
        if (!input.name || !input.type || !input.label) {
          throw new Error('Node input must have name, type and label');
        }
      });
    }

    // Valider outputs hvis de findes
    if (nodeType.outputs) {
      nodeType.outputs.forEach(output => {
        if (!output.name || !output.type || !output.label) {
          throw new Error('Node output must have name, type and label');
        }
      });
    }
  }
} 