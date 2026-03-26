import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMessageDto } from './dto/create-message.dto';

@Injectable()
export class MessagesService {
  constructor(private prisma: PrismaService) {}

  async createMessage(data: CreateMessageDto) {
    return this.prisma.message.create({
      data,
    });
  }

  async getMessagesByUser(senderId: string, receiverId?: string) {
    // Get messages in BOTH directions for a conversation
    return this.prisma.message.findMany({
      where: {
        OR: [
          { senderId: senderId, receiverId: receiverId },
          { senderId: receiverId, receiverId: senderId },
        ],
      },
      select: {
        id: true,
        senderId: true,
        receiverId: true,
        content: true,
        // @ts-ignore: extended in Prisma schema
        type: true,
        // @ts-ignore: extended in Prisma schema
        voiceUrl: true,
        // @ts-ignore: extended in Prisma schema
        duration: true,
        attachments: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  /** Get list of conversations for a user (e.g. owner sees who messaged them). */
  async getConversations(userId: string) {
    const messages = await this.prisma.message.findMany({
      where: {
        OR: [{ senderId: userId }, { receiverId: userId }],
      },
      select: {
        id: true,
        senderId: true,
        receiverId: true,
        content: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const partnerMap = new Map<
      string,
      { lastMessage: string; lastMessageAt: Date }
    >();
    for (const m of messages) {
      const partnerId = m.senderId === userId ? m.receiverId : m.senderId;
      if (!partnerId || partnerMap.has(partnerId)) continue;
      partnerMap.set(partnerId, {
        lastMessage: m.content || '',
        lastMessageAt: m.createdAt,
      });
    }

    const partnerIds = Array.from(partnerMap.keys());
    if (partnerIds.length === 0) return [];

    const users = await this.prisma.user.findMany({
      where: { id: { in: partnerIds } },
      select: { id: true, name: true, email: true, photos: true },
    });
    const userMap = new Map(users.map((u) => [u.id, u]));

    return partnerIds.map((partnerId) => {
      const u = userMap.get(partnerId);
      const conv = partnerMap.get(partnerId)!;
      const photos = Array.isArray(u?.photos) ? (u?.photos as any[]) : [];
      const p0 = photos.length > 0 ? photos[0] : null;
      const partnerAvatar =
        typeof p0 === 'string'
          ? p0
          : p0 && typeof p0 === 'object' && 'src' in p0
            ? String((p0 as { src?: string }).src || '')
            : null;
      return {
        partnerId,
        partnerName: u?.name || u?.email || 'Unknown',
        partnerAvatar,
        lastMessage: conv.lastMessage,
        lastMessageAt: conv.lastMessageAt,
      };
    });
  }
}
