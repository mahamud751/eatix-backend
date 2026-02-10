import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDiscountDto } from './dto/create-discount.dto';
import { UpdateDiscountDto } from './dto/update-discount.dto';
import { AuditLogService } from '../audit/audit.service';

@Injectable()
export class DiscountService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async create(createDiscountDto: CreateDiscountDto) {
    const { photos, startDate, endDate, ...rest } = createDiscountDto;
    const photoObjects =
      photos?.map((photo) => ({
        title: photo.title,
        src: photo.src,
      })) || [];

    const discount = await this.prisma.discount.create({
      data: {
        ...rest,
        photos: photoObjects,
        startDate: startDate || new Date(),
        endDate: endDate || new Date(),
      },
    });
    return { message: 'Discount created successfully', discount };
  }

  async findAll(
    page: number = 1,
    perPage: number = 10,
    name?: string,
    code?: string,
  ): Promise<{ data: any[]; total: number }> {
    const pageNumber = Number(page) || 1;
    const perPageNumber = Number(perPage) || 10;

    const skip = (pageNumber - 1) * perPageNumber;

    const whereClause: Prisma.DiscountWhereInput = {};
    if (name) {
      whereClause.name = { contains: name, mode: Prisma.QueryMode.insensitive };
    }
    if (code) {
      whereClause.code = { contains: code, mode: Prisma.QueryMode.insensitive };
    }

    const totalCountPromise = this.prisma.discount.count({
      where: whereClause,
    });

    const dataPromise = this.prisma.discount.findMany({
      skip,
      take: perPageNumber,
      where: whereClause,
    });

    const [total, data] = await Promise.all([totalCountPromise, dataPromise]);

    return { data, total };
  }

  async findOne(id: string) {
    const discount = await this.prisma.discount.findUnique({
      where: { id },
    });

    if (!discount) {
      throw new NotFoundException('Discount not found');
    }
    return discount;
  }

  async update(id: string, updateDiscountDto: UpdateDiscountDto) {
    const oldDiscount = await this.prisma.discount.findUnique({
      where: { id },
    });

    if (!oldDiscount) {
      throw new NotFoundException('Discount not found');
    }

    const { photos, ...rest } = updateDiscountDto;

    const photoObjects =
      photos?.map((photo) => ({
        title: photo.title,
        src: photo.src,
      })) || [];

    const discountUpdate = await this.prisma.discount.update({
      where: { id },
      data: {
        ...rest,
        photos: photoObjects.length > 0 ? photoObjects : undefined,
      },
    });

    await this.auditLogService.log(
      id,
      'Discount',
      'UPDATE',
      oldDiscount,
      discountUpdate,
    );

    return { message: 'Discount updated successfully', discountUpdate };
  }

  async remove(id: string) {
    const discount = await this.prisma.discount.findUnique({ where: { id } });

    if (!discount) {
      throw new NotFoundException('Discount not found');
    }

    return this.prisma.discount.delete({ where: { id } });
  }
}
