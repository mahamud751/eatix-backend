import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSponsoredDto } from './dto/create-sponsored.dto';
import { UpdateSponsoredDto } from './dto/update-sponsored.dto';

@Injectable()
export class SponsoredService {
  constructor(private readonly prisma: PrismaService) {}

  private haversineKm(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number,
  ): number {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /** Get active sponsored video for a location (used when user selects "Use my location") */
  async getByLocation(latitude: number, longitude: number) {
    const now = new Date();
    const all = await this.prisma.sponsoredVideo.findMany({
      where: {
        status: 'active',
        startDate: { lte: now },
        endDate: { gte: now },
      },
      include: {
        video: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                nickname: true,
                email: true,
                address: true,
                latitude: true,
                longitude: true,
                socialLinks: true,
              },
            },
            _count: { select: { likes: true, comments: true, views: true } },
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            nickname: true,
            email: true,
            address: true,
            latitude: true,
            longitude: true,
            socialLinks: true,
          },
        },
      },
    });
    const inRange = all.filter(
      (s) =>
        this.haversineKm(latitude, longitude, s.latitude, s.longitude) <=
        s.radiusKm,
    );
    // Return first match (one area one sponsored); or sort by amountPaid desc to show highest paid first
    const sorted = inRange.sort((a, b) => b.amountPaid - a.amountPaid);
    return { sponsored: sorted.length > 0 ? sorted[0] : null };
  }

  /** Create sponsored: admin selects an owner (sponsored is for that owner); owner creates for themselves */
  async create(creatorId: string, userRole: string, dto: CreateSponsoredDto) {
    const video = await this.prisma.video.findUnique({
      where: { id: dto.videoId },
    });
    if (!video) {
      throw new NotFoundException('Video not found');
    }
    let ownerId: string;
    let ownerProfile: { address: string | null; latitude: number | null; longitude: number | null } | null = null;
    if (userRole === 'admin' || userRole === 'superAdmin') {
      if (!dto.ownerId) {
        throw new BadRequestException('ownerId is required when admin creates sponsored (select the owner this campaign is for)');
      }
      const ownerUser = await this.prisma.user.findUnique({
        where: { id: dto.ownerId },
        select: { id: true, role: true, address: true, latitude: true, longitude: true },
      });
      if (!ownerUser || ownerUser.role !== 'owner') {
        throw new BadRequestException('ownerId must be a user with role "owner"');
      }
      // Admin may upload a new video (video owned by admin); sponsored is for ownerId so home shows owner
      ownerId = dto.ownerId;
      ownerProfile = { address: ownerUser.address ?? null, latitude: ownerUser.latitude ?? null, longitude: ownerUser.longitude ?? null };
    } else {
      if (video.userId !== creatorId) {
        throw new ForbiddenException('You can only sponsor your own videos');
      }
      ownerId = creatorId;
      const me = await this.prisma.user.findUnique({
        where: { id: creatorId },
        select: { address: true, latitude: true, longitude: true },
      });
      ownerProfile = me
        ? { address: me.address ?? null, latitude: me.latitude ?? null, longitude: me.longitude ?? null }
        : null;
    }
    const start = new Date(dto.startDate);
    const end = new Date(dto.endDate);
    if (end <= start) {
      throw new BadRequestException('endDate must be after startDate');
    }

    const finalLatitude = dto.latitude ?? ownerProfile?.latitude ?? undefined;
    const finalLongitude = dto.longitude ?? ownerProfile?.longitude ?? undefined;
    const finalAreaName =
      (dto.areaName && dto.areaName.trim()) ||
      (ownerProfile?.address && ownerProfile.address.trim()) ||
      'Owner location';

    if (finalLatitude == null || finalLongitude == null) {
      throw new BadRequestException(
        'Owner profile location missing (latitude/longitude). Please update owner address/location first, then create sponsored.',
      );
    }

    return this.prisma.sponsoredVideo.create({
      data: {
        videoId: dto.videoId,
        userId: ownerId,
        areaName: finalAreaName,
        latitude: finalLatitude,
        longitude: finalLongitude,
        radiusKm: dto.radiusKm ?? 2,
        startDate: start,
        endDate: end,
        amountPaid: dto.amountPaid,
        currency: dto.currency ?? 'BDT',
        status: 'active',
      },
      include: {
        video: {
          select: {
            id: true,
            title: true,
            thumbnailUrl: true,
            viewCount: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            nickname: true,
          },
        },
      },
    });
  }

  /** List sponsored: admin sees all, owner sees own */
  async findAll(userId: string, userRole: string) {
    const where =
      userRole === 'admin' || userRole === 'superAdmin'
        ? {}
        : { userId };
    const list = await this.prisma.sponsoredVideo.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        video: {
          select: {
            id: true,
            title: true,
            thumbnailUrl: true,
            viewCount: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            nickname: true,
          },
        },
      },
    });
    return { sponsored: list };
  }

  async findOne(id: string) {
    const s = await this.prisma.sponsoredVideo.findUnique({
      where: { id },
      include: {
        video: true,
        user: { select: { id: true, name: true, nickname: true } },
      },
    });
    if (!s) throw new NotFoundException('Sponsored campaign not found');
    return s;
  }

  async update(
    id: string,
    userId: string,
    userRole: string,
    dto: UpdateSponsoredDto,
  ) {
    const existing = await this.prisma.sponsoredVideo.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException('Sponsored campaign not found');
    if (userRole !== 'admin' && userRole !== 'superAdmin' && existing.userId !== userId) {
      throw new ForbiddenException('You can only update your own campaigns');
    }
    const data: any = { ...dto };
    if (dto.startDate) data.startDate = new Date(dto.startDate);
    if (dto.endDate) data.endDate = new Date(dto.endDate);
    return this.prisma.sponsoredVideo.update({
      where: { id },
      data,
      include: {
        video: { select: { id: true, title: true, thumbnailUrl: true } },
        user: { select: { id: true, name: true, nickname: true } },
      },
    });
  }

  async remove(id: string, userId: string, userRole: string) {
    const existing = await this.prisma.sponsoredVideo.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException('Sponsored campaign not found');
    if (userRole !== 'admin' && userRole !== 'superAdmin' && existing.userId !== userId) {
      throw new ForbiddenException('You can only delete your own campaigns');
    }
    await this.prisma.sponsoredVideo.update({
      where: { id },
      data: { status: 'cancelled' },
    });
    return { message: 'Sponsored campaign cancelled' };
  }
}
