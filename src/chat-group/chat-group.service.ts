import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { AddMembersDto } from './dto/add-members.dto';
import { SendGroupMessageDto } from './dto/send-message.dto';

@Injectable()
export class ChatGroupService {
  constructor(private prisma: PrismaService) {}

  async createGroup(createGroupDto: CreateGroupDto) {
    return this.prisma.chatGroup.create({
      data: {
        name: createGroupDto.name,
        description: createGroupDto.description,
        type: createGroupDto.type || 'department',
        createdBy: createGroupDto.createdBy,
        members: {
          create: {
            userId: createGroupDto.createdBy,
            role: 'admin',
          },
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                photos: true,
              },
            },
          },
        },
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  async getGroupById(groupId: string) {
    return this.prisma.chatGroup.findUnique({
      where: { id: groupId },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                photos: true,
                phone: true,
              },
            },
          },
        },
        messages: {
          include: {
            sender: {
              select: {
                id: true,
                name: true,
                email: true,
                photos: true,
              },
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  async addMember(addMemberDto: AddMemberDto) {
    const { groupId, userId, role } = addMemberDto;

    return this.prisma.groupMember.create({
      data: {
        groupId,
        userId,
        role: role || 'member',
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            photos: true,
          },
        },
        group: true,
      },
    });
  }

  // NEW METHOD: Add multiple members to an existing group
  async addMembersToGroup(
    groupId: string,
    userIds: string[],
    role: string = 'member',
  ) {
    // Check if group exists
    const group = await this.prisma.chatGroup.findUnique({
      where: { id: groupId },
    });

    if (!group) {
      throw new Error('Group not found');
    }

    // Check which users are already members to avoid duplicates
    const existingMembers = await this.prisma.groupMember.findMany({
      where: {
        groupId,
        userId: {
          in: userIds,
        },
      },
      select: {
        userId: true,
      },
    });

    const existingUserIds = new Set(existingMembers.map((m) => m.userId));

    // Filter out users who are already members
    const newUsers = userIds.filter((userId) => !existingUserIds.has(userId));

    if (newUsers.length === 0) {
      // All users are already members, return current members
      const currentMembers = await this.prisma.groupMember.findMany({
        where: { groupId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              photos: true,
            },
          },
        },
      });
      return currentMembers;
    }

    // Create new members in a transaction
    const memberCreates = newUsers.map((userId) => ({
      groupId,
      userId,
      role: role || 'member',
    }));

    const createdMembers = await this.prisma.$transaction(
      memberCreates.map((memberData) =>
        this.prisma.groupMember.create({
          data: memberData,
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                photos: true,
              },
            },
            group: true,
          },
        }),
      ),
    );

    // Return all current members (existing + newly created)
    const allMembers = await this.prisma.groupMember.findMany({
      where: { groupId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            photos: true,
          },
        },
      },
    });

    return allMembers;
  }

  async removeMember(groupId: string, userId: string) {
    return this.prisma.groupMember.delete({
      where: {
        groupId_userId: {
          groupId,
          userId,
        },
      },
    });
  }

  async sendGroupMessage(sendMessageDto: SendGroupMessageDto) {
    const { groupId, senderId, content, type, voiceUrl, duration } =
      sendMessageDto;

    return this.prisma.groupMessage.create({
      data: {
        groupId,
        senderId,
        content,
        type: type || 'text',
        voiceUrl: voiceUrl || null,
        duration: duration || null,
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
            photos: true,
          },
        },
        group: true,
      },
    });
  }

  async getGroupMessages(groupId: string) {
    return this.prisma.groupMessage.findMany({
      where: { groupId },
      select: {
        id: true,
        groupId: true,
        senderId: true,
        content: true,
        type: true,
        attachments: true,
        voiceUrl: true,
        duration: true,
        createdAt: true,
        updatedAt: true,
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
            photos: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  async getUserGroups(userId: string) {
    // Get all groups where user is a member
    const groups = await this.prisma.chatGroup.findMany({
      where: {
        members: {
          some: {
            userId: userId,
          },
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                photos: true,
              },
            },
          },
        },
        _count: {
          select: {
            messages: true,
          },
        },
      },
    });

    // Add last message for each group
    const groupsWithLastMessage = await Promise.all(
      groups.map(async (group) => {
        const lastMessage = await this.prisma.groupMessage.findFirst({
          where: { groupId: group.id },
          select: {
            id: true,
            groupId: true,
            senderId: true,
            content: true,
            type: true,
            attachments: true,
            voiceUrl: true,
            duration: true,
            createdAt: true,
            sender: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        });

        return {
          ...group,
          lastMessage,
        };
      }),
    );

    return groupsWithLastMessage;
  }

  // NEW: Get all groups for admin users
  async getAllGroups() {
    const groups = await this.prisma.chatGroup.findMany({
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                photos: true,
              },
            },
          },
        },
        _count: {
          select: {
            messages: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Add last message for each group
    const groupsWithLastMessage = await Promise.all(
      groups.map(async (group) => {
        const lastMessage = await this.prisma.groupMessage.findFirst({
          where: { groupId: group.id },
          select: {
            id: true,
            groupId: true,
            senderId: true,
            content: true,
            type: true,
            attachments: true,
            voiceUrl: true,
            duration: true,
            createdAt: true,
            sender: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        });

        return {
          ...group,
          lastMessage,
        };
      }),
    );

    return groupsWithLastMessage;
  }

  // NEW: Get groups for user with admin check
  async getGroupsForUser(userId: string) {
    // First, get the user to check if they're admin
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // If user is admin or superAdmin, return all groups
    if (user.role === 'admin' || user.role === 'superAdmin') {
      console.log(
        `[ChatGroupService] Admin user ${userId} - returning all groups`,
      );
      return this.getAllGroups();
    }

    // Otherwise, return only groups where user is a member
    console.log(
      `[ChatGroupService] Regular user ${userId} - returning member groups`,
    );
    return this.getUserGroups(userId);
  }

  async addMembersBulk(addMembersDto: AddMembersDto) {
    const { groupId, members } = addMembersDto;

    // Validate that groupId is provided
    if (!groupId) {
      throw new Error('groupId is required');
    }

    // First, check which users are already members to avoid duplicates
    const existingMembers = await this.prisma.groupMember.findMany({
      where: {
        groupId,
        userId: {
          in: members.map((m) => m.userId),
        },
      },
      select: {
        userId: true,
      },
    });

    const existingUserIds = new Set(existingMembers.map((m) => m.userId));

    // Filter out users who are already members
    const newMembers = members.filter(
      (member) => !existingUserIds.has(member.userId),
    );

    if (newMembers.length === 0) {
      // All users are already members
      const currentMembers = await this.prisma.groupMember.findMany({
        where: { groupId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              photos: true,
            },
          },
        },
      });
      return currentMembers;
    }

    // Create new members in a transaction
    const memberCreates = newMembers.map((member) => ({
      groupId,
      userId: member.userId,
      role: member.role || 'member',
    }));

    const createdMembers = await this.prisma.$transaction(
      memberCreates.map((memberData) =>
        this.prisma.groupMember.create({
          data: memberData,
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                photos: true,
              },
            },
            group: true,
          },
        }),
      ),
    );

    // Return all current members (existing + newly created)
    const allMembers = await this.prisma.groupMember.findMany({
      where: { groupId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            photos: true,
          },
        },
      },
    });

    return allMembers;
  }
}
