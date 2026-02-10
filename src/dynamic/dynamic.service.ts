import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

import { UpdateDynamicDto } from './dto/update-dynamic.dto';
import { AuditLogService } from '../audit/audit.service';
import { CreateDynamicDto } from './dto/create-dynamic.dto';

@Injectable()
export class DynamicService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async create(createDynamicDto: CreateDynamicDto) {
    return this.prisma.dynamic.create({
      data: createDynamicDto,
    });
  }

  async findAll(
    page: number = 1,
    perPage: number = 10,
  ): Promise<{ data: any[]; total: number }> {
    const pageNumber = Number(page) || 1;
    const perPageNumber = Number(perPage) || 10;

    const skip = (pageNumber - 1) * perPageNumber;

    const totalCountPromise = this.prisma.dynamic.count();

    const dataPromise = this.prisma.dynamic.findMany({
      skip,
      take: perPageNumber,
      orderBy: { createdAt: 'desc' },
    });

    const [total, data] = await Promise.all([totalCountPromise, dataPromise]);

    return { data, total };
  }

  async findOne(id: string) {
    const dynamic = await this.prisma.dynamic.findUnique({
      where: { id },
    });

    if (!dynamic) {
      throw new NotFoundException('dynamic not found');
    }
    return dynamic;
  }

  async update(id: string, updateDynamicDto: UpdateDynamicDto) {
    const oldDynamic = await this.prisma.dynamic.findUnique({ where: { id } });

    if (!oldDynamic) {
      throw new NotFoundException('dynamic not found');
    }

    const { ...rest } = updateDynamicDto;
    const dynamicUpdate = await this.prisma.dynamic.update({
      where: { id },
      data: {
        ...rest,
      },
    });

    await this.auditLogService.log(
      id,
      'dynamic',
      'UPDATE',
      oldDynamic,
      dynamicUpdate,
    );
    return { message: 'dynamic updated successfully', dynamicUpdate };
  }

  async remove(id: string) {
    const dynamic = await this.prisma.dynamic.findUnique({ where: { id } });

    if (!dynamic) {
      throw new NotFoundException('dynamic not found');
    }

    return this.prisma.dynamic.delete({ where: { id } });
  }
}
