import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSubCategoryDto } from './dto/create-subCategory.dto';
import { UpdateSubCategoryDto } from './dto/update-subCategory.dto';
import { AuditLogService } from 'src/audit/audit.service';

@Injectable()
export class SubCategoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async create(createSubCategoryDto: CreateSubCategoryDto) {
    const { categoryId, name, photos } = createSubCategoryDto;

    const photoObjects =
      photos?.map((photo) => ({
        title: photo.title,
        src: photo.src,
      })) || [];
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    const subCategory = await this.prisma.subCategory.create({
      data: {
        name,
        photos: photoObjects,
        category: {
          connect: { id: categoryId },
        },
      },
    });
    return { message: 'Sub Category created successfully', subCategory };
  }

  async findAll(
    page: number = 1,
    perPage: number = 10,
  ): Promise<{ data: any[]; total: number }> {
    const pageNumber = Number(page) || 1;
    const perPageNumber = Number(perPage) || 10;
    const skip = (pageNumber - 1) * perPageNumber;
    const totalCountPromise = this.prisma.subCategory.count();

    const dataPromise = this.prisma.subCategory.findMany({
      skip,
      take: perPageNumber,
      orderBy: { createdAt: 'desc' },
      include: {
        category: true,
        products: true,
      },
    });

    const [total, data] = await Promise.all([totalCountPromise, dataPromise]);

    return { data, total };
  }

  async findOne(id: string) {
    const subCategory = await this.prisma.subCategory.findUnique({
      where: { id },
      include: {
        category: true,
      },
    });

    if (!subCategory) {
      throw new NotFoundException('SubCategory not found');
    }

    return subCategory;
  }

  async update(id: string, updateSubCategoryDto: UpdateSubCategoryDto) {
    const subCategory = await this.prisma.subCategory.findUnique({
      where: { id },
    });

    if (!subCategory) {
      throw new NotFoundException('SubCategory not found');
    }

    const { photos, categoryId, ...updateData } = updateSubCategoryDto;

    const updatePayload: any = {
      ...updateData,
      ...(categoryId && {
        category: {
          connect: { id: categoryId },
        },
      }),
    };

    const subCategoryUpdate = await this.prisma.subCategory.update({
      where: { id },
      data: {
        photos: photos?.length > 0 ? { set: photos } : undefined,
        ...updatePayload,
      },
    });
    await this.auditLogService.log(
      id,
      'SubCategory',
      'UPDATE',
      subCategory,
      subCategoryUpdate,
    );
    return { message: 'Sub Category updated successfully', subCategoryUpdate };
  }

  async remove(id: string) {
    const subCategory = await this.prisma.subCategory.findUnique({
      where: { id },
    });

    if (!subCategory) {
      throw new NotFoundException('SubCategory not found');
    }

    return this.prisma.subCategory.delete({
      where: { id },
    });
  }
}
