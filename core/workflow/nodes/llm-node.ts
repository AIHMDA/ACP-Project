import { INode, INodeTypeDescription } from '../../types';
import { NodeType } from '../registry';
import { LLMAgent } from '../../agents/llm';

export class LLMNodeType implements NodeType {
  description: INodeTypeDescription = {
    type: 'llm',
    name: 'LLM Agent',
    description: 'En node der bruger en LLM agent til at generere tekst',
    version: 1,
    group: 'agents',
    icon: '🤖',
    color: '#7B2CBF',
    properties: [
      {
        displayName: 'Provider',
        name: 'provider',
        type: 'options',
        required: true,
        options: [
          { name: 'OpenAI', value: 'openai' },
          { name: 'Anthropic', value: 'anthropic' }
        ]
      },
      {
        displayName: 'Model',
        name: 'model',
        type: 'string',
        required: true,
        default: 'gpt-3.5-turbo'
      },
      {
        displayName: 'System Prompt',
        name: 'systemPrompt',
        type: 'string',
        default: 'Du er en hjælpsom assistent.'
      },
      {
        displayName: 'Temperature',
        name: 'temperature',
        type: 'number',
        default: 0.7
      },
      {
        displayName: 'Max Tokens',
        name: 'maxTokens',
        type: 'number',
        default: 1000
      }
    ],
    inputs: [
      {
        name: 'prompt',
        type: 'string',
        required: true,
        description: 'Prompten der skal sendes til LLM'
      }
    ],
    outputs: [
      {
        name: 'response',
        type: 'string',
        description: 'Svaret fra LLM'
      }
    ]
  };
  
  async execute(params: {
    node: INode;
    inputData: any;
    context: any;
  }): Promise<any> {
    const { node, inputData, context } = params;
    
    // Opret LLM agent med node konfiguration
    const agent = new LLMAgent({
      name: node.name,
      config: {
        provider: node.parameters.provider,
        model: node.parameters.model,
        systemPrompt: node.parameters.systemPrompt,
        temperature: node.parameters.temperature,
        maxTokens: node.parameters.maxTokens
      }
    });
    
    // Validér agent konfiguration
    const validationResult = agent.validate();
    if (!validationResult.valid) {
      throw new Error(
        `Ugyldig agent konfiguration: ${validationResult.issues?.join(', ')}`
      );
    }
    
    // Eksekver agent med input prompt
    const result = await agent.execute(inputData.prompt, {
      workspace: context.workspace,
      user: context.userId
    });
    
    if (!result.success) {
      throw new Error(result.error || 'Agent eksekvering fejlede');
    }
    
    return {
      response: result.output,
      metadata: result.metadata
    };
  }
} 