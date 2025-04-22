import { Configuration, OpenAIApi } from 'openai';

export class OpenAIClient {
  private api: OpenAIApi;
  
  constructor(apiKey: string) {
    const configuration = new Configuration({
      apiKey: apiKey
    });
    this.api = new OpenAIApi(configuration);
  }
  
  async generateCompletion(params: {
    model: string;
    messages: Array<{ role: string; content: string }>;
    temperature: number;
    maxTokens: number;
  }) {
    const response = await this.api.createChatCompletion({
      model: params.model,
      messages: params.messages,
      temperature: params.temperature,
      max_tokens: params.maxTokens
    });
    
    return {
      text: response.data.choices[0].message?.content || '',
      usage: response.data.usage
    };
  }
} 