import { INode, INodeTypeDescription } from '../types';

export interface NodeType {
  description: INodeTypeDescription;
  execute(params: {
    node: INode;
    inputData: any;
    context: any;
  }): Promise<any>;
  
  validateParameters?(parameters: any): boolean;
}

export interface NodeTypeGroup {
  name: string;
  displayName: string;
  description?: string;
}

export class NodeTypeRegistry {
  private nodeTypes: Map<string, NodeType> = new Map();
  private groups: Map<string, NodeTypeGroup> = new Map();
  
  registerNodeType(nodeType: NodeType): void {
    const { type } = nodeType.description;
    
    // Validér node type
    this.validateNodeType(nodeType);
    
    if (this.nodeTypes.has(type)) {
      throw new Error(`Node type '${type}' er allerede registreret`);
    }
    
    // Registrér gruppe hvis den ikke findes
    const group = nodeType.description.group;
    if (!this.groups.has(group)) {
      this.groups.set(group, {
        name: group,
        displayName: this.capitalizeFirstLetter(group)
      });
    }
    
    this.nodeTypes.set(type, nodeType);
  }
  
  private validateNodeType(nodeType: NodeType): void {
    const { description } = nodeType;
    
    // Tjek påkrævede felter
    if (!description.type) throw new Error('Node type mangler type');
    if (!description.name) throw new Error('Node type mangler navn');
    if (!description.version) throw new Error('Node type mangler version');
    if (!description.group) throw new Error('Node type mangler gruppe');
    
    // Validér inputs og outputs hvis de findes
    if (description.inputs) {
      for (const input of description.inputs) {
        if (!input.name) throw new Error('Input mangler navn');
        if (!input.type) throw new Error('Input mangler type');
      }
    }
    
    if (description.outputs) {
      for (const output of description.outputs) {
        if (!output.name) throw new Error('Output mangler navn');
        if (!output.type) throw new Error('Output mangler type');
      }
    }
    
    // Validér properties hvis de findes
    if (description.properties) {
      for (const prop of description.properties) {
        if (!prop.name) throw new Error('Property mangler navn');
        if (!prop.type) throw new Error('Property mangler type');
        if (!prop.displayName) throw new Error('Property mangler display navn');
        
        // Tjek options hvis property er af type 'options'
        if (prop.type === 'options' && (!prop.options || prop.options.length === 0)) {
          throw new Error(`Property '${prop.name}' af type 'options' mangler valgmuligheder`);
        }
      }
    }
  }
  
  getByName(name: string): NodeType | null {
    return this.nodeTypes.get(name) || null;
  }
  
  getAllNodeTypes(): NodeType[] {
    return Array.from(this.nodeTypes.values());
  }
  
  getNodeTypesByGroup(group: string): NodeType[] {
    return this.getAllNodeTypes().filter(
      nodeType => nodeType.description.group === group
    );
  }
  
  getGroups(): NodeTypeGroup[] {
    return Array.from(this.groups.values());
  }
  
  getNodeTypeDescriptions(): INodeTypeDescription[] {
    return this.getAllNodeTypes().map(nodeType => nodeType.description);
  }
  
  hasNodeType(type: string): boolean {
    return this.nodeTypes.has(type);
  }
  
  clear(): void {
    this.nodeTypes.clear();
    this.groups.clear();
  }
  
  private capitalizeFirstLetter(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
} 