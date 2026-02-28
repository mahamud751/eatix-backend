import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVendorSponsoredDto } from './dto/create-vendor-sponsored.dto';
import { UpdateVendorSponsoredDto } from './dto/update-vendor-sponsored.dto';

@Injectable()
export class VendorSponsoredService {
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

  async getByLocation(latitude: number, longitude: number) {
    const now = new Date();
    const all = await this.prisma.vendorSponsoredVideo.findMany({
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
            role: true,
          },
        },
      },
    });
    const inRange = all.filter(
      (s) =>
        this.haversineKm(latitude, longitude, s.latitude, s.longitude) <=
        s.radiusKm,
    );
    const sorted = inRange.sort((a, b) => b.amountPaid - a.amountPaid);
    const result = sorted.length > 0 ? sorted[0] : null;
    return { sponsored: result };
  }

  async create(creatorId: string, userRole: string, dto: CreateVendorSponsoredDto) {
    if (userRole !== 'admin' && userRole !== 'superAdmin') {
      throw new ForbiddenException('Only admin can create vendor sponsored campaigns');
    }
    const video = await this.prisma.video.findUnique({
      where: { id: dto.videoId },
    });
    if (!video) throw new NotFoundException('Video not found');
    const vendorUser = await this.prisma.user.findUnique({
      where: { id: dto.userId },
      select: { id: true, role: true },
    });
    if (!vendorUser) throw new NotFoundException('User not found');
    const role = (vendorUser.role || '').toLowerCase();
    if (role !== 'vendor') {
      throw new BadRequestException('User must have role "vendor"');
    }

    const start = new Date(dto.startDate);
    const end = new Date(dto.endDate);
    if (end <= start) {
      throw new BadRequestException('endDate must be after startDate');
    }

    return this.prisma.vendorSponsoredVideo.create({
      data: {
        videoId: dto.videoId,
        userId: dto.userId,
        areaName: dto.areaName.trim(),
        latitude: dto.latitude,
        longitude: dto.longitude,
        radiusKm: dto.radiusKm ?? 2,
        startDate: start,
        endDate: end,
        amountPaid: dto.amountPaid,
        currency: dto.currency ?? 'BDT',
        status: 'active',
      },
      include: {
        video: {
          select: { id: true, title: true, thumbnailUrl: true, viewCount: true },
        },
        user: {
          select: { id: true, name: true, nickname: true, email: true },
        },
      },
    });
  }

  async findAll(creatorId: string, userRole: string) {
    if (userRole !== 'admin' && userRole !== 'superAdmin') {
      throw new ForbiddenException('Only admin can list vendor sponsored campaigns');
    }
    const list = await this.prisma.vendorSponsoredVideo.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        video: {
          select: { id: true, title: true, thumbnailUrl: true, viewCount: true },
        },
        user: { select: { id: true, name: true, nickname: true, email: true } },
      },
    });
    return { sponsored: list };
  }

  async findOne(id: string) {
    const s = await this.prisma.vendorSponsoredVideo.findUnique({
      where: { id },
      include: {
        video: true,
        user: { select: { id: true, name: true, nickname: true, email: true } },
      },
    });
    if (!s) throw new NotFoundException('Vendor sponsored campaign not found');
    return s;
  }

  async update(
    id: string,
    userId: string,
    userRole: string,
    dto: UpdateVendorSponsoredDto,
  ) {
    if (userRole !== 'admin' && userRole !== 'superAdmin') {
      throw new ForbiddenException('Only admin can update vendor sponsored campaigns');
    }
    const existing = await this.prisma.vendorSponsoredVideo.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException('Vendor sponsored campaign not found');
    const data: any = { ...dto };
    if (dto.startDate) data.startDate = new Date(dto.startDate);
    if (dto.endDate) data.endDate = new Date(dto.endDate);
    return this.prisma.vendorSponsoredVideo.update({
      where: { id },
      data,
      include: {
        video: { select: { id: true, title: true, thumbnailUrl: true } },
        user: { select: { id: true, name: true, nickname: true } },
      },
    });
  }

  async remove(id: string, creatorId: string, userRole: string) {
    if (userRole !== 'admin' && userRole !== 'superAdmin') {
      throw new ForbiddenException('Only admin can delete vendor sponsored campaigns');
    }
    const existing = await this.prisma.vendorSponsoredVideo.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException('Vendor sponsored campaign not found');
    await this.prisma.vendorSponsoredVideo.update({
      where: { id },
      data: { status: 'cancelled' },
    });
    return { message: 'Vendor sponsored campaign cancelled' };
  }
}
