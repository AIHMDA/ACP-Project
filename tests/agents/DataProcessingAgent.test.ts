import { DataProcessingAgent } from '../../core/agents/DataProcessingAgent';
import { ExecutionContext } from '../../core/interfaces/Agent';

describe('DataProcessingAgent', () => {
  const mockContext: ExecutionContext = {
    workspaceId: 'test-workspace',
    userId: 'test-user'
  };

  describe('filter operation', () => {
    it('should filter array based on condition', async () => {
      const agent = new DataProcessingAgent({
        name: 'Test Filter Agent',
        workspaceId: 'test-workspace',
        operations: [{
          type: 'filter',
          config: {
            condition: {
              field: 'age',
              operator: '>',
              value: 18
            }
          }
        }]
      });

      const input = [
        { name: 'Alice', age: 25 },
        { name: 'Bob', age: 17 },
        { name: 'Charlie', age: 30 }
      ];

      const result = await agent.execute(input, mockContext);
      expect(result.success).toBe(true);
      expect(result.output).toHaveLength(2);
      expect(result.output.map(p => p.name)).toEqual(['Alice', 'Charlie']);
    });
  });

  describe('map operation', () => {
    it('should transform data according to mapping', async () => {
      const agent = new DataProcessingAgent({
        name: 'Test Map Agent',
        workspaceId: 'test-workspace',
        operations: [{
          type: 'map',
          config: {
            mapping: {
              fullName: '$.name',
              yearOfBirth: 'calculated'
            }
          }
        }]
      });

      const input = [
        { name: 'Alice', age: 25 },
        { name: 'Bob', age: 30 }
      ];

      const result = await agent.execute(input, mockContext);
      expect(result.success).toBe(true);
      expect(result.output[0]).toHaveProperty('fullName', 'Alice');
      expect(result.output[1]).toHaveProperty('fullName', 'Bob');
    });
  });

  describe('sort operation', () => {
    it('should sort array based on key', async () => {
      const agent = new DataProcessingAgent({
        name: 'Test Sort Agent',
        workspaceId: 'test-workspace',
        operations: [{
          type: 'sort',
          config: {
            key: 'age',
            direction: 'asc'
          }
        }]
      });

      const input = [
        { name: 'Charlie', age: 30 },
        { name: 'Alice', age: 25 },
        { name: 'Bob', age: 17 }
      ];

      const result = await agent.execute(input, mockContext);
      expect(result.success).toBe(true);
      expect(result.output.map(p => p.name)).toEqual(['Bob', 'Alice', 'Charlie']);
    });
  });

  describe('transform operation', () => {
    it('should apply transformations to data', async () => {
      const agent = new DataProcessingAgent({
        name: 'Test Transform Agent',
        workspaceId: 'test-workspace',
        operations: [{
          type: 'transform',
          config: {
            transformations: {
              upperName: 'uppercase:name'
            }
          }
        }]
      });

      const input = { name: 'alice', age: 25 };

      const result = await agent.execute(input, mockContext);
      expect(result.success).toBe(true);
      expect(result.output.upperName).toBe('ALICE');
    });
  });

  describe('error handling', () => {
    it('should handle invalid input', async () => {
      const agent = new DataProcessingAgent({
        name: 'Test Error Agent',
        workspaceId: 'test-workspace',
        operations: [{
          type: 'filter',
          config: {
            condition: {
              field: 'age',
              operator: '>',
              value: 18
            }
          }
        }]
      });

      const result = await agent.execute('invalid input', mockContext);
      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
    });
  });
}); 