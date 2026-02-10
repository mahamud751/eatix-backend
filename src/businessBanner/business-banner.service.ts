import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../audit/audit.service';
import { CreateBusinessBannerDto } from './dto/create-business-banner.dto';
import { UpdateBusinessBannerDto } from './dto/update-business-banner.dto';

@Injectable()
export class BusinessBannerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async create(createBannerDto: CreateBusinessBannerDto) {
    const { banners, status } = createBannerDto;

    // Transform PhotoDto[] to plain JSON objects
    const bannersPlain =
      banners?.map((photo) => ({
        title: photo.title,
        src: photo.src,
      })) || [];

    const banner = await this.prisma.businessBanner.create({
      data: {
        banners: bannersPlain,
        status: status || 'active',
      },
    });

    return { message: 'Banner created successfully', banner };
  }

  async findAll(): Promise<{ data: any[]; total: number }> {
    const totalCountPromise = this.prisma.businessBanner.count();
    const dataPromise = this.prisma.businessBanner.findMany({
      orderBy: { createdAt: 'desc' },
    });

    const [total, data] = await Promise.all([totalCountPromise, dataPromise]);

    return { data, total };
  }

  async findOne(id: string) {
    const banner = await this.prisma.businessBanner.findUnique({
      where: { id },
    });

    if (!banner) {
      throw new NotFoundException('Banner not found');
    }
    return banner;
  }

  async update(id: string, updateBannerDto: UpdateBusinessBannerDto) {
    const oldBanner = await this.prisma.businessBanner.findUnique({
      where: { id },
    });

    if (!oldBanner) {
      throw new NotFoundException('Banner not found');
    }
    const { banners, ...rest } = updateBannerDto;

    const photoObjects =
      banners?.map((photo) => ({
        title: photo.title,
        src: photo.src,
      })) || [];
    const bannerUpdate = await this.prisma.businessBanner.update({
      where: { id },
      data: {
        ...rest,
        banners: photoObjects,
      },
    });

    await this.auditLogService.log(
      id,
      'Banner',
      'UPDATE',
      oldBanner,
      bannerUpdate,
    );
    return { message: 'Banner updated successfully', bannerUpdate };
  }

  async remove(id: string) {
    const banner = await this.prisma.businessBanner.findUnique({
      where: { id },
    });

    if (!banner) {
      throw new NotFoundException('Banner not found');
    }

    return this.prisma.businessBanner.delete({ where: { id } });
  }
}
