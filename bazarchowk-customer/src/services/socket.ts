import { io, Socket } from 'socket.io-client';
import { TokenStorage } from '@/services/api';

class SocketService {
  private socket: Socket | null = null;
  private url = process.env.EXPO_PUBLIC_API_URL || 'https://bazarchowkapi.veritasco.tech';

  async connect() {
    if (this.socket?.connected) return;

    const token = await TokenStorage.getAccessToken();
    if (!token) return;

    // Use /realtime namespace
    this.socket = io(`${this.url}/realtime`, {
      auth: { token },
      transports: ['websocket'],
    });

    this.socket.on('connect', () => {
      console.log('Customer Socket connected:', this.socket?.id);
    });

    this.socket.on('disconnect', () => {
      console.log('Customer Socket disconnected');
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  on(event: string, callback: (data: any) => void) {
    this.socket?.on(event, callback);
  }

  off(event: string, callback?: (data: any) => void) {
    this.socket?.off(event, callback);
  }

  emit(event: string, data: any) {
    this.socket?.emit(event, data);
  }

  getSocket() {
    return this.socket;
  }
}

export const socketService = new SocketService();
