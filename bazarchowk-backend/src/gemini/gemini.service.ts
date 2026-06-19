import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { GoogleGenerativeAI, ChatSession } from '@google/generative-ai';

@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);
  private genAI: GoogleGenerativeAI;
  private readonly modelName = 'gemini-2.5-flash';

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      this.logger.error('GEMINI_API_KEY is missing from environment variables');
    } else {
      this.genAI = new GoogleGenerativeAI(apiKey);
    }
  }

  private getModel(systemInstruction?: string) {
    if (!this.genAI) {
      throw new InternalServerErrorException('Gemini API key is missing');
    }
    return this.genAI.getGenerativeModel({
      model: this.modelName,
      systemInstruction: systemInstruction,
    });
  }

  async generateText(prompt: string, systemPrompt?: string): Promise<string> {
    try {
      const model = this.getModel(systemPrompt);
      const result = await model.generateContent(prompt);
      const response = result.response;
      return response.text();
    } catch (error) {
      this.handleError('generateText', error);
    }
  }

  async generateChatResponse(history: { role: 'user' | 'model'; parts: { text: string }[] }[], message: string, systemPrompt?: string): Promise<string> {
    try {
      const model = this.getModel(systemPrompt);
      const chat: ChatSession = model.startChat({
        history,
      });

      const result = await chat.sendMessage(message);
      const response = result.response;
      return response.text();
    } catch (error) {
      this.handleError('generateChatResponse', error);
    }
  }

  async processVoiceAssistant(messages: any[], systemPrompt: string): Promise<any> {
    try {
      const model = this.getModel(systemPrompt);
      // Map OpenAI format to Gemini format
      const history = messages.filter(m => m.role !== 'system').map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));
      
      const lastMessage = history.pop(); // the current transcript
      if (!lastMessage) {
        throw new InternalServerErrorException('No user message provided for voice assistant');
      }
      
      const chat = model.startChat({ history });
      const result = await chat.sendMessage(lastMessage.parts[0].text);
      return result.response.text();
    } catch (error) {
      this.handleError('processVoiceAssistant', error);
    }
  }

  private handleError(method: string, error: any): never {
    this.logger.error(`Error in \${method}:`, error.message || error);
    if (error.status === 429 || error.message?.includes('429') || error.message?.includes('Quota')) {
      throw new InternalServerErrorException('AI Service rate limit exceeded. Please try again later.');
    }
    if (error.status === 403 || error.message?.includes('403') || error.message?.includes('API key not valid')) {
      throw new InternalServerErrorException('AI Service authentication failed.');
    }
    throw new InternalServerErrorException('Failed to process AI request. Please try again.');
  }
}
