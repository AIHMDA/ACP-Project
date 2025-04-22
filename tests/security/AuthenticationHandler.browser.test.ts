/**
 * @jest-environment jsdom
 */

import { AuthenticationHandler } from '../../core/security/AuthenticationHandler';
import { TokenOptions, AuthToken } from '../../core/interfaces/auth.types';
import { IAgent, ExecutionContext } from '../../core/interfaces/Agent';

describe('AuthenticationHandler Browser Integration Tests', () => {
  let authHandler: AuthenticationHandler;
  
  beforeEach(() => {
    authHandler = AuthenticationHandler.getInstance();
  });

  const mockAgent: IAgent = {
    id: 'test-agent-1',
    name: 'Test Agent',
    type: 'test',
    capabilities: ['read', 'write'],
    workspaceId: 'test-workspace',
    execute: async (context: ExecutionContext) => {
      return { success: true };
    }
  };

  const mockContext = {
    workspaceId: 'test-workspace',
    userId: 'test-user'
  };

  test('should work in browser environment', async () => {
    const tokenOptions: TokenOptions = {
      agentId: mockAgent.id,
      capabilities: mockAgent.capabilities,
      workspaceId: mockContext.workspaceId,
      userId: mockContext.userId
    };

    const token = await authHandler.generateToken(tokenOptions);
    expect(token).toBeDefined();
    expect(token.id).toBeDefined();
    expect(token.signature).toBeDefined();
  });

  test('should handle browser crypto API', async () => {
    // Verify that crypto operations work in browser
    const tokenOptions: TokenOptions = {
      agentId: mockAgent.id,
      capabilities: mockAgent.capabilities
    };

    const token = await authHandler.generateToken(tokenOptions);
    const isValid = await authHandler.validateToken(token);
    expect(isValid).toBe(true);
  });

  test('should maintain performance in browser', async () => {
    const tokenOptions: TokenOptions = {
      agentId: mockAgent.id,
      capabilities: mockAgent.capabilities
    };

    const startTime = performance.now();
    await authHandler.generateToken(tokenOptions);
    const endTime = performance.now();

    const duration = endTime - startTime;
    expect(duration).toBeLessThan(100); // Should complete within 100ms in browser
  });

  test('should handle concurrent operations in browser', async () => {
    const tokenPromises = Array(5).fill(null).map(() => 
      authHandler.generateToken({
        agentId: mockAgent.id,
        capabilities: mockAgent.capabilities
      })
    );

    const tokens = await Promise.all(tokenPromises);
    expect(tokens).toHaveLength(5);
    
    const validationPromises = tokens.map(token => 
      authHandler.validateToken(token)
    );

    const results = await Promise.all(validationPromises);
    expect(results.every(result => result === true)).toBe(true);
  });
}); 