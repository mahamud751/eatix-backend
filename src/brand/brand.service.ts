import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

import { AuditLogService } from '../audit/audit.service';
import { CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';

@Injectable()
export class BrandService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async create(createBrandDto: CreateBrandDto) {
    const { logo, title, status } = createBrandDto;

    // Transform PhotoDto[] to plain JSON objects
    const bannersPlain =
      logo?.map((photo) => ({
        title: photo.title,
        src: photo.src,
      })) || [];

    const brand = await this.prisma.brand.create({
      data: {
        title: title,
        logo: bannersPlain,
        status: status || 'active',
      },
    });

    return { message: 'Brand created successfully', brand: brand };
  }

  async findAll(
    page: number = 1,
    perPage: number = 10,
  ): Promise<{ data: any[]; total: number }> {
    const pageNumber = Number(page) || 1;
    const perPageNumber = Number(perPage) || 10;

    const skip = (pageNumber - 1) * perPageNumber;

    const totalCountPromise = this.prisma.brand.count();

    const dataPromise = this.prisma.brand.findMany({
      skip,
      take: perPageNumber,
      orderBy: { createdAt: 'desc' },
    });

    const [total, data] = await Promise.all([totalCountPromise, dataPromise]);

    return { data, total };
  }

  async findOne(id: string) {
    const brand = await this.prisma.brand.findUnique({
      where: { id },
    });

    if (!brand) {
      throw new NotFoundException('Brand not found');
    }
    return brand;
  }

  async update(id: string, updateBrandDto: UpdateBrandDto) {
    const oldBrand = await this.prisma.brand.findUnique({ where: { id } });

    if (!oldBrand) {
      throw new NotFoundException('Brand not found');
    }
    const { logo, ...rest } = updateBrandDto;

    const photoObjects =
      logo?.map((photo) => ({
        title: photo.title,
        src: photo.src,
      })) || [];
    const brandUpdate = await this.prisma.brand.update({
      where: { id },
      data: {
        ...rest,
        logo: photoObjects.length > 0 ? photoObjects : undefined,
      },
    });

    await this.auditLogService.log(
      id,
      'Brand',
      'UPDATE',
      oldBrand,
      brandUpdate,
    );
    return {
      message: 'Brand updated successfully',
      bannerUpdate: brandUpdate,
    };
  }

  async remove(id: string) {
    const brand = await this.prisma.brand.findUnique({ where: { id } });

    if (!brand) {
      throw new NotFoundException('Brand not found');
    }

    return this.prisma.brand.delete({ where: { id } });
  }
}
