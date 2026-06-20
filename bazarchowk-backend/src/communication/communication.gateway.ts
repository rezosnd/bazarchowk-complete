import { 
  WebSocketGateway, 
  SubscribeMessage, 
  MessageBody, 
  ConnectedSocket, 
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { CommunicationService } from './communication.service';
import { SendMessageDto } from './dto/communication.dto';
import { JwtService } from '@nestjs/jwt';

// In a real production setup, we would implement a WsJwtGuard 
// But here we'll assume basic token verification happens on connect
@WebSocketGateway({ cors: { origin: '*' }, namespace: '/chat' })
export class CommunicationGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(CommunicationGateway.name);

  // Map user ID to their active Socket IDs
  private activeUsers = new Map<string, Set<string>>();

  constructor(
    private readonly communicationService: CommunicationService,
    private readonly jwtService: JwtService
  ) {}

  handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token || client.handshake.headers?.authorization?.split(' ')[1];
      if (!token) throw new Error('No token provided');

      const decoded = this.jwtService.verify(token);
      const userId = decoded.sub;
      
      (client as any).user = decoded;

      if (!this.activeUsers.has(userId)) {
        this.activeUsers.set(userId, new Set());
      }
      this.activeUsers.get(userId)!.add(client.id);
      this.logger.log(`User ${userId} connected to chat (Socket: ${client.id})`);
    } catch (error) {
      this.logger.warn(`Chat connection rejected: ${client.id} - ${error.message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const user = (client as any).user;
    if (user && user.sub) {
      const userId = user.sub;
      if (this.activeUsers.has(userId)) {
        this.activeUsers.get(userId)!.delete(client.id);
        if (this.activeUsers.get(userId)!.size === 0) {
          this.activeUsers.delete(userId);
        }
        this.logger.log(`User ${userId} disconnected from chat`);
      }
    }
  }

  @SubscribeMessage('joinConversation')
  handleJoinConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody('conversationId') conversationId: string
  ) {
    client.join(`conversation_${conversationId}`);
    this.logger.log(`Socket ${client.id} joined conversation ${conversationId}`);
    return { status: 'joined', conversationId };
  }

  @SubscribeMessage('leaveConversation')
  handleLeaveConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody('conversationId') conversationId: string
  ) {
    client.leave(`conversation_${conversationId}`);
    return { status: 'left', conversationId };
  }

  @SubscribeMessage('sendMessage')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: SendMessageDto
  ) {
    const user = (client as any).user;
    if (!user || !user.sub) return { error: 'Unauthorized' };
    const userId = user.sub;

    try {
      // Save message to database
      const message = await this.communicationService.saveMessage(userId, payload);

      // Emit to everyone in the room
      this.server.to(`conversation_${payload.conversationId}`).emit('newMessage', message);
      
      return { status: 'sent', message };
    } catch (error) {
      this.logger.error(`Error sending message: ${error.message}`);
      return { error: error.message };
    }
  }

  @SubscribeMessage('typing')
  handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody('conversationId') conversationId: string
  ) {
    const user = (client as any).user;
    if (!user || !user.sub) return;
    // Broadcast typing event to room (excluding sender)
    client.to(`conversation_${conversationId}`).emit('userTyping', { userId: user.sub, conversationId });
  }
}
