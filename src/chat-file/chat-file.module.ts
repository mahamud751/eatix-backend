import { Module } from '@nestjs/common';
import { ChatFileController } from './chat-file.controller';

@Module({
  controllers: [ChatFileController],
})
export class ChatFileModule {}
