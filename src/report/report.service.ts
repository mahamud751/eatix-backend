import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReportService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    contentType: 'video' | 'short';
    contentId: string;
    reporterId?: string;
    reason: string;
    details?: string;
  }) {
    const { contentType, contentId, reporterId, reason, details } = data;
    if (!contentType || !contentId || !reason) {
      throw new BadRequestException('contentType, contentId, and reason are required');
    }
    const report = await this.prisma.contentReport.create({
      data: {
        contentType,
        contentId,
        reporterId: reporterId || null,
        reason,
        details: details || null,
      },
    });
    return { message: 'Report submitted', id: report.id };
  }
}
