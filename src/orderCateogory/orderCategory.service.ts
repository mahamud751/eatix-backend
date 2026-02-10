import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from 'src/audit/audit.service';
import { CreateOrderCategoryDto } from './dto/createOrderCategory.dto';
import { UpdateOrderCategoryDto } from './dto/categoryUpdate.dto';

@Injectable()
export class OrderCategoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async create(createCategoryDto: CreateOrderCategoryDto) {
    const category = await this.prisma.orderCategory.create({
      data: createCategoryDto,
    });
    await this.auditLogService.log(
      category.id,
      'Category',
      'CREATE',
      null,
      category,
    );
    return { message: 'Category created successfully', category };
  }

  async findOne(id: string) {
    if (!id.match(/^[0-9a-fA-F-]{36}$/)) {
      throw new NotFoundException('Invalid category ID');
    }
    const category = await this.prisma.orderCategory.findUnique({
      where: { id },
    });
    if (!category) {
      throw new NotFoundException('Category not found');
    }
    return category;
  }

  async findAll(page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;
    const [categories, total] = await Promise.all([
      this.prisma.orderCategory.findMany({
        skip,
        take: limit,
      }),
      this.prisma.orderCategory.count(),
    ]);
    return { categories, total, page, limit };
  }

  async update(id: string, updateCategoryDto: UpdateOrderCategoryDto) {
    const category = await this.findOne(id); // Reuses findOne for validation
    const categoryUpdate = await this.prisma.orderCategory.update({
      where: { id },
      data: updateCategoryDto,
    });
    await this.auditLogService.log(
      id,
      'Category',
      'UPDATE',
      category,
      categoryUpdate,
    );
    return {
      message: 'Category updated successfully',
      category: categoryUpdate,
    };
  }

  async remove(id: string) {
    const category = await this.findOne(id); // Reuses findOne for validation
    await this.prisma.subCategory.deleteMany({
      where: { categoryId: id },
    });
    const deletedCategory = await this.prisma.orderCategory.delete({
      where: { id },
    });
    await this.auditLogService.log(id, 'Category', 'DELETE', category, null);
    return {
      message: 'Category deleted successfully',
      category: deletedCategory,
    };
  }
}
