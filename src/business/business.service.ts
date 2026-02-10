import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBusinessDto } from './dto/create-business.dto';
import { UpdateBusinessDto } from './dto/update-business.dto';
import { UpdateBusinessStatusDto } from './dto/update-business-status.dto';

@Injectable()
export class BusinessService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createBusinessDto: CreateBusinessDto) {
    const { attachments = [], ...data } = createBusinessDto;

    return this.prisma.business.create({
      data: {
        ...data,
        attachments: attachments as any,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        projects: true,
      },
    });
  }

  async findAll(
    userId?: string,
    createdBy?: string,
    status?: string,
    page: number = 1,
    perPage: number = 10,
  ) {
    const skip = (page - 1) * perPage;
    const take = perPage;

    const where: any = {};
    if (userId) where.userId = userId;
    if (createdBy) where.createdBy = createdBy;
    if (status) where.status = status;

    const [data, total] = await Promise.all([
      this.prisma.business.findMany({
        where,
        skip,
        take,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
          creator: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
          projects: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.prisma.business.count({ where }),
    ]);

    return {
      data,
      pagination: {
        total,
        page,
        perPage,
        totalPages: Math.ceil(total / perPage),
      },
    };
  }

  async findOne(id: string) {
    const business = await this.prisma.business.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        projects: true,
      },
    });

    if (!business) {
      throw new NotFoundException(`Business with ID ${id} not found`);
    }

    return business;
  }

  async findByUser(userId: string) {
    return this.prisma.business.findMany({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        projects: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async update(id: string, updateBusinessDto: UpdateBusinessDto) {
    await this.findOne(id); // Check if exists

    const { attachments, ...data } = updateBusinessDto;

    return this.prisma.business.update({
      where: { id },
      data: {
        ...data,
        ...(attachments && { attachments: attachments as any }),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        projects: true,
      },
    });
  }

  async updateStatus(id: string, updateStatusDto: UpdateBusinessStatusDto) {
    await this.findOne(id); // Check if exists

    return this.prisma.business.update({
      where: { id },
      data: {
        status: updateStatusDto.status as any,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        projects: true,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id); // Check if exists

    return this.prisma.business.delete({
      where: { id },
    });
  }
}
