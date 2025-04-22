import { BaseAgent } from './BaseAgent';
import { AgentResult, ExecutionContext } from '../interfaces/Agent';

type DataProcessingConfig = {
  id?: string;
  name: string;
  workspaceId: string;
  operations: Array<{
    type: 'filter' | 'map' | 'reduce' | 'sort' | 'transform';
    config: Record<string, any>;
  }>;
};

export class DataProcessingAgent extends BaseAgent {
  private operations: Array<{
    type: string;
    config: Record<string, any>;
  }>;

  constructor(config: DataProcessingConfig) {
    super({
      id: config.id,
      name: config.name,
      type: 'data-processing',
      workspaceId: config.workspaceId,
      capabilities: ['data-transformation', 'data-filtering', 'data-aggregation']
    });
    
    this.operations = config.operations || [];
  }

  async execute(input: any, context: ExecutionContext): Promise<AgentResult> {
    await this.logActivity('execute', { input, context });

    try {
      // Validér input
      if (!Array.isArray(input) && typeof input !== 'object') {
        throw new Error('Input skal være et array eller et objekt');
      }

      let data = Array.isArray(input) ? [...input] : { ...input };

      // Udfør hver operation i sekvens
      for (const operation of this.operations) {
        data = await this.processOperation(operation, data);
        await this.logActivity('operation-complete', {
          operationType: operation.type,
          resultSize: Array.isArray(data) ? data.length : 1
        });
      }

      return {
        success: true,
        output: data,
        metadata: {
          operationsApplied: this.operations.map(op => op.type),
          finalDataType: Array.isArray(data) ? 'array' : 'object'
        }
      };

    } catch (error) {
      await this.logActivity('error', { error: error.message }, false);
      
      return {
        success: false,
        error: error.message,
        metadata: {
          failedOperation: this.operations.find(op => !op.completed)?.type
        }
      };
    }
  }

  private async processOperation(
    operation: { type: string; config: Record<string, any> },
    data: any
  ): Promise<any> {
    switch (operation.type) {
      case 'filter':
        return this.filterData(data, operation.config);
      case 'map':
        return this.mapData(data, operation.config);
      case 'reduce':
        return this.reduceData(data, operation.config);
      case 'sort':
        return this.sortData(data, operation.config);
      case 'transform':
        return this.transformData(data, operation.config);
      default:
        throw new Error(`Ikke-understøttet operation type: ${operation.type}`);
    }
  }

  private filterData(data: any[], config: Record<string, any>): any[] {
    const { condition } = config;
    return data.filter(item => this.evaluateCondition(item, condition));
  }

  private mapData(data: any[], config: Record<string, any>): any[] {
    const { mapping } = config;
    return data.map(item => {
      const result: Record<string, any> = {};
      for (const [key, value] of Object.entries(mapping)) {
        result[key] = this.evaluateExpression(item, value as string);
      }
      return result;
    });
  }

  private reduceData(data: any[], config: Record<string, any>): any {
    const { accumulator, operation } = config;
    return data.reduce((acc, item) => {
      return this.evaluateReduceOperation(acc, item, operation);
    }, accumulator);
  }

  private sortData(data: any[], config: Record<string, any>): any[] {
    const { key, direction = 'asc' } = config;
    return [...data].sort((a, b) => {
      const valueA = this.getNestedValue(a, key);
      const valueB = this.getNestedValue(b, key);
      return direction === 'asc' 
        ? this.compare(valueA, valueB)
        : this.compare(valueB, valueA);
    });
  }

  private transformData(data: any, config: Record<string, any>): any {
    const { transformations } = config;
    const result = { ...data };
    
    for (const [key, transform] of Object.entries(transformations)) {
      result[key] = this.applyTransformation(data, transform as string);
    }
    
    return result;
  }

  private evaluateCondition(item: any, condition: Record<string, any>): boolean {
    // Implementér betingelsesevaluering her
    // F.eks.: { field: 'age', operator: '>', value: 18 }
    const { field, operator, value } = condition;
    const itemValue = this.getNestedValue(item, field);
    
    switch (operator) {
      case '>': return itemValue > value;
      case '<': return itemValue < value;
      case '>=': return itemValue >= value;
      case '<=': return itemValue <= value;
      case '==': return itemValue === value;
      case '!=': return itemValue !== value;
      default: return false;
    }
  }

  private evaluateExpression(item: any, expression: string): any {
    // Simpel udtryksfortolker - kan udvides efter behov
    if (expression.startsWith('$.')) {
      return this.getNestedValue(item, expression.slice(2));
    }
    return expression;
  }

  private evaluateReduceOperation(acc: any, item: any, operation: string): any {
    switch (operation) {
      case 'sum': return acc + item;
      case 'multiply': return acc * item;
      case 'concat': return `${acc}${item}`;
      case 'min': return Math.min(acc, item);
      case 'max': return Math.max(acc, item);
      default: return acc;
    }
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, part) => current?.[part], obj);
  }

  private compare(a: any, b: any): number {
    if (a === b) return 0;
    if (a === null || a === undefined) return -1;
    if (b === null || b === undefined) return 1;
    return a < b ? -1 : 1;
  }

  private applyTransformation(data: any, transform: string): any {
    // Implementér forskellige transformationer her
    if (transform.startsWith('uppercase:')) {
      const field = transform.split(':')[1];
      const value = this.getNestedValue(data, field);
      return typeof value === 'string' ? value.toUpperCase() : value;
    }
    // Tilføj flere transformationer efter behov
    return null;
  }
} 