import { IAgent, ExecutionContext } from '../interfaces/Agent';
import { AuthenticationHandler } from './AuthenticationHandler';
import { CapabilityHandler } from './CapabilityHandler';

export interface CommunicationError {
  code: string;
  message: string;
  details?: Record<string, any>;
}

export interface CommunicationResult {
  success: boolean;
  data?: any;
  error?: CommunicationError;
  metadata?: Record<string, any>;
}

export interface SecureChannel {
  id: string;
  participants: string[];
  createdAt: number;
  expiresAt: number;
  metadata?: Record<string, any>;
}

export class CommunicationHandler {
  private static instance: CommunicationHandler;
  private channels: Map<string, SecureChannel>;
  private authHandler: AuthenticationHandler;
  private capabilityHandler: CapabilityHandler;

  private constructor() {
    this.channels = new Map();
    this.authHandler = AuthenticationHandler.getInstance();
    this.capabilityHandler = CapabilityHandler.getInstance();
  }

  public static getInstance(): CommunicationHandler {
    if (!CommunicationHandler.instance) {
      CommunicationHandler.instance = new CommunicationHandler();
    }
    return CommunicationHandler.instance;
  }

  public async createSecureChannel(
    initiator: IAgent,
    participant: IAgent,
    context: ExecutionContext
  ): Promise<CommunicationResult> {
    try {
      // Validér begge agenters autentificering
      const initiatorAuth = await this.authHandler.authenticateAgent(initiator, context);
      const participantAuth = await this.authHandler.authenticateAgent(participant, context);

      if (!initiatorAuth.success || !participantAuth.success) {
        return {
          success: false,
          error: {
            code: 'AUTH_FAILED',
            message: 'One or both agents failed authentication',
            details: {
              initiatorAuth: initiatorAuth.error,
              participantAuth: participantAuth.error
            }
          }
        };
      }

      // Validér kommunikations-capability
      const initiatorCap = await this.capabilityHandler.validateCapability(
        initiator,
        'SECURE_COMMUNICATION',
        context
      );
      const participantCap = await this.capabilityHandler.validateCapability(
        participant,
        'SECURE_COMMUNICATION',
        context
      );

      if (!initiatorCap.success || !participantCap.success) {
        return {
          success: false,
          error: {
            code: 'CAPABILITY_FAILED',
            message: 'One or both agents lack required capabilities',
            details: {
              initiatorCap: initiatorCap.error,
              participantCap: participantCap.error
            }
          }
        };
      }

      // Opret sikker kanal
      const channel: SecureChannel = {
        id: this.generateChannelId(initiator.id, participant.id),
        participants: [initiator.id, participant.id],
        createdAt: Date.now(),
        expiresAt: Date.now() + 3600000, // 1 time expiration
        metadata: {
          initiatorType: initiator.type,
          participantType: participant.type,
          workspaceId: context.workspaceId
        }
      };

      this.channels.set(channel.id, channel);

      return {
        success: true,
        data: channel,
        metadata: {
          initiatorToken: initiatorAuth.token,
          participantToken: participantAuth.token
        }
      };

    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'CHANNEL_CREATION_FAILED',
          message: 'Failed to create secure channel',
          details: { error: error.message }
        }
      };
    }
  }

  public async validateChannel(channelId: string): Promise<boolean> {
    const channel = this.channels.get(channelId);
    if (!channel) return false;
    return channel.expiresAt > Date.now();
  }

  public async sendSecureMessage(
    sender: IAgent,
    channelId: string,
    message: any,
    context: ExecutionContext
  ): Promise<CommunicationResult> {
    try {
      // Validér kanal
      if (!await this.validateChannel(channelId)) {
        return {
          success: false,
          error: {
            code: 'INVALID_CHANNEL',
            message: 'Channel is invalid or expired',
            details: { channelId }
          }
        };
      }

      const channel = this.channels.get(channelId)!;

      // Validér at sender er deltager i kanalen
      if (!channel.participants.includes(sender.id)) {
        return {
          success: false,
          error: {
            code: 'UNAUTHORIZED_SENDER',
            message: 'Sender is not a participant in this channel',
            details: { 
              senderId: sender.id,
              channelId
            }
          }
        };
      }

      // TODO: Implementér kryptering af beskeder
      const secureMessage = {
        senderId: sender.id,
        channelId,
        timestamp: Date.now(),
        content: message
      };

      return {
        success: true,
        data: secureMessage
      };

    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'MESSAGE_SEND_FAILED',
          message: 'Failed to send secure message',
          details: { error: error.message }
        }
      };
    }
  }

  private generateChannelId(initiatorId: string, participantId: string): string {
    const timestamp = Date.now();
    return `channel_${initiatorId}_${participantId}_${timestamp}`;
  }

  public async closeChannel(channelId: string): Promise<void> {
    this.channels.delete(channelId);
  }

  public async getActiveChannels(agentId: string): Promise<SecureChannel[]> {
    const now = Date.now();
    return Array.from(this.channels.values())
      .filter(channel => 
        channel.participants.includes(agentId) && 
        channel.expiresAt > now
      );
  }
} 