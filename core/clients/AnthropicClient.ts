import Anthropic from '@anthropic-ai/sdk';

export class AnthropicClient {
  private client: Anthropic;
  
  constructor(apiKey: string) {
    this.client = new Anthropic({
      apiKey: apiKey
    });
  }
  
  async generateCompletion(params: {
    model: string;
    messages: Array<{ role: string; content: string }>;
    temperature: number;
    maxTokens: number;
  }) {
    // Konvertér messages format til Anthropic format
    const prompt = this.convertMessagesToPrompt(params.messages);
    
    const response = await this.client.messages.create({
      model: params.model,
      messages: [{role: 'user', content: prompt}],
      temperature: params.temperature,
      max_tokens: params.maxTokens
    });
    
    return {
      text: response.content[0].text,
      usage: {
        prompt_tokens: response.usage?.input_tokens || 0,
        completion_tokens: response.usage?.output_tokens || 0,
        total_tokens: (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0)
      }
    };
  }
  
  private convertMessagesToPrompt(messages: Array<{ role: string; content: string }>): string {
    return messages
      .map(msg => {
        switch (msg.role) {
          case 'system':
            return `System: ${msg.content}\n\n`;
          case 'user':
            return `Human: ${msg.content}\n\n`;
          case 'assistant':
            return `Assistant: ${msg.content}\n\n`;
          default:
            return `${msg.content}\n\n`;
        }
      })
      .join('');
  }
} 