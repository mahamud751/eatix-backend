import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
@WebSocketGateway({
  cors: {
    origin: '*', // Configure this to your frontend URL in production
    credentials: true,
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private logger = new Logger('ChatGateway');
  private connectedUsers = new Map<string, string>(); // userId -> socketId
  private userGroups = new Map<string, Set<string>>(); // userId -> Set<groupId>

  constructor(private prisma: PrismaService) {}

  /** Normalize user ID so DM call lookup always matches (e.g. lowercase UUID) */
  private normalizeUserId(id: string | undefined): string {
    return String(id ?? '')
      .trim()
      .toLowerCase();
  }

  handleConnection(client: Socket) {
    const rawUserId = client.handshake.query.userId as string;
    const userId = this.normalizeUserId(rawUserId);
    this.logger.log(`Client connected: ${client.id}, userId: ${userId}`);

    if (userId) {
      this.connectedUsers.set(userId, client.id);
      // Notify others about this user coming online
      this.server.emit('user_status', {
        userId,
        status: 'online',
      });

      // Join user to their group rooms
      this.joinUserToGroups(userId, client);
    }
  }

  handleDisconnect(client: Socket) {
    const rawUserId = client.handshake.query.userId as string;
    const userId = this.normalizeUserId(rawUserId);
    this.logger.log(`Client disconnected: ${client.id}, userId: ${userId}`);

    if (userId) {
      this.connectedUsers.delete(userId);
      // Notify others about this user going offline
      this.server.emit('user_status', {
        userId,
        status: 'offline',
      });
    }
  }

  @SubscribeMessage('send_message')
  async handleMessage(
    @MessageBody()
    data: {
      to: string;
      message: string;
      from: string;
      timestamp: number;
      attachments?: string[];
      type?: string;
      voiceUrl?: string;
      duration?: number;
    },
    @ConnectedSocket() client: Socket,
  ) {
    this.logger.log(`Message from ${data.from} to ${data.to}: ${data.message}`);

    try {
      // Store message in database (always, for history)
      await this.prisma.message.create({
        data: {
          senderId: data.from.toString(),
          receiverId: data.to.toString(),
          content: data.message,
          type: data.type || 'text',
          voiceUrl: data.voiceUrl || null,
          duration: data.duration || null,
          attachments: data.attachments ? (data.attachments as any) : [],
          createdAt: new Date(data.timestamp),
        },
      });

      // Get recipient's socket ID
      const recipientSocketId = this.connectedUsers.get(data.to);

      if (recipientSocketId) {
        // User is online - deliver immediately
        this.server.to(recipientSocketId).emit('message', {
          from: data.from,
          message: data.message,
          type: data.type || 'text',
          voiceUrl: data.voiceUrl,
          duration: data.duration,
          attachments: data.attachments || [],
          timestamp: data.timestamp,
        });
        this.logger.log(`Message delivered to online user ${data.to}`);
      } else {
        // User is offline - message already saved to database
        this.logger.log(
          `User ${data.to} is offline. Message saved to database.`,
        );
      }

      // Always return success since message is saved
      return { success: true, stored: true };
    } catch (error) {
      this.logger.error('Error handling message:', error);
      return { success: false, error: 'Failed to save message' };
    }
  }

  @SubscribeMessage('typing')
  handleTyping(
    @MessageBody() data: { to: string; from: string },
    @ConnectedSocket() client: Socket,
  ) {
    const recipientSocketId = this.connectedUsers.get(data.to);

    if (recipientSocketId) {
      this.server.to(recipientSocketId).emit('typing', {
        userId: data.from,
      });
    }
  }

  @SubscribeMessage('send_group_message')
  async handleGroupMessage(
    @MessageBody()
    data: {
      groupId: string;
      message: string;
      from: string;
      timestamp: number;
      type: string;
      attachments?: string[];
      voiceUrl?: string;
      duration?: number;
    },
    @ConnectedSocket() client: Socket,
  ) {
    this.logger.log(
      `Group message from ${data.from} to group ${data.groupId}: ${data.message}`,
    );

    try {
      // Store group message in database (always, for history)
      await this.prisma.groupMessage.create({
        data: {
          groupId: data.groupId,
          senderId: data.from,
          content: data.message,
          type: data.type || 'text',
          attachments: data.attachments ? (data.attachments as any) : [],
          voiceUrl: data.voiceUrl || null,
          duration: data.duration || null,
          createdAt: new Date(data.timestamp),
        },
      });

      // Broadcast to all group members
      this.server.to(`group:${data.groupId}`).emit('group_message', {
        groupId: data.groupId,
        from: data.from,
        message: data.message,
        type: data.type || 'text',
        attachments: data.attachments || [],
        voiceUrl: data.voiceUrl,
        duration: data.duration,
        timestamp: data.timestamp,
      });

      this.logger.log(
        `Group message saved to database and broadcasted to group ${data.groupId}`,
      );
      return { success: true, stored: true };
    } catch (error) {
      this.logger.error('Error handling group message:', error);
      // Even if database save fails, still broadcast the message
      this.server.to(`group:${data.groupId}`).emit('group_message', {
        groupId: data.groupId,
        from: data.from,
        message: data.message,
        type: data.type || 'text',
        attachments: data.attachments || [],
        voiceUrl: data.voiceUrl,
        duration: data.duration,
        timestamp: data.timestamp,
      });
      return {
        success: true,
        stored: false,
        error: 'Message broadcasted but not saved to database',
      };
    }
  }

  @SubscribeMessage('join_group')
  handleJoinGroup(
    @MessageBody() data: { groupId: string; userId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { groupId, userId } = data;

    // Add user to group
    client.join(`group:${groupId}`);

    // Track user's groups
    if (!this.userGroups.has(userId)) {
      this.userGroups.set(userId, new Set());
    }
    this.userGroups.get(userId).add(groupId);

    this.logger.log(`User ${userId} joined group ${groupId}`);
    return { success: true };
  }

  @SubscribeMessage('leave_group')
  handleLeaveGroup(
    @MessageBody() data: { groupId: string; userId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { groupId, userId } = data;

    // Remove user from group
    client.leave(`group:${groupId}`);

    // Remove from user's group tracking
    if (this.userGroups.has(userId)) {
      this.userGroups.get(userId).delete(groupId);
    }

    this.logger.log(`User ${userId} left group ${groupId}`);
    return { success: true };
  }

  /** Call invite: notify target user(s) about incoming call (DM or group) */
  @SubscribeMessage('call_invite')
  async handleCallInvite(
    @MessageBody()
    data: {
      callType: 'audio' | 'video';
      channelName: string;
      callerId: string;
      callerName: string;
      targetType: 'dm' | 'group';
      targetUserId?: string;
      groupId?: string;
      groupName?: string;
    },
    @ConnectedSocket() client: Socket,
  ) {
    if (data.targetType === 'dm' && data.targetUserId) {
      const targetKey = this.normalizeUserId(data.targetUserId);
      const recipientSocketId = this.connectedUsers.get(targetKey);
      if (recipientSocketId) {
        const channelName =
          typeof data.channelName === 'string'
            ? data.channelName.trim()
            : data.channelName;
        this.server.to(recipientSocketId).emit('incoming_call', {
          callType: data.callType,
          channelName: channelName || undefined,
          callerId: data.callerId,
          callerName: data.callerName,
          targetType: 'dm',
          targetUserId: data.targetUserId,
        });
        this.logger.log(
          `Call invite (${data.callType}) DM from ${data.callerId} to ${data.targetUserId} channel: ${channelName ?? '(none)'}`,
        );
      } else {
        this.logger.warn(
          `DM call: no socket for targetUserId ${data.targetUserId} (key: ${targetKey}), connected: ${Array.from(this.connectedUsers.keys()).join(', ')}`,
        );
      }
    } else if (data.targetType === 'group' && data.groupId) {
      const payload = {
        callType: data.callType,
        channelName: data.channelName,
        callerId: data.callerId,
        callerName: data.callerName,
        targetType: 'group' as const,
        groupId: data.groupId,
        groupName: data.groupName || undefined,
      };
      try {
        const members = await this.prisma.groupMember.findMany({
          where: { groupId: data.groupId },
          select: { userId: true },
        });
        const userIds = members
          .map((m) => m.userId)
          .filter((id) => id !== data.callerId);
        for (const uid of userIds) {
          const key = this.normalizeUserId(uid);
          const socketId = this.connectedUsers.get(key);
          if (socketId) {
            this.server.to(socketId).emit('incoming_call', payload);
          }
        }
      } catch (e) {
        this.logger.warn(
          `Group members lookup failed, falling back to room: ${e}`,
        );
        this.server.to(`group:${data.groupId}`).emit('incoming_call', payload);
      }
      this.logger.log(
        `Group call invite (${data.callType}) from ${data.callerId} to group ${data.groupId}`,
      );
    }
    return { success: true };
  }

  /** Callee rejected the call – notify caller */
  @SubscribeMessage('call_reject')
  handleCallReject(
    @MessageBody()
    data: {
      channelName: string;
      fromUserId: string;
      toUserId?: string;
      groupId?: string;
    },
    @ConnectedSocket() client: Socket,
  ) {
    if (data.toUserId) {
      const callerKey = this.normalizeUserId(data.toUserId);
      const callerSocketId = this.connectedUsers.get(callerKey);
      if (callerSocketId) {
        this.server.to(callerSocketId).emit('call_rejected', {
          channelName: data.channelName,
          fromUserId: data.fromUserId,
        });
      }
    }
    return { success: true };
  }

  /** Callee accepted – notify caller (use normalized userId so DM lookup matches) */
  @SubscribeMessage('call_accept')
  handleCallAccept(
    @MessageBody()
    data: {
      channelName: string;
      fromUserId: string;
      toUserId?: string;
      groupId?: string;
    },
    @ConnectedSocket() client: Socket,
  ) {
    if (data.toUserId) {
      const callerKey = this.normalizeUserId(data.toUserId);
      const callerSocketId = this.connectedUsers.get(callerKey);
      if (callerSocketId) {
        this.server.to(callerSocketId).emit('call_accepted', {
          channelName: data.channelName,
          fromUserId: data.fromUserId,
        });
      }
    }
    return { success: true };
  }

  /** DM call: one peer joined Agora channel and sends their Agora UID so the other peer can add them (fallback when onUserJoined doesn't fire on emulators) */
  @SubscribeMessage('dm_agora_uid')
  handleDmAgoraUid(
    @MessageBody()
    data: {
      channelName: string;
      agoraUid: number;
      myUserId: string;
      targetUserId: string;
    },
  ) {
    if (!data?.targetUserId || data.agoraUid == null) return { success: true };
    const targetKey = this.normalizeUserId(data.targetUserId);
    const recipientSocketId = this.connectedUsers.get(targetKey);
    if (recipientSocketId) {
      this.server.to(recipientSocketId).emit('dm_peer_agora_uid', {
        channelName:
          typeof data.channelName === 'string'
            ? data.channelName.trim()
            : data.channelName,
        agoraUid: Number(data.agoraUid),
      });
    }
    return { success: true };
  }

  private async joinUserToGroups(userId: string, client: Socket) {
    try {
      // This will work after Prisma migration is run
      // const userGroups = await this.prisma.groupMember.findMany({
      //   where: { userId },
      //   include: { group: true }
      // });

      // For now, we'll handle this client-side
      // In the future, when the database is updated, we can uncomment above
      this.logger.log(
        `User ${userId} groups will be joined after database migration`,
      );
    } catch (error) {
      this.logger.error(`Error joining user ${userId} to groups:`, error);
    }
  }
}
