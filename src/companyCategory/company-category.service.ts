import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCompanyCategoryDto } from './dto/create-company-category.dto';
import { UpdateCompanyCategoryDto } from './dto/update-company-category.dto';

@Injectable()
export class CompanyCategoryService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createCompanyCategoryDto: CreateCompanyCategoryDto) {
    return this.prisma.companyCategory.create({
      data: createCompanyCategoryDto,
    });
  }

  async findAll(page: number = 1, perPage: number = 25) {
    const skip = (page - 1) * perPage;
    const [categories, total] = await Promise.all([
      this.prisma.companyCategory.findMany({
        skip,
        take: perPage,
        orderBy: { createdAt: 'desc' },
        include: {
          departments: {
            select: {
              id: true,
              name: true,
              _count: {
                select: { users: true },
              },
            },
          },
        },
      }),
      this.prisma.companyCategory.count(),
    ]);

    // Map to calculate counts and include department details
    const data = categories.map((category) => {
      const departmentCount = category.departments.length;
      const employeeCount = category.departments.reduce(
        (sum, dept) => sum + dept._count.users,
        0,
      );

      // Get department names
      const departmentNames = category.departments.map((dept) => dept.name);

      return {
        ...category,
        departmentCount,
        employeeCount,
        departmentNames,
        departments: undefined, // Remove departments from response
      };
    });

    return { data, total };
  }

  async findOne(id: string) {
    const category = await this.prisma.companyCategory.findUnique({
      where: { id },
    });
    if (!category) {
      throw new NotFoundException('Company category not found');
    }
    return category;
  }

  async update(id: string, updateCompanyCategoryDto: UpdateCompanyCategoryDto) {
    const category = await this.prisma.companyCategory.findUnique({
      where: { id },
    });
    if (!category) {
      throw new NotFoundException('Company category not found');
    }
    return this.prisma.companyCategory.update({
      where: { id },
      data: updateCompanyCategoryDto,
    });
  }

  async remove(id: string) {
    const category = await this.prisma.companyCategory.findUnique({
      where: { id },
    });
    if (!category) {
      throw new NotFoundException('Company category not found');
    }
    await this.prisma.companyCategory.delete({ where: { id } });
    return { message: 'Company category deleted successfully' };
  }
}
