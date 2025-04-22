import { PrismaClient, WorkspaceAgent, AgentInvocation } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

export class AgentService {
  async createAgent(params: {
    workspaceId: string;
    name: string;
    type: string;
    config: any;
    creatorId: string;
  }): Promise<{ agent?: WorkspaceAgent; error?: string }> {
    const { workspaceId, name, type, config } = params;

    try {
      const agent = await prisma.workspaceAgent.create({
        data: {
          id: uuidv4(),
          workspaceId,
          name,
          type,
          capabilities: [],
          config
        }
      });

      return { agent };
    } catch (error) {
      console.error('Fejl ved oprettelse af agent:', error);
      return { error: 'Kunne ikke oprette agent' };
    }
  }

  async invokeAgent(params: {
    workspaceId: string;
    agentId: string;
    prompt: string;
    userId: string;
  }): Promise<string> {
    const { agentId, prompt } = params;

    // Opret invocation record
    const invocation = await prisma.agentInvocation.create({
      data: {
        id: uuidv4(),
        agentId,
        prompt,
        status: 'pending',
        metadata: {}
      }
    });

    // Start asynkron proces for at håndtere invocation
    this.handleAgentInvocation(invocation.id).catch(error => {
      console.error('Fejl ved håndtering af agent invocation:', error);
    });

    return invocation.id;
  }

  private async handleAgentInvocation(invocationId: string): Promise<void> {
    try {
      // Hent invocation detaljer
      const invocation = await prisma.agentInvocation.findUnique({
        where: { id: invocationId },
        include: { agent: true }
      });

      if (!invocation) {
        throw new Error('Invocation ikke fundet');
      }

      // Opdater status til processing
      await prisma.agentInvocation.update({
        where: { id: invocationId },
        data: { status: 'processing' }
      });

      // TODO: Implementer faktisk agent logik her
      // Dette vil variere baseret på agent type og konfiguration

      // Opdater med resultat
      await prisma.agentInvocation.update({
        where: { id: invocationId },
        data: {
          status: 'completed',
          result: { response: 'Mock response' }, // Erstat med faktisk resultat
          completedAt: new Date()
        }
      });
    } catch (error) {
      // Opdater med fejl
      await prisma.agentInvocation.update({
        where: { id: invocationId },
        data: {
          status: 'failed',
          error: error.message,
          completedAt: new Date()
        }
      });
    }
  }
} 