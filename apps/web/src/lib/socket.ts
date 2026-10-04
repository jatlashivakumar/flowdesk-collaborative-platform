import { io, Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents } from '@flowdesk/shared-types';

type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;
let socket: TypedSocket | null = null;

export function getSocket(): TypedSocket {
  if (!socket) throw new Error('Socket not connected');
  return socket;
}

export function connectSocket(token: string): TypedSocket {
  if (socket?.connected) return socket;
  socket = io(window.location.origin, {
    auth: { token },
    transports: ['websocket'],
    reconnection: true,
    reconnectionDelay: 1000,
  }) as TypedSocket;
  socket.on('connect', () => console.log('[Socket] Connected', socket!.id));
  socket.on('disconnect', (r) => console.log('[Socket] Disconnected', r));
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}
