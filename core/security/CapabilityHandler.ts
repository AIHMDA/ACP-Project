import { IAgent, ExecutionContext } from '../interfaces/Agent';

export interface CapabilityError {
  code: string;
  message: string;
  details?: Record<string, any>;
}

export interface CapabilityValidationResult {
  success: boolean;
  error?: CapabilityError;
  metadata?: Record<string, any>;
}

export class CapabilityHandler {
  private static instance: CapabilityHandler;
  private capabilityCache: Map<string, Set<string>>;

  private constructor() {
    this.capabilityCache = new Map();
  }

  public static getInstance(): CapabilityHandler {
    if (!CapabilityHandler.instance) {
      CapabilityHandler.instance = new CapabilityHandler();
    }
    return CapabilityHandler.instance;
  }

  public async validateCapability(agent: IAgent, requiredCapability: string, context: ExecutionContext): Promise<CapabilityValidationResult> {
    try {
      // Tjek om agenten har den krævede capability
      if (!agent.capabilities.includes(requiredCapability)) {
        return {
          success: false,
          error: {
            code: 'CAPABILITY_NOT_FOUND',
            message: `Agent lacks required capability: ${requiredCapability}`,
            details: {
              agentId: agent.id,
              requiredCapability,
              availableCapabilities: agent.capabilities
            }
          }
        };
      }

      // Tjek cache for validerede capabilities
      const cachedCapabilities = this.capabilityCache.get(agent.id);
      if (cachedCapabilities?.has(requiredCapability)) {
        return {
          success: true,
          metadata: { fromCache: true }
        };
      }

      // Validér capability tilladelser
      const isValid = await this.verifyCapabilityPermissions(agent, requiredCapability, context);
      if (!isValid) {
        return {
          success: false,
          error: {
            code: 'CAPABILITY_UNAUTHORIZED',
            message: 'Agent is not authorized to use this capability',
            details: {
              agentId: agent.id,
              requiredCapability
            }
          }
        };
      }

      // Opdater cache
      if (!this.capabilityCache.has(agent.id)) {
        this.capabilityCache.set(agent.id, new Set());
      }
      this.capabilityCache.get(agent.id)?.add(requiredCapability);

      return {
        success: true,
        metadata: { fromCache: false }
      };

    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'CAPABILITY_VALIDATION_FAILED',
          message: 'Failed to validate capability',
          details: { error: error.message }
        }
      };
    }
  }

  private async verifyCapabilityPermissions(agent: IAgent, capability: string, context: ExecutionContext): Promise<boolean> {
    // TODO: Implementér mere avanceret capability validering
    // For eksempel:
    // - Tjek om capability er aktiv/ikke udløbet
    // - Validér mod external permission system
    // - Tjek workspace-specifikke tilladelser
    return true;
  }

  public async grantCapability(agentId: string, capability: string): Promise<void> {
    const capabilities = this.capabilityCache.get(agentId) || new Set();
    capabilities.add(capability);
    this.capabilityCache.set(agentId, capabilities);
  }

  public async revokeCapability(agentId: string, capability: string): Promise<void> {
    const capabilities = this.capabilityCache.get(agentId);
    if (capabilities) {
      capabilities.delete(capability);
    }
  }

  public async clearCapabilities(agentId: string): Promise<void> {
    this.capabilityCache.delete(agentId);
  }
} 