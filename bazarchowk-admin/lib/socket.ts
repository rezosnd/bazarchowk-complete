import { io, Socket } from 'socket.io-client';

class SocketService {
  private socket: Socket | null = null;
  private url = process.env.NEXT_PUBLIC_API_URL || 'https://bazarchowkapi.veritasco.tech';

  connect() {
    if (this.socket?.connected) return;

    // Admin assumes token is stored in localStorage
    const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;
    if (!token) return;

    this.socket = io(`${this.url}/realtime`, {
      auth: { token },
      transports: ['websocket'],
    });

    this.socket.on('connect', () => {
      console.log('Admin Socket connected:', this.socket?.id);
    });

    this.socket.on('disconnect', () => {
      console.log('Admin Socket disconnected');
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
