import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTicketDto, AddMessageDto, UpdateTicketStatusDto } from './dto/support.dto';

@Injectable()
export class SupportService {
  constructor(private readonly prisma: PrismaService) {}

  async createTicket(userId: string, dto: CreateTicketDto) {
    return this.prisma.supportTicket.create({
      data: {
        userId,
        subject: dto.subject,
        category: dto.category,
        messages: dto.initialMessage ? {
          create: {
            senderId: userId,
            senderType: 'USER',
            content: dto.initialMessage,
          }
        } : undefined
      },
      include: { messages: true }
    });
  }

  async getUserTickets(userId: string) {
    return this.prisma.supportTicket.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });
  }

  async getTicketDetails(userId: string, ticketId: string, isAdmin: boolean = false) {
    const whereClause = isAdmin ? { id: ticketId } : { id: ticketId, userId };
    
    const ticket = await this.prisma.supportTicket.findUnique({
      where: whereClause,
      include: {
        messages: { orderBy: { createdAt: 'asc' } },
        user: { select: { id: true, firstName: true, lastName: true, phone: true } }
      }
    });

    if (!ticket) throw new NotFoundException('Ticket not found');
    return ticket;
  }

  async addMessage(userId: string, ticketId: string, dto: AddMessageDto, senderType: 'USER' | 'ADMIN' = 'USER') {
    const whereClause = senderType === 'ADMIN' ? { id: ticketId } : { id: ticketId, userId };
    const ticket = await this.prisma.supportTicket.findUnique({ where: whereClause });
    
    if (!ticket) throw new NotFoundException('Ticket not found');

    const message = await this.prisma.supportMessage.create({
      data: {
        ticketId,
        senderId: userId,
        senderType,
        content: dto.content
      }
    });

    // Update ticket timestamp
    await this.prisma.supportTicket.update({
      where: { id: ticketId },
      data: { updatedAt: new Date() }
    });

    return message;
  }

  async updateTicketStatus(ticketId: string, dto: UpdateTicketStatusDto) {
    const ticket = await this.prisma.supportTicket.update({
      where: { id: ticketId },
      data: { status: dto.status }
    });
    return ticket;
  }

  async getAllTicketsForAdmin(status?: string) {
    const where = status ? { status } : {};
    return this.prisma.supportTicket.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { firstName: true, lastName: true, phone: true } } }
    });
  }
}
