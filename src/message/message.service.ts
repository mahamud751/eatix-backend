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
}
