import { Server } from 'socket.io';
import { Http2Server } from 'http2';

let io: Server | null = null;

export function initSocket(server: Http2Server): Server {
  if (io) return io;
  
  const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:3000';
  io = new Server(server, {
    path: '/api/socket.io',
    cors: {
      origin: corsOrigin,
      credentials: true,
      methods: ['GET', 'POST'],
    },
  });
  
  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    socket.on('join', ({ businessId }: { businessId: string }) => {
      joinBusinessRoom(socket, businessId);
      console.log(`Socket ${socket.id} joined business:${businessId}`);
    });
  });
  
  return io;
}

export function getIO(): Server | null {
  return io;
}

export function joinBusinessRoom(socket: any, businessId: string): void {
  socket.join(`business:${businessId}`);
}

export function emitToBusinessRoom(businessId: string, event: string, data: any): void {
  if (io) {
    io.to(`business:${businessId}`).emit(event, data);
  }
}
