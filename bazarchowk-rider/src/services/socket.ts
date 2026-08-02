import { io, Socket } from 'socket.io-client';
import * as SecureStore from 'expo-secure-store';

class SocketService {
  private socket: Socket | null = null;
  private url = process.env.EXPO_PUBLIC_API_URL || 'https://bazarchowk-complete.vercel.app';

  async connect() {
    if (this.socket?.connected) return;

    const token = await SecureStore.getItemAsync('bazar_token');
    if (!token) return;

    this.socket = io(`${this.url}/realtime`, {
      auth: { token },
      transports: ['websocket'],
    });

    this.socket.on('connect', () => {
      console.log('Rider Socket connected:', this.socket?.id);
    });

    this.socket.on('disconnect', () => {
      console.log('Rider Socket disconnected');
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
