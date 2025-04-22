import { BaseAgent } from './base';
import { AgentExecutionResult, ValidationResult } from '../types';

interface LLMAgentConfig {
  provider: string;
  model: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
}

export class LLMAgent extends BaseAgent {
  private config: LLMAgentConfig;
  
  constructor(params: {
    name: string;
    description?: string;
    capabilities?: string[];
    config: LLMAgentConfig;
  }) {
    super({
      name: params.name,
      description: params.description,
      capabilities: params.capabilities || ['text-generation']
    });
    
    this.config = {
      provider: params.config.provider || 'openai',
      model: params.config.model || 'gpt-3.5-turbo',
      systemPrompt: params.config.systemPrompt || 'Du er en hjælpsom assistent.',
      temperature: params.config.temperature || 0.7,
      maxTokens: params.config.maxTokens || 1000
    };
  }
  
  async execute(
    prompt: string,
    context: {
      workspace: any;
      user?: string;
      data?: any;
    }
  ): Promise<AgentExecutionResult> {
    try {
      await this.logActivity('execute', { prompt, context });
      
      const llmClient = this.getLLMClient(this.config.provider);
      
      const response = await llmClient.generateText({
        model: this.config.model,
        messages: [
          { 
            role: 'system', 
            content: this.config.systemPrompt 
          },
          ...(context.data?.history || []).map((msg: any) => ({
            role: msg.role,
            content: msg.content
          })),
          { 
            role: 'user', 
            content: prompt 
          }
        ],
        temperature: this.config.temperature,
        maxTokens: this.config.maxTokens
      });
      
      await this.logActivity('response', { response });
      
      return {
        success: true,
        output: response.text,
        metadata: {
          model: this.config.model,
          provider: this.config.provider,
          tokens: response.usage
        }
      };
    } catch (error) {
      await this.logActivity('error', { error: error.message }, false);
      
      return {
        success: false,
        error: error.message,
        metadata: {
          model: this.config.model,
          provider: this.config.provider
        }
      };
    }
  }
  
  override validate(): ValidationResult {
    const issues: string[] = [];
    
    if (!this.config.provider) {
      issues.push('Provider er påkrævet');
    }
    
    if (!this.config.model) {
      issues.push('Model er påkrævet');
    }
    
    return {
      valid: issues.length === 0,
      issues
    };
  }
  
  private getLLMClient(provider: string): any {
    // Factory metode til at få korrekt LLM klient baseret på provider
    switch (provider.toLowerCase()) {
      case 'openai':
        return new OpenAIClient();
      case 'anthropic':
        return new AnthropicClient();
      default:
        throw new Error(`Ikke-understøttet LLM provider: ${provider}`);
    }
  }
}

// Placeholder klasser - skal implementeres med faktiske API klienter
class OpenAIClient {
  async generateText(params: any): Promise<any> {
    throw new Error('OpenAI klient ikke implementeret endnu');
  }
}

class AnthropicClient {
  async generateText(params: any): Promise<any> {
    throw new Error('Anthropic klient ikke implementeret endnu');
  }
} 