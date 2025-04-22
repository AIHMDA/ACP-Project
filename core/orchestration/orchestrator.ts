import { v4 as uuidv4 } from 'uuid';
import { BaseAgent } from '../agents/base_agent';
import { ExecutionContext } from '../agents/types';
import {
  WorkflowDefinition,
  WorkflowExecution,
  WorkflowNode,
  NodeExecutionResult,
  NodeType,
  NodeTypeDefinition
} from './types';

export class Orchestrator {
  private workflows: Map<string, WorkflowDefinition>;
  private executions: Map<string, WorkflowExecution>;
  private agents: Map<string, BaseAgent>;
  private nodeTypes: Map<NodeType, NodeTypeDefinition>;
  private auditLog: Array<{
    timestamp: Date;
    action: string;
    details: Record<string, unknown>;
  }>;

  constructor() {
    this.workflows = new Map();
    this.executions = new Map();
    this.agents = new Map();
    this.nodeTypes = new Map();
    this.auditLog = [];
    this.registerDefaultNodeTypes();
  }

  private registerDefaultNodeTypes(): void {
    // Registrer standard node typer
    this.nodeTypes.set('task', {
      type: 'task',
      description: 'Executes an agent capability',
      properties: [
        {
          name: 'agentId',
          type: 'string',
          description: 'ID of the agent to execute',
          required: true
        },
        {
          name: 'capability',
          type: 'string',
          description: 'Name of the capability to execute',
          required: true
        }
      ],
      inputs: ['default'],
      outputs: ['success', 'error']
    });

    this.nodeTypes.set('condition', {
      type: 'condition',
      description: 'Evaluates a condition and routes execution',
      properties: [
        {
          name: 'expression',
          type: 'string',
          description: 'Condition expression to evaluate',
          required: true
        }
      ],
      inputs: ['default'],
      outputs: ['true', 'false']
    });

    // Tilføj flere node typer her...
  }

  public registerAgent(agent: BaseAgent): void {
    this.agents.set(agent.getId(), agent);
  }

  public async registerWorkflow(workflow: WorkflowDefinition): Promise<string> {
    this.validateWorkflow(workflow);
    
    const workflowId = workflow.id || uuidv4();
    workflow.id = workflowId;
    
    this.workflows.set(workflowId, workflow);
    this.logAction('workflow_registered', { workflowId, workflow });
    
    return workflowId;
  }

  public async executeWorkflow(
    workflowId: string,
    context: ExecutionContext,
    initialVariables: Record<string, unknown> = {}
  ): Promise<string> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`);
    }

    const executionId = uuidv4();
    const execution: WorkflowExecution = {
      id: executionId,
      workflowId,
      status: 'pending',
      context,
      variables: { ...initialVariables },
      nodeResults: {},
      startTime: new Date()
    };

    this.executions.set(executionId, execution);
    this.logAction('workflow_execution_started', { executionId, workflowId, context });

    try {
      execution.status = 'running';
      await this.executeWorkflowNodes(execution, workflow);
      
      execution.status = 'completed';
      execution.endTime = new Date();
      this.logAction('workflow_execution_completed', { executionId, result: execution });
      
    } catch (error) {
      execution.status = 'failed';
      execution.endTime = new Date();
      execution.error = {
        message: error instanceof Error ? error.message : 'Unknown error',
        nodeId: execution.currentNode || 'unknown',
        details: { error }
      };
      
      this.logAction('workflow_execution_failed', { 
        executionId, 
        error: execution.error 
      });
      
      throw error;
    }

    return executionId;
  }

  private async executeWorkflowNodes(
    execution: WorkflowExecution,
    workflow: WorkflowDefinition
  ): Promise<void> {
    const startNode = this.findStartNode(workflow);
    if (!startNode) {
      throw new Error('No start node found in workflow');
    }

    const executeNode = async (
      nodeId: string,
      inputData?: unknown
    ): Promise<unknown> => {
      const node = workflow.nodes[nodeId];
      if (!node) {
        throw new Error(`Node ${nodeId} not found`);
      }

      execution.currentNode = nodeId;
      const result = await this.executeNode(node, execution, inputData);
      execution.nodeResults[nodeId] = result;

      if (result.status === 'failed') {
        throw new Error(`Node ${nodeId} failed: ${result.error?.message}`);
      }

      const nextNodes = this.getNextNodes(workflow, nodeId, result);
      const outputs: unknown[] = [];

      for (const nextNodeId of nextNodes) {
        const output = await executeNode(nextNodeId, result.outputData);
        outputs.push(output);
      }

      return result.outputData;
    };

    await executeNode(startNode.id);
  }

  private findStartNode(workflow: WorkflowDefinition): WorkflowNode | undefined {
    // Find trigger nodes først
    const triggerNodes = Object.values(workflow.nodes)
      .filter(node => node.type === 'trigger');
    if (triggerNodes.length > 0) {
      return triggerNodes[0];
    }

    // Find nodes uden indgående forbindelser
    return Object.values(workflow.nodes)
      .find(node => !this.hasIncomingConnections(workflow, node.id));
  }

  private hasIncomingConnections(workflow: WorkflowDefinition, nodeId: string): boolean {
    for (const [sourceId, connections] of Object.entries(workflow.connections)) {
      for (const outputType of Object.values(connections)) {
        for (const outputs of Object.values(outputType)) {
          if (outputs.some(conn => conn.node === nodeId)) {
            return true;
          }
        }
      }
    }
    return false;
  }

  private getNextNodes(
    workflow: WorkflowDefinition,
    nodeId: string,
    result: NodeExecutionResult
  ): string[] {
    const connections = workflow.connections[nodeId];
    if (!connections) return [];

    const nextNodes: string[] = [];
    
    // Håndter forskellige output typer baseret på node type og resultat
    if (result.status === 'completed') {
      const outputType = this.determineOutputType(workflow.nodes[nodeId], result);
      const outputs = connections[outputType];
      
      if (outputs) {
        for (const [_, connections] of Object.entries(outputs)) {
          nextNodes.push(...connections.map(conn => conn.node));
        }
      }
    }

    return nextNodes;
  }

  private determineOutputType(node: WorkflowNode, result: NodeExecutionResult): string {
    if (node.type === 'condition') {
      return result.outputData === true ? 'true' : 'false';
    }
    return result.status === 'completed' ? 'success' : 'error';
  }

  private async executeNode(
    node: WorkflowNode,
    execution: WorkflowExecution,
    inputData?: unknown
  ): Promise<NodeExecutionResult> {
    const result: NodeExecutionResult = {
      status: 'pending',
      startTime: new Date(),
      attempts: 0,
      inputData
    };

    try {
      result.status = 'running';

      switch (node.type) {
        case 'task':
          result.outputData = await this.executeTaskNode(node, execution, inputData);
          break;
        case 'condition':
          result.outputData = await this.executeConditionNode(node, execution, inputData);
          break;
        case 'parallel':
          result.outputData = await this.executeParallelNode(node, execution, inputData);
          break;
        // Implementer flere node typer her...
        default:
          throw new Error(`Unsupported node type: ${node.type}`);
      }

      result.status = 'completed';
      
    } catch (error) {
      result.status = 'failed';
      result.error = {
        message: error instanceof Error ? error.message : 'Unknown error',
        details: { error }
      };
    }

    result.endTime = new Date();
    result.metadata = {
      duration: result.endTime.getTime() - result.startTime.getTime()
    };

    return result;
  }

  private async executeTaskNode(
    node: WorkflowNode,
    execution: WorkflowExecution,
    inputData?: unknown
  ): Promise<unknown> {
    if (!node.agentId || !node.capability) {
      throw new Error('Task node requires agentId and capability');
    }

    const agent = this.agents.get(node.agentId);
    if (!agent) {
      throw new Error(`Agent ${node.agentId} not found`);
    }

    const parameters = {
      ...node.parameters,
      input: inputData
    };

    const result = await agent.executeCapability(node.capability, parameters);
    if (!result.success) {
      throw new Error(result.error?.message || 'Task execution failed');
    }

    return result.data;
  }

  private async executeConditionNode(
    node: WorkflowNode,
    execution: WorkflowExecution,
    inputData?: unknown
  ): Promise<boolean> {
    const expression = node.parameters?.expression;
    if (typeof expression !== 'string') {
      throw new Error('Condition node requires an expression parameter');
    }

    // Implementer udtryks-evaluering her
    // Dette kunne bruge et udtryksbibliotek som jsonata eller lignende
    return true;
  }

  private async executeParallelNode(
    node: WorkflowNode,
    execution: WorkflowExecution,
    inputData?: unknown
  ): Promise<unknown[]> {
    const parallelTasks = node.parameters?.tasks;
    if (!Array.isArray(parallelTasks)) {
      throw new Error('Parallel node requires a tasks parameter');
    }

    // Eksekver alle tasks parallelt
    const results = await Promise.all(
      parallelTasks.map(task => this.executeTaskNode(
        { ...node, ...task },
        execution,
        inputData
      ))
    );

    return results;
  }

  private validateWorkflow(workflow: WorkflowDefinition): void {
    if (!workflow.nodes || Object.keys(workflow.nodes).length === 0) {
      throw new Error('Workflow must contain at least one node');
    }

    // Valider node typer og forbindelser
    for (const [nodeId, node] of Object.entries(workflow.nodes)) {
      const nodeType = this.nodeTypes.get(node.type);
      if (!nodeType) {
        throw new Error(`Invalid node type: ${node.type}`);
      }

      // Valider node parametre mod type definition
      this.validateNodeParameters(node, nodeType);

      // Valider forbindelser
      const connections = workflow.connections[nodeId];
      if (connections) {
        for (const outputType of Object.keys(connections)) {
          if (!nodeType.outputs.includes(outputType)) {
            throw new Error(
              `Invalid output type ${outputType} for node ${nodeId}`
            );
          }
        }
      }
    }
  }

  private validateNodeParameters(
    node: WorkflowNode,
    nodeType: NodeTypeDefinition
  ): void {
    for (const prop of nodeType.properties) {
      if (prop.required && !(prop.name in (node.parameters || {}))) {
        throw new Error(
          `Missing required parameter ${prop.name} for node ${node.id}`
        );
      }
    }
  }

  private logAction(
    action: string,
    details: Record<string, unknown>
  ): void {
    this.auditLog.push({
      timestamp: new Date(),
      action,
      details
    });
  }

  public getExecution(executionId: string): WorkflowExecution | undefined {
    return this.executions.get(executionId);
  }

  public getWorkflow(workflowId: string): WorkflowDefinition | undefined {
    return this.workflows.get(workflowId);
  }

  public getAuditLog(): Array<{
    timestamp: Date;
    action: string;
    details: Record<string, unknown>;
  }> {
    return [...this.auditLog];
  }
} 