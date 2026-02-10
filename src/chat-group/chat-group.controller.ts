import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { ChatGroupService } from './chat-group.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { AddMembersDto } from './dto/add-members.dto';
import { AddMembersToGroupDto } from './dto/add-members-to-group.dto';
import { SendGroupMessageDto } from './dto/send-message.dto';

@Controller('chat-groups')
export class ChatGroupController {
  constructor(private readonly chatGroupService: ChatGroupService) {}

  @Post()
  create(@Body() createGroupDto: CreateGroupDto) {
    return this.chatGroupService.createGroup(createGroupDto);
  }

  @Get()
  findAll(@Query('userId') userId: string) {
    if (userId) {
      return this.chatGroupService.getGroupsForUser(userId);
    }
    // If no userId provided, return empty array or handle appropriately
    return [];
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.chatGroupService.getGroupById(id);
  }

  @Post(':id/members')
  addMember(@Body() addMemberDto: AddMemberDto) {
    return this.chatGroupService.addMember(addMemberDto);
  }

  @Post(':id/members/bulk')
  addMembers(
    @Param('id') groupId: string,
    @Body() addMembersDto: AddMembersDto,
  ) {
    // Add groupId from URL parameter to the DTO
    const fullDto = {
      ...addMembersDto,
      groupId,
    };
    return this.chatGroupService.addMembersBulk(fullDto);
  }

  @Post(':id/members/add')
  addMembersToGroup(
    @Param('id') groupId: string,
    @Body() addMembersToGroupDto: AddMembersToGroupDto,
  ) {
    return this.chatGroupService.addMembersToGroup(
      groupId,
      addMembersToGroupDto.userIds,
      addMembersToGroupDto.role || 'member',
    );
  }

  @Delete(':id/members/:userId')
  removeMember(@Param('id') groupId: string, @Param('userId') userId: string) {
    return this.chatGroupService.removeMember(groupId, userId);
  }

  @Post(':id/messages')
  sendMessage(@Body() sendMessageDto: SendGroupMessageDto) {
    return this.chatGroupService.sendGroupMessage(sendMessageDto);
  }

  @Get(':id/messages')
  getMessages(@Param('id') id: string) {
    return this.chatGroupService.getGroupMessages(id);
  }
}
