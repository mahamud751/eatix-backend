import { Module } from '@nestjs/common';
import { MessagesService } from './message.service';
import { MessagesController } from './message.controller';
import { PrismaService } from 'src/prisma/prisma.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [MessagesController],
  providers: [PrismaService, MessagesService],
})
export class MessagesModule {}
