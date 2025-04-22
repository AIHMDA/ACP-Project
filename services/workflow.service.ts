import { PrismaClient, Workflow, WorkflowExecution } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

export class WorkflowService {
  async createWorkflow(params: {
    workspaceId: string;
    name: string;
    description?: string;
    nodes: any[];
    edges: any[];
    creatorId: string;
  }): Promise<{ workflow?: Workflow; error?: string }> {
    const { workspaceId, name, description, nodes, edges, creatorId } = params;

    try {
      const workflow = await prisma.workflow.create({
        data: {
          id: uuidv4(),
          workspaceId,
          name,
          description,
          nodes,
          edges,
          creatorId,
          version: 1
        }
      });

      return { workflow };
    } catch (error) {
      console.error('Fejl ved oprettelse af workflow:', error);
      return { error: 'Kunne ikke oprette workflow' };
    }
  }

  async executeWorkflow(params: {
    workflowId: string;
    input?: any;
    userId: string;
  }): Promise<string> {
    const { workflowId, input = {} } = params;

    // Opret execution record
    const execution = await prisma.workflowExecution.create({
      data: {
        id: uuidv4(),
        workflowId,
        status: 'pending',
        input,
        metadata: {}
      }
    });

    // Start asynkron proces for at håndtere execution
    this.handleWorkflowExecution(execution.id).catch(error => {
      console.error('Fejl ved håndtering af workflow execution:', error);
    });

    return execution.id;
  }

  private async handleWorkflowExecution(executionId: string): Promise<void> {
    try {
      // Hent execution detaljer
      const execution = await prisma.workflowExecution.findUnique({
        where: { id: executionId },
        include: { workflow: true }
      });

      if (!execution) {
        throw new Error('Execution ikke fundet');
      }

      // Opdater status til processing
      await prisma.workflowExecution.update({
        where: { id: executionId },
        data: { status: 'processing' }
      });

      // TODO: Implementer faktisk workflow execution logik her
      // Dette vil involvere:
      // 1. Parse workflow definition
      // 2. Udfør nodes i korrekt rækkefølge
      // 3. Håndter data flow mellem nodes
      // 4. Håndter fejl og retry logik

      // Opdater med resultat
      await prisma.workflowExecution.update({
        where: { id: executionId },
        data: {
          status: 'completed',
          output: { result: 'Mock output' }, // Erstat med faktisk output
          completedAt: new Date()
        }
      });
    } catch (error) {
      // Opdater med fejl
      await prisma.workflowExecution.update({
        where: { id: executionId },
        data: {
          status: 'failed',
          error: error.message,
          completedAt: new Date()
        }
      });
    }
  }

  async getWorkflowExecutions(params: {
    workflowId: string;
    limit?: number;
    offset?: number;
  }): Promise<WorkflowExecution[]> {
    const { workflowId, limit = 10, offset = 0 } = params;

    return prisma.workflowExecution.findMany({
      where: { workflowId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset
    });
  }
} 