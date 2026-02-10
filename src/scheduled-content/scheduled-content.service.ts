import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateScheduledContentDto,
  UpdateScheduledContentDto,
} from './dto/scheduled-content.dto';

@Injectable()
export class ScheduledContentService {
  constructor(private prisma: PrismaService) {}

  // Create a new scheduled content
  async create(data: CreateScheduledContentDto) {
    const {
      userId,
      companyId,
      companyName,
      contentId,
      contentTitle,
      scheduledDate,
      scheduledTime,
      platforms,
      status = 'scheduled',
      metadata,
    } = data;

    const scheduledContent = await this.prisma.scheduledContent.create({
      data: {
        userId,
        companyId,
        companyName,
        contentId,
        contentTitle,
        scheduledDate: new Date(scheduledDate),
        scheduledTime,
        platforms,
        status,
        metadata: metadata || {},
      },
    });

    return scheduledContent;
  }

  // Get all scheduled content
  async findAll() {
    return this.prisma.scheduledContent.findMany({
      orderBy: { scheduledDate: 'asc' },
    });
  }

  // Get scheduled content by user ID
  async findByUserId(userId: string) {
    return this.prisma.scheduledContent.findMany({
      where: { userId },
      orderBy: { scheduledDate: 'asc' },
    });
  }

  // Get scheduled content by company ID
  async findByCompanyId(companyId: string) {
    return this.prisma.scheduledContent.findMany({
      where: { companyId },
      orderBy: { scheduledDate: 'asc' },
    });
  }

  // Get scheduled content by status
  async findByStatus(status: string) {
    return this.prisma.scheduledContent.findMany({
      where: { status },
      orderBy: { scheduledDate: 'asc' },
    });
  }

  // Get one scheduled content by ID
  async findOne(id: string) {
    const scheduledContent = await this.prisma.scheduledContent.findUnique({
      where: { id },
    });

    if (!scheduledContent) {
      throw new NotFoundException(`Scheduled content with ID ${id} not found`);
    }

    return scheduledContent;
  }

  // Update scheduled content
  async update(id: string, data: UpdateScheduledContentDto) {
    // Check if exists
    await this.findOne(id);

    // Convert date if provided
    const updateData: any = { ...data };
    if (data.scheduledDate) {
      updateData.scheduledDate = new Date(data.scheduledDate);
    }
    if (data.postedAt) {
      updateData.postedAt = new Date(data.postedAt);
    }

    const updated = await this.prisma.scheduledContent.update({
      where: { id },
      data: updateData,
    });

    return updated;
  }

  // Delete scheduled content
  async remove(id: string) {
    // Check if exists
    await this.findOne(id);

    await this.prisma.scheduledContent.delete({
      where: { id },
    });

    return { message: 'Scheduled content deleted successfully' };
  }

  // Get statistics
  async getStats(userId?: string) {
    const where = userId ? { userId } : {};

    const [total, scheduled, posted, failed, cancelled] = await Promise.all([
      this.prisma.scheduledContent.count({ where }),
      this.prisma.scheduledContent.count({
        where: { ...where, status: 'scheduled' },
      }),
      this.prisma.scheduledContent.count({
        where: { ...where, status: 'posted' },
      }),
      this.prisma.scheduledContent.count({
        where: { ...where, status: 'failed' },
      }),
      this.prisma.scheduledContent.count({
        where: { ...where, status: 'cancelled' },
      }),
    ]);

    return {
      total,
      scheduled,
      posted,
      failed,
      cancelled,
    };
  }

  // Get upcoming scheduled content (next 7 days)
  async getUpcoming(userId?: string) {
    const now = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(now.getDate() + 7);

    const where: any = {
      scheduledDate: {
        gte: now,
        lte: nextWeek,
      },
      status: 'scheduled',
    };

    if (userId) {
      where.userId = userId;
    }

    return this.prisma.scheduledContent.findMany({
      where,
      orderBy: { scheduledDate: 'asc' },
    });
  }
}
