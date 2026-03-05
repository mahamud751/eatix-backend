// src/messages/messages.controller.ts
import { Controller, Post, Body, Get, Query, UseGuards } from '@nestjs/common';
import { MessagesService } from './message.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../users/dto/currentUser';

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

  @Get('conversations')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get conversation list for current user (owner sees who messaged)' })
  getConversations(@CurrentUser() user: { id: string }) {
    return this.messagesService.getConversations(user.id);
  }
}
