import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { QueueService } from '../queue/queue.service';
import { NotificationsService } from '../notifications/notifications.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { CreateTicketDto, AddMessageDto, UpdateTicketStatusDto } from './dto/support.dto';

@Injectable()
export class SupportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queueService: QueueService,
    private readonly notifications: NotificationsService,
    private readonly realtimeGateway: RealtimeGateway,
  ) {}

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

    if (senderType === 'ADMIN') {
      const user = await this.prisma.user.findUnique({ where: { id: ticket.userId } });
      if (user) {
        await this.notifications.sendInAppNotification(
          user.id,
          'New Reply on Ticket',
          `An admin has replied to your ticket #${ticketId.substring(0, 8)}`,
          'SYSTEM'
        );
        await this.queueService.enqueueEmail('send-ticket-update', {
          to: user.email,
          name: user.firstName,
          ticketId: ticketId.substring(0, 8),
          updateMessage: dto.content
        });
      }
      // Broadcast to user
      this.realtimeGateway.sendToUser(ticket.userId, 'new_ticket_message', { ticketId, message });
    } else {
      // Broadcast to admins
      this.realtimeGateway.sendToAdmins('new_ticket_message', { ticketId, message });
    }

    return message;
  }

  async updateTicketStatus(ticketId: string, dto: UpdateTicketStatusDto) {
    const ticket = await this.prisma.supportTicket.update({
      where: { id: ticketId },
      data: { status: dto.status },
      include: { user: true }
    });

    await this.notifications.sendInAppNotification(
      ticket.userId,
      'Ticket Status Updated',
      `Your support ticket is now ${dto.status}`,
      'SYSTEM'
    );

    await this.queueService.enqueueEmail('send-ticket-update', {
      to: ticket.user.email,
      name: ticket.user.firstName,
      ticketId: ticketId.substring(0, 8),
      updateMessage: `The status of your support ticket has been updated to: ${dto.status}`
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
