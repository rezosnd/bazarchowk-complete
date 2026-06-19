import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { RealtimeService } from './realtime.service';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: 'bazar-chowk',
})
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(RealtimeGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly realtimeService: RealtimeService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth.token || client.handshake.headers['authorization']?.split(' ')[1];
      if (!token) throw new Error('No token provided');

      const payload = this.jwtService.verify(token, { secret: process.env.JWT_SECRET });
      client.data.user = payload; // Attach user info to socket
      this.logger.log(`Client connected: \${client.id} (User: \${payload.id})`);
    } catch (error) {
      this.logger.warn(`Connection unauthorized: \${client.id}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: \${client.id}`);
  }

  @SubscribeMessage('joinOrderRoom')
  handleJoinOrderRoom(@ConnectedSocket() client: Socket, @MessageBody() orderId: string) {
    // Customers and Riders join a specific room for an order to listen/emit updates
    client.join(`order_\${orderId}`);
    this.logger.log(`User \${client.data.user.id} joined room order_\${orderId}`);
    return { event: 'joinedRoom', data: orderId };
  }

  @SubscribeMessage('leaveOrderRoom')
  handleLeaveOrderRoom(@ConnectedSocket() client: Socket, @MessageBody() orderId: string) {
    client.leave(`order_\${orderId}`);
    return { event: 'leftRoom', data: orderId };
  }

  @SubscribeMessage('updateRiderLocation')
  async handleUpdateLocation(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { orderId: string; latitude: number; longitude: number; heading?: number; speed?: number },
  ) {
    const userId = client.data.user.id;

    // Save to Database
    await this.realtimeService.saveTrackingPoint(
      payload.orderId,
      userId, // Assuming the emitting user is the rider
      payload.latitude,
      payload.longitude,
      payload.heading,
      payload.speed
    );

    // Broadcast to everyone else in the room (e.g. the Customer)
    client.to(`order_\${payload.orderId}`).emit('riderLocationUpdated', {
      orderId: payload.orderId,
      latitude: payload.latitude,
      longitude: payload.longitude,
      heading: payload.heading,
      speed: payload.speed,
      timestamp: new Date().toISOString(),
    });
  }

  // A method that can be called by OrdersService when status changes
  broadcastOrderStatus(orderId: string, status: string) {
    this.server.to(`order_\${orderId}`).emit('orderStatusUpdated', {
      orderId,
      status,
      timestamp: new Date().toISOString(),
    });
  }
}
