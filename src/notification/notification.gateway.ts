import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Inject, forwardRef, Logger } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { CreateNotificationDto } from './dto/create-notification.dto';

@WebSocketGateway({
  namespace: '/notification',
  cors: {
    origin: '*',
    credentials: true,
  },
})
export class NotificationGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private logger = new Logger('NotificationGateway');

  constructor(
    @Inject(forwardRef(() => NotificationService))
    private readonly notificationService: NotificationService,
  ) {}

  handleConnection(client: Socket) {
    const userId = client.handshake.query.userId as string;
    const role = client.handshake.query.role as string;
    const companyId = client.handshake.query.companyId as string;
    const assignId = client.handshake.query.assignId as string;

    this.logger.log(
      `Client connected to NotificationGateway: ${client.id}, userId: ${userId}, role: ${role}`,
    );

    if (userId) client.join(`user:${userId}`);
    if (role) client.join(`role:${role}`);
    if (companyId) client.join(`company:${companyId}`);
    if (assignId) client.join(`assignId:${assignId}`);

    // CM always joins cm room
    if (role === 'cm' || role === 'admin' || role === 'superAdmin') {
      client.join('role:cm');
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(
      `Client disconnected from NotificationGateway: ${client.id}`,
    );
  }

  @SubscribeMessage('createNotification')
  async handleCreateNotification(
    @MessageBody() createNotificationDto: CreateNotificationDto,
  ) {
    const notification = await this.notificationService.createNotification(
      createNotificationDto,
    );
    return notification;
  }

  emitNotification(notification: any) {
    // 1. Emit to CMs (who see everything)
    this.server.to('role:cm').emit('notification', notification);

    // 2. Emit to targeted User/Client
    if (notification.userId) {
      this.server
        .to(`user:${notification.userId}`)
        .emit('notification', notification);
    }

    if (notification.clientId) {
      this.server
        .to(`user:${notification.clientId}`)
        .emit('notification', notification);
    }

    if (notification.userEmail) {
      // If we only have email, we might need to join users to email rooms too
      this.server
        .to(`email:${notification.userEmail}`)
        .emit('notification', notification);
    }

    // 3. Emit to targeted Company (User/Client)
    if (notification.companyId) {
      this.server
        .to(`company:${notification.companyId}`)
        .emit('notification', notification);
    }

    // 4. Emit to targeted Employee (assignId)
    if (notification.assignId) {
      this.server
        .to(`assignId:${notification.assignId}`)
        .emit('notification', notification);
    }

    // Broad emission if no target specified (or keep it targeted)
    if (
      !notification.userId &&
      !notification.clientId &&
      !notification.companyId &&
      !notification.assignId &&
      !notification.userEmail
    ) {
      this.server.emit('notification', notification);
    }
  }
}
