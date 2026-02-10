import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';

@Injectable()
export class DepartmentService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createDepartmentDto: CreateDepartmentDto) {
    return this.prisma.department.create({
      data: createDepartmentDto,
    });
  }

  async findAll(page: number = 1, perPage: number = 25) {
    const skip = (page - 1) * perPage;
    const [departments, total] = await Promise.all([
      this.prisma.department.findMany({
        skip,
        take: perPage,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: { users: true },
          },
          category: true,
        },
      }),
      this.prisma.department.count(),
    ]);

    // Map to add employeeCount field
    const data = departments.map((dept) => ({
      ...dept,
      employeeCount: dept._count.users,
      _count: undefined, // Remove _count from response
    }));

    return { data, total };
  }

  async findOne(id: string) {
    const department = await this.prisma.department.findUnique({
      where: { id },
      include: { users: true },
    });
    if (!department) {
      throw new NotFoundException('Department not found');
    }
    return department;
  }

  async update(id: string, updateDepartmentDto: UpdateDepartmentDto) {
    const department = await this.prisma.department.findUnique({
      where: { id },
    });
    if (!department) {
      throw new NotFoundException('Department not found');
    }
    return this.prisma.department.update({
      where: { id },
      data: updateDepartmentDto,
    });
  }

  async remove(id: string) {
    const department = await this.prisma.department.findUnique({
      where: { id },
    });
    if (!department) {
      throw new NotFoundException('Department not found');
    }
    await this.prisma.department.delete({ where: { id } });
    return { message: 'Department deleted successfully' };
  }
}
