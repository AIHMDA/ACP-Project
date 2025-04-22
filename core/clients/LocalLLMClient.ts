export class LocalLLMClient {
  constructor() {
    // Implementering af lokal LLM klient kommer senere
    console.warn('LocalLLMClient er endnu ikke fuldt implementeret');
  }
  
  async generateCompletion(params: {
    model: string;
    messages: Array<{ role: string; content: string }>;
    temperature: number;
    maxTokens: number;
  }) {
    throw new Error('LocalLLMClient er endnu ikke implementeret');
  }
} 