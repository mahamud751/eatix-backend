import { Injectable } from '@nestjs/common';
import { Server } from 'socket.io';

//
@Injectable()
export class SocketService {
  private server: Server;

  setServer(server: Server) {
    this.server = server;
  }

  emitNotification(userEmail: string, notification: any) {
    this.server.to(userEmail).emit('notification', notification);
  }
}
