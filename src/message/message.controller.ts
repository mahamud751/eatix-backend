// src/messages/messages.controller.ts
import { Controller, Post, Body, Get, Query } from '@nestjs/common';
import { MessagesService } from './message.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Messages')
@Controller('messages')
export class MessagesController {
  constructor(private messagesService: MessagesService) {}

  @Post()
  @ApiOperation({ summary: 'Send a new message' })
  createMessage(@Body() createMessageDto: CreateMessageDto) {
    return this.messagesService.createMessage(createMessageDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get messages between users' })
  getMessages(
    @Query('senderId') senderId: string,
    @Query('receiverId') receiverId: string,
  ) {
    return this.messagesService.getMessagesByUser(senderId, receiverId);
  }
}
