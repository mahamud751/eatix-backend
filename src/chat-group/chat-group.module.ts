import { Module } from '@nestjs/common';
import { ChatGroupService } from './chat-group.service';
import { ChatGroupController } from './chat-group.controller';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [ChatGroupController],
  providers: [ChatGroupService, PrismaService],
  exports: [ChatGroupService],
})
export class ChatGroupModule {}
