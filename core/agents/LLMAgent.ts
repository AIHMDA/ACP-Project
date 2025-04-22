import { BaseAgent } from './BaseAgent';
import { AgentResult, ExecutionContext } from '../interfaces/Agent';
import { OpenAIClient } from '../clients/OpenAIClient';
import { AnthropicClient } from '../clients/AnthropicClient';
import { LocalLLMClient } from '../clients/LocalLLMClient';

type LLMAgentConfig = {
  id?: string;
  name: string;
  workspaceId: string;
  provider: 'openai' | 'anthropic' | 'local';
  model: string;
  temperature?: number;
  systemPrompt?: string;
  maxTokens?: number;
};

export class LLMAgent extends BaseAgent {
  provider: string;
  model: string;
  temperature: number;
  systemPrompt: string;
  maxTokens: number;
  
  constructor(config: LLMAgentConfig) {
    super({
      id: config.id,
      name: config.name,
      type: 'llm',
      workspaceId: config.workspaceId,
      capabilities: ['text-generation', 'question-answering']
    });
    
    this.provider = config.provider;
    this.model = config.model;
    this.temperature = config.temperature || 0.7;
    this.systemPrompt = config.systemPrompt || 'Du er en hjælpsom AI assistent.';
    this.maxTokens = config.maxTokens || 1024;
  }
  
  async execute(input: any, context: ExecutionContext): Promise<AgentResult> {
    await this.logActivity('execute', { input, context });
    
    try {
      // Validér input
      if (typeof input !== 'string' && typeof input?.prompt !== 'string') {
        throw new Error('Input skal være en streng eller et objekt med en prompt egenskab');
      }
      
      const prompt = typeof input === 'string' ? input : input.prompt;
      
      // Opbyg beskeder array for LLM
      const messages = [
        { role: 'system', content: this.systemPrompt },
        { role: 'user', content: prompt }
      ];
      
      // Hvis der er tidligere resultater, inkludér dem som kontekst
      if (context.previousResults && context.previousResults.length > 0) {
        for (const result of context.previousResults) {
          if (result.success && result.output) {
            messages.push({
              role: 'assistant',
              content: `Tidligere operations resultat: ${JSON.stringify(result.output)}`
            });
          }
        }
      }
      
      // Få LLM client baseret på provider
      const llmClient = this.getLLMClient();
      
      // Kald LLM API
      const response = await llmClient.generateCompletion({
        model: this.model,
        messages,
        temperature: this.temperature,
        maxTokens: this.maxTokens
      });
      
      // Log succesfuld eksekvering
      await this.logActivity('response', { response });
      
      return {
        success: true,
        output: response.text,
        metadata: {
          model: this.model,
          provider: this.provider,
          tokens: response.usage
        }
      };
    } catch (error) {
      // Log fejl
      await this.logActivity('error', { error: error.message }, false);
      
      return {
        success: false,
        error: error.message,
        metadata: {
          model: this.model,
          provider: this.provider
        }
      };
    }
  }
  
  private getLLMClient() {
    switch (this.provider) {
      case 'openai':
        return new OpenAIClient(process.env.OPENAI_API_KEY);
      case 'anthropic':
        return new AnthropicClient(process.env.ANTHROPIC_API_KEY);
      case 'local':
        // Implementering af lokal LLM klient kommer senere
        return new LocalLLMClient();
      default:
        throw new Error(`Ikke-understøttet LLM udbyder: ${this.provider}`);
    }
  }
} 