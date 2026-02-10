import { Module } from '@nestjs/common';
import { MessagesService } from './message.service';
import { MessagesController } from './message.controller';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  controllers: [MessagesController],
  providers: [PrismaService, MessagesService],
})
export class MessagesModule {}
