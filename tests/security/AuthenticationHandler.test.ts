import { AuthenticationHandler } from '../../core/security/AuthenticationHandler';
import { TokenOptions, AuthToken } from '../../core/interfaces/auth.types';
import { IAgent, ExecutionContext } from '../../core/interfaces/Agent';

describe('AuthenticationHandler Integration Tests', () => {
  let authHandler: AuthenticationHandler;
  
  beforeEach(() => {
    authHandler = AuthenticationHandler.getInstance();
  });

  describe('Token Generation & Validation', () => {
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

    test('should generate valid token with correct interface structure', async () => {
      const tokenOptions: TokenOptions = {
        agentId: mockAgent.id,
        capabilities: mockAgent.capabilities,
        expiresIn: 3600000,
        workspaceId: mockContext.workspaceId,
        userId: mockContext.userId
      };

      const token = await authHandler.generateToken(tokenOptions);

      // Verify token structure matches AuthToken interface
      expect(token).toHaveProperty('id');
      expect(token).toHaveProperty('agentId', mockAgent.id);
      expect(token).toHaveProperty('capabilities');
      expect(token).toHaveProperty('issuedAt');
      expect(token).toHaveProperty('expiresAt');
      expect(token).toHaveProperty('signature');
      
      // Verify token is valid
      const isValid = await authHandler.validateToken(token);
      expect(isValid).toBe(true);
    });

    test('should authenticate agent and return valid token', async () => {
      const result = await authHandler.authenticateAgent(mockAgent, mockContext);

      expect(result.success).toBe(true);
      expect(result.token).toBeDefined();
      expect(result.metadata).toBeDefined();
    });

    test('should measure token generation performance', async () => {
      const tokenOptions: TokenOptions = {
        agentId: mockAgent.id,
        capabilities: mockAgent.capabilities
      };

      await authHandler.generateToken(tokenOptions);
      const metrics = authHandler.getPerformanceMetrics();

      expect(metrics.tokenGeneration).toBeDefined();
      expect(metrics.tokenGeneration.average).toBeGreaterThan(0);
      expect(metrics.tokenGeneration.count).toBeGreaterThan(0);
    });

    test('should handle token expiration correctly', async () => {
      const tokenOptions: TokenOptions = {
        agentId: mockAgent.id,
        capabilities: mockAgent.capabilities,
        expiresIn: 1 // 1ms expiration
      };

      const token = await authHandler.generateToken(tokenOptions);
      await new Promise(resolve => setTimeout(resolve, 2)); // Wait for token to expire
      
      const isValid = await authHandler.validateToken(token);
      expect(isValid).toBe(false);
    });

    test('should reject invalid token signatures', async () => {
      const tokenOptions: TokenOptions = {
        agentId: mockAgent.id,
        capabilities: mockAgent.capabilities
      };

      const token = await authHandler.generateToken(tokenOptions);
      const invalidToken: AuthToken = {
        ...token,
        signature: 'invalid-signature'
      };

      const isValid = await authHandler.validateToken(invalidToken);
      expect(isValid).toBe(false);
    });
  });
}); 