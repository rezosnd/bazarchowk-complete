import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateConversationDto, SendMessageDto, BroadcastMessageDto } from './dto/communication.dto';

@Injectable()
export class CommunicationService {
  private readonly logger = new Logger(CommunicationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async createConversation(creatorId: string, dto: CreateConversationDto) {
    // Ensure unique P2P conversation if it's 1-on-1
    if (dto.type === 'P2P' && dto.participantIds.length === 1) {
      const otherId = dto.participantIds[0];
      const existing = await this.prisma.conversation.findFirst({
        where: {
          type: 'P2P',
          participants: {
            every: {
              userId: { in: [creatorId, otherId] }
            }
          }
        },
        include: { participants: true }
      });
      // Check if exact match of 2 participants
      if (existing && existing.participants.length === 2) {
        return existing;
      }
    }

    const participantData = [creatorId, ...dto.participantIds].map(id => ({
      userId: id,
      role: id === creatorId ? 'ADMIN' : 'MEMBER'
    }));

    return this.prisma.conversation.create({
      data: {
        type: dto.type,
        title: dto.title,
        orderId: dto.orderId,
        participants: {
          create: participantData
        }
      },
      include: { participants: { include: { user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } } } } }
    });
  }

  async getUserConversations(userId: string) {
    return this.prisma.conversation.findMany({
      where: {
        participants: { some: { userId } },
        isActive: true
      },
      include: {
        participants: { include: { user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } } } },
        messages: { orderBy: { createdAt: 'desc' }, take: 1 } // latest message
      },
      orderBy: { updatedAt: 'desc' }
    });
  }

  async getMessages(conversationId: string, userId: string, page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    
    // Verify participation
    const participant = await this.prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId, userId } }
    });
    
    if (!participant) throw new NotFoundException('Conversation not found or access denied');

    // Update last read
    await this.prisma.conversationParticipant.update({
      where: { id: participant.id },
      data: { lastReadAt: new Date() }
    });

    const [data, total] = await Promise.all([
      this.prisma.message.findMany({
        where: { conversationId },
        skip, take: limit,
        orderBy: { createdAt: 'desc' },
        include: { sender: { select: { id: true, firstName: true, avatarUrl: true } }, attachments: true }
      }),
      this.prisma.message.count({ where: { conversationId } })
    ]);

    return { data: data.reverse(), total, page, limit };
  }

  async saveMessage(senderId: string, dto: SendMessageDto) {
    // Verify participation
    const participant = await this.prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId: dto.conversationId, userId: senderId } },
      include: { conversation: { include: { participants: true } } }
    });

    if (!participant) throw new BadRequestException('Not a participant in this conversation');

    // Create message
    const message = await this.prisma.message.create({
      data: {
        conversationId: dto.conversationId,
        senderId,
        content: dto.content,
        messageType: dto.messageType || 'TEXT',
        attachments: {
          create: dto.attachmentUrls?.map(url => ({
            fileUrl: url,
            fileType: 'auto',
            fileSize: 0
          })) || []
        }
      },
      include: { sender: { select: { id: true, firstName: true, avatarUrl: true } }, attachments: true }
    });

    // Update conversation updatedAt
    await this.prisma.conversation.update({
      where: { id: dto.conversationId },
      data: { updatedAt: new Date() }
    });

    // Send push notifications to other participants
    const otherParticipants = participant.conversation.participants.filter(p => p.userId !== senderId);
    for (const p of otherParticipants) {
      await this.notificationsService.sendInAppNotification(
        p.userId,
        `New message`,
        dto.content.substring(0, 50) + (dto.content.length > 50 ? '...' : ''),
        'CHAT'
      );
    }

    return message;
  }

  async broadcastMessage(adminId: string, dto: BroadcastMessageDto) {
    // Create a broadcast conversation or reuse a global one
    let broadcastConv = await this.prisma.conversation.findFirst({
      where: { type: 'BROADCAST', title: `BROADCAST_${dto.targetRole}` }
    });

    if (!broadcastConv) {
      broadcastConv = await this.prisma.conversation.create({
        data: { type: 'BROADCAST', title: `BROADCAST_${dto.targetRole}` }
      });
    }

    const message = await this.prisma.message.create({
      data: {
        conversationId: broadcastConv.id,
        senderId: adminId,
        content: dto.content,
        messageType: 'SYSTEM'
      }
    });

    // We assume notificationsService has a topic-based push for Roles
    // Example pseudo implementation:
    this.logger.log(`Broadcasting message to all ${dto.targetRole}: ${dto.content}`);
    
    // Fallback: finding all users of role to send in-app notifications
    // In production, use FCM Topics
    const users = await this.prisma.user.findMany({
      where: { role: { name: dto.targetRole }, isActive: true },
      select: { id: true }
    });

    await Promise.all(
      users.map(u => 
        this.notificationsService.sendInAppNotification(u.id, 'Broadcast Message', dto.content, 'SYSTEM')
      )
    );

    return message;
  }
}
