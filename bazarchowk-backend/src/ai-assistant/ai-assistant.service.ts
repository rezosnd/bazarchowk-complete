import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GeminiService } from '../gemini/gemini.service';

@Injectable()
export class AiAssistantService {
  private readonly systemPrompt = "You are BazarChowk AI Assistant, the official AI assistant of India's local commerce super app. Help users with groceries, food delivery, medicines, services, orders, payments, refunds, support tickets and app navigation. Support Hindi and English. Be concise, helpful and professional. If a request requires human intervention such as refunds, payment disputes or account verification, inform the user that a human support executive will assist shortly.";

  constructor(
    private readonly prisma: PrismaService,
    private readonly geminiService: GeminiService
  ) {}

  async processSupportMessage(userId: string, ticketId: string, messageContent: string) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
      include: { messages: { orderBy: { createdAt: 'asc' } } }
    });

    if (!ticket || ticket.userId !== userId) throw new BadRequestException('Invalid ticket');

    // Save user message
    await this.prisma.supportMessage.create({
      data: {
        ticketId,
        senderId: userId,
        senderType: 'USER',
        content: messageContent
      }
    });

    // Build chat history for AI context
    const chatHistory = ticket.messages.map(m => ({
      role: m.senderType === 'AI' ? 'model' : 'user' as 'model' | 'user',
      parts: [{ text: m.content }]
    }));

    // AI API CALL
    let aiResponseText = 'I am currently experiencing technical difficulties. Please wait for a human agent.';
    try {
      aiResponseText = await this.geminiService.generateChatResponse(chatHistory, messageContent, this.systemPrompt);
    } catch (error) {
      console.error('AI Support Error:', error);
    }

    // Save AI response
    const aiMessage = await this.prisma.supportMessage.create({
      data: {
        ticketId,
        senderType: 'AI',
        content: aiResponseText
      }
    });

    return aiMessage;
  }

  async createTicket(userId: string, subject: string, category: string, initialMessage: string) {
    const ticket = await this.prisma.supportTicket.create({
      data: {
        userId,
        subject,
        category,
      }
    });

    return this.processSupportMessage(userId, ticket.id, initialMessage);
  }
}
