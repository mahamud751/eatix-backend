import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { UpdateProjectStatusDto } from './dto/update-project-status.dto';

@Injectable()
export class ProjectService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createProjectDto: CreateProjectDto) {
    const {
      attachments = [],
      userId,
      businessId,
      clientName,
      projectName,
      taskTitle,
      description,
    } = createProjectDto;

    // Validate that user exists
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    return this.prisma.project.create({
      data: {
        userId,
        businessId: businessId || null,
        clientName: clientName || '',
        projectName,
        taskTitle,
        description: description || '',
        attachments: attachments as any,
      },
      include: {
        business: true,
      },
    });
  }

  async findAll(
    userId?: string,
    status?: string,
    page: number = 1,
    perPage: number = 10,
  ) {
    const skip = (page - 1) * perPage;
    const take = perPage;

    const where: any = {};
    if (userId) where.userId = userId;
    if (status) where.status = status;

    const [data, total] = await Promise.all([
      this.prisma.project.findMany({
        where,
        skip,
        take,
        include: {
          business: true,
          user: true, // Include user relation to get user name
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.prisma.project.count({ where }),
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
    const project = await this.prisma.project.findUnique({
      where: { id },
      include: {
        business: true,
        user: true, // Include user relation
      },
    });

    if (!project) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }

    return project;
  }

  async findByUser(userId: string) {
    return this.prisma.project.findMany({
      where: { userId },
      include: {
        business: true,
        user: true, // Include user relation
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findByBusiness(businessId: string) {
    return this.prisma.project.findMany({
      where: { businessId },
      include: {
        business: true,
        user: true, // Include user relation
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async update(id: string, updateProjectDto: UpdateProjectDto) {
    await this.findOne(id); // Check if exists

    const { attachments, ...data } = updateProjectDto;

    return this.prisma.project.update({
      where: { id },
      data: {
        ...data,
        ...(attachments && { attachments: attachments as any }),
      },
      include: {
        business: true,
      },
    });
  }

  async updateStatus(id: string, updateStatusDto: UpdateProjectStatusDto) {
    await this.findOne(id); // Check if exists

    return this.prisma.project.update({
      where: { id },
      data: {
        status: updateStatusDto.status as any,
      },
      include: {
        business: true,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id); // Check if exists

    return this.prisma.project.delete({
      where: { id },
    });
  }
}
