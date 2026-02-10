import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBannerDto } from './dto/create-banner.dto';
import { UpdateBannerDto } from './dto/update-banner.dto';
import { AuditLogService } from '../audit/audit.service';

@Injectable()
export class BannerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async create(createBannerDto: CreateBannerDto) {
    const { banners, sideBanners, status } = createBannerDto;

    // Transform PhotoDto[] to plain JSON objects
    const bannersPlain =
      banners?.map((photo) => ({
        title: photo.title,
        src: photo.src,
      })) || [];

    const sideBannersPlain =
      sideBanners?.map((photo) => ({
        title: photo.title,
        src: photo.src,
      })) || [];

    const banner = await this.prisma.banner.create({
      data: {
        banners: bannersPlain,
        sideBanners: sideBannersPlain,
        status: status || 'active',
      },
    });

    return { message: 'Banner created successfully', banner };
  }

  async findAll(): Promise<{ data: any[]; total: number }> {
    const totalCountPromise = this.prisma.banner.count();
    const dataPromise = this.prisma.banner.findMany({
      orderBy: { createdAt: 'desc' },
    });

    const [total, data] = await Promise.all([totalCountPromise, dataPromise]);

    return { data, total };
  }

  async findOne(id: string) {
    const banner = await this.prisma.banner.findUnique({
      where: { id },
    });

    if (!banner) {
      throw new NotFoundException('Banner not found');
    }
    return banner;
  }

  async update(id: string, updateBannerDto: UpdateBannerDto) {
    const oldBanner = await this.prisma.banner.findUnique({ where: { id } });

    if (!oldBanner) {
      throw new NotFoundException('Banner not found');
    }
    const { banners, ...rest } = updateBannerDto;

    const photoObjects =
      banners?.map((photo) => ({
        title: photo.title,
        src: photo.src,
      })) || [];
    const bannerUpdate = await this.prisma.banner.update({
      where: { id },
      data: {
        ...rest,
        banners: photoObjects,
        sideBanners: photoObjects,
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
    const banner = await this.prisma.banner.findUnique({ where: { id } });

    if (!banner) {
      throw new NotFoundException('Banner not found');
    }

    return this.prisma.banner.delete({ where: { id } });
  }
}
