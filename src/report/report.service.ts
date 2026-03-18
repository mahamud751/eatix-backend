import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReportService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    contentType: 'video' | 'short';
    contentId: string;
    reporterId: string;
    reason: string;
    details?: string;
  }) {
    const { contentType, contentId, reporterId, reason, details } = data;
    if (!contentType || !contentId || !reason || !reporterId) {
      throw new BadRequestException(
        'contentType, contentId, reason, and authenticated user are required',
      );
    }
    const report = await this.prisma.contentReport.create({
      data: {
        contentType,
        contentId,
        reporterId,
        reason,
        details: details || null,
      },
    });
    return { message: 'Report submitted', id: report.id };
  }

  async listForAdmin(opts: { page?: number; limit?: number }) {
    const page = Math.max(1, opts.page ?? 1);
    const limit = Math.min(100, Math.max(1, opts.limit ?? 50));
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.contentReport.findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.contentReport.count(),
    ]);

    const reporterIds = [
      ...new Set(items.map((i) => i.reporterId).filter(Boolean)),
    ] as string[];
    const users =
      reporterIds.length > 0
        ? await this.prisma.user.findMany({
            where: { id: { in: reporterIds } },
            select: {
              id: true,
              name: true,
              nickname: true,
              email: true,
            },
          })
        : [];
    const userMap = new Map(users.map((u) => [u.id, u]));

    const videoIds = items
      .filter((i) => i.contentType === 'video')
      .map((i) => i.contentId);
    const shortIds = items
      .filter((i) => i.contentType === 'short')
      .map((i) => i.contentId);

    const [videos, shorts] = await Promise.all([
      videoIds.length
        ? this.prisma.video.findMany({
            where: { id: { in: videoIds } },
            select: { id: true, title: true },
          })
        : [],
      shortIds.length
        ? this.prisma.short.findMany({
            where: { id: { in: shortIds } },
            select: { id: true, title: true, description: true },
          })
        : [],
    ]);
    const videoMap = new Map(videos.map((v) => [v.id, v.title || '—']));
    const shortMap = new Map(
      shorts.map((s) => [
        s.id,
        s.title || (s.description ? s.description.slice(0, 60) : '—'),
      ]),
    );

    return {
      items: items.map((r) => ({
        id: r.id,
        contentType: r.contentType,
        contentId: r.contentId,
        contentTitle:
          r.contentType === 'video'
            ? videoMap.get(r.contentId) ?? '—'
            : shortMap.get(r.contentId) ?? '—',
        reason: r.reason,
        details: r.details,
        createdAt: r.createdAt,
        reporter: r.reporterId ? userMap.get(r.reporterId) ?? null : null,
      })),
      total,
      page,
      limit,
    };
  }
}
