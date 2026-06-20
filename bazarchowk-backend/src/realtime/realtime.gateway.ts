import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/realtime',
})
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(RealtimeGateway.name);

  // Map of userId -> Set of socket IDs
  private connectedUsers: Map<string, Set<string>> = new Map();
  // Map of shopId -> Set of socket IDs
  private connectedShops: Map<string, Set<string>> = new Map();
  // Map of admin -> Set of socket IDs
  private connectedAdmins: Set<string> = new Set();

  constructor(private readonly jwtService: JwtService) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token || client.handshake.headers?.authorization?.split(' ')[1];
      if (!token) {
        throw new Error('No token provided');
      }

      const decoded = this.jwtService.verify(token);
      const userId = decoded.sub;
      const role = decoded.role;

      // Attach user info to socket
      (client as any).user = decoded;

      // Join standard user room
      client.join(`user_\${userId}`);
      
      // Store in connected users map
      if (!this.connectedUsers.has(userId)) {
        this.connectedUsers.set(userId, new Set());
      }
      this.connectedUsers.get(userId)?.add(client.id);

      // Join role specific rooms
      if (role === 'ADMIN' || role === 'SUPER_ADMIN') {
        client.join('admin_room');
        this.connectedAdmins.add(client.id);
      }

      if (role === 'SHOP_OWNER' && decoded.shopId) {
        client.join(`shop_\${decoded.shopId}`);
        if (!this.connectedShops.has(decoded.shopId)) {
          this.connectedShops.set(decoded.shopId, new Set());
        }
        this.connectedShops.get(decoded.shopId)?.add(client.id);
      }

      if (role === 'RIDER' || role === 'DELIVERY_PARTNER') {
        client.join(`rider_\${userId}`);
        client.join('riders_room');
      }

      this.logger.log(`Client connected: \${client.id} (User: \${userId}, Role: \${role})`);
    } catch (error) {
      this.logger.warn(`Connection rejected: \${client.id} - \${error.message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const user = (client as any).user;
    if (user) {
      const userId = user.sub;
      this.connectedUsers.get(userId)?.delete(client.id);
      if (this.connectedUsers.get(userId)?.size === 0) {
        this.connectedUsers.delete(userId);
      }

      if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') {
        this.connectedAdmins.delete(client.id);
      }

      if (user.role === 'SHOP_OWNER' && user.shopId) {
        this.connectedShops.get(user.shopId)?.delete(client.id);
        if (this.connectedShops.get(user.shopId)?.size === 0) {
          this.connectedShops.delete(user.shopId);
        }
      }
    }
    this.logger.log(`Client disconnected: \${client.id}`);
  }

  // --- API Methods for Services ---

  // Emits an event strictly to a specific user
  sendToUser(userId: string, event: string, payload: any) {
    this.server.to(`user_\${userId}`).emit(event, payload);
  }

  // Emits an event strictly to a specific shop owner's connected devices
  sendToShop(shopId: string, event: string, payload: any) {
    this.server.to(`shop_\${shopId}`).emit(event, payload);
  }

  // Emits an event to all connected admins
  sendToAdmins(event: string, payload: any) {
    this.server.to('admin_room').emit(event, payload);
  }

  // Emits an event to all riders
  sendToAllRiders(event: string, payload: any) {
    this.server.to('riders_room').emit(event, payload);
  }

  // For Rider GPS Tracking - Rider sends location directly via socket
  @SubscribeMessage('update_location')
  handleLocationUpdate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { orderId: string; latitude: number; longitude: number; heading?: number }
  ) {
    const user = (client as any).user;
    if (user?.role !== 'RIDER') return;

    // Broadcast location to the specific order tracking room
    // A customer tracks an order by joining the room 'track_order_{orderId}'
    this.server.to(`track_order_\${data.orderId}`).emit('rider_location', {
      riderId: user.sub,
      ...data,
      timestamp: new Date().toISOString()
    });
  }

  // Customer joins room to track a specific order
  @SubscribeMessage('join_tracking')
  handleJoinTracking(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { orderId: string }
  ) {
    client.join(`track_order_\${data.orderId}`);
    this.logger.log(`Client \${client.id} joined tracking for order \${data.orderId}`);
  }

  @SubscribeMessage('leave_tracking')
  handleLeaveTracking(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { orderId: string }
  ) {
    client.leave(`track_order_\${data.orderId}`);
  }
}
