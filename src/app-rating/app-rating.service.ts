import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpsertAppRatingDto } from './dto/upsert-app-rating.dto';

@Injectable()
export class AppRatingService {
  constructor(private readonly prisma: PrismaService) {}

  async upsertMyRating(userId: string, dto: UpsertAppRatingDto) {
    return this.prisma.appRating.upsert({
      where: { userId },
      update: {
        rating: dto.rating,
        comment: dto.comment != null && String(dto.comment).trim() ? String(dto.comment).trim() : null,
      },
      create: {
        userId,
        rating: dto.rating,
        comment: dto.comment != null && String(dto.comment).trim() ? String(dto.comment).trim() : null,
      },
    });
  }

  async getMyRating(userId: string) {
    return this.prisma.appRating.findUnique({ where: { userId } });
  }

  async deleteMyRating(userId: string) {
    const existing = await this.prisma.appRating.findUnique({ where: { userId } });
    if (!existing) throw new NotFoundException('Rating not found');
    await this.prisma.appRating.delete({ where: { userId } });
    return { deleted: true };
  }

  async listAll(page = 1, perPage = 50) {
    const skip = (page - 1) * perPage;
    const [items, total] = await Promise.all([
      this.prisma.appRating.findMany({
        skip,
        take: perPage,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { id: true, name: true, nickname: true, email: true, role: true } } },
      }),
      this.prisma.appRating.count(),
    ]);
    return { items, total, page, perPage };
  }

  async deleteById(id: string) {
    const existing = await this.prisma.appRating.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Rating not found');
    await this.prisma.appRating.delete({ where: { id } });
    return { deleted: true };
  }
}
