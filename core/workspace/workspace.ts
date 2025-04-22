import { v4 as uuidv4 } from 'uuid';
import { IWorkspace, IWorkspaceSettings, IWorkspaceUser, IAgentInvocationResult, IWorkflowResult } from './types';
import { IACPAgent } from '../agents/types';
import { WorkflowDefinition } from '../orchestration/types';

const DEFAULT_SYSTEM_PROMPT = `Du er en hjælpsom assistent der hjælper med at løse opgaver.`;

export class ACPWorkspace implements IWorkspace {
  id: string;
  name: string;
  slug: string;
  vectors: any[];
  agents: IACPAgent[];
  workflows: WorkflowDefinition[];
  users: IWorkspaceUser[];
  settings: IWorkspaceSettings;

  constructor(params: Partial<ACPWorkspace>) {
    this.id = params.id || uuidv4();
    this.name = params.name || 'Nyt Workspace';
    this.slug = this.slugify(this.name);
    this.vectors = params.vectors || [];
    this.agents = params.agents || [];
    this.workflows = params.workflows || [];
    this.users = params.users || [];
    this.settings = {
      openAiPrompt: params.settings?.openAiPrompt || DEFAULT_SYSTEM_PROMPT,
      agentProvider: params.settings?.agentProvider || null,
      agentModel: params.settings?.agentModel || null,
      similarityThreshold: params.settings?.similarityThreshold || 0.25,
      vectorSearchMode: params.settings?.vectorSearchMode || 'default',
    };
  }

  private slugify(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  addAgent(agent: IACPAgent): void {
    if (this.agents.some(a => a.id === agent.id)) {
      throw new Error(`Agent med ID ${agent.id} findes allerede i workspace`);
    }
    this.agents.push(agent);
  }

  addWorkflow(workflow: WorkflowDefinition): void {
    if (this.workflows.some(w => w.id === workflow.id)) {
      throw new Error(`Workflow med ID ${workflow.id} findes allerede i workspace`);
    }
    this.workflows.push(workflow);
  }

  addUser(userId: string, role: string = 'user'): void {
    if (this.users.some(u => u.id === userId)) {
      throw new Error(`Bruger med ID ${userId} findes allerede i workspace`);
    }
    this.users.push({ id: userId, role });
  }

  async invokeAgent(agentId: string, prompt: string, user?: string): Promise<IAgentInvocationResult> {
    const agent = this.agents.find(a => a.id === agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} blev ikke fundet i workspace`);
    }

    // Opret invocation record
    const invocation = {
      id: uuidv4(),
      workspace: this.id,
      agent: agentId,
      prompt,
      timestamp: new Date().toISOString(),
      user
    };

    try {
      // Eksekver agent med workspace kontekst
      const result = await agent.execute(prompt, {
        workspace: {
          id: this.id,
          settings: this.settings,
          vectors: this.vectors
        },
        user
      });

      return {
        invocation,
        result
      };
    } catch (error) {
      throw new Error(`Fejl ved eksekvering af agent: ${error.message}`);
    }
  }

  async executeWorkflow(workflowId: string, input?: unknown, user?: string): Promise<IWorkflowResult> {
    const workflow = this.workflows.find(w => w.id === workflowId);
    if (!workflow) {
      throw new Error(`Workflow ${workflowId} blev ikke fundet i workspace`);
    }

    const startTime = new Date().toISOString();

    try {
      // Eksekver workflow med workspace kontekst
      const output = await workflow.execute({
        workspace: {
          id: this.id,
          settings: this.settings,
          vectors: this.vectors
        },
        user,
        input
      });

      const endTime = new Date().toISOString();
      const duration = new Date(endTime).getTime() - new Date(startTime).getTime();

      return {
        id: uuidv4(),
        workflowId,
        status: 'success',
        output,
        startTime,
        endTime,
        duration
      };
    } catch (error) {
      const endTime = new Date().toISOString();
      const duration = new Date(endTime).getTime() - new Date(startTime).getTime();

      return {
        id: uuidv4(),
        workflowId,
        status: 'error',
        error: error.message,
        startTime,
        endTime,
        duration
      };
    }
  }
} 