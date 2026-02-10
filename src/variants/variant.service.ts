import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVariantDto } from './dto/create-variant.dto';
import { UpdateVariantDto } from './dto/update-variant.dto';
import { AuditLogService } from 'src/audit/audit.service';

@Injectable()
export class VariantService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async create(createVariantDto: CreateVariantDto) {
    const { ...rest } = createVariantDto;

    try {
      const variant = await this.prisma.variant.create({
        data: {
          ...rest,
        },
      });

      return { message: 'Variant created successfully', variant };
    } catch (error) {
      console.error('Error creating Variant:', error);
      throw new InternalServerErrorException('Failed to create Variant');
    }
  }

  async findAll(
    page: number = 1,
    perPage: number = 10,
  ): Promise<{ data: any[]; total: number }> {
    const pageNumber = Number(page) || 1;
    const perPageNumber = Number(perPage) || 10;

    const skip = (pageNumber - 1) * perPageNumber;

    const totalCountPromise = this.prisma.variant.count();

    const dataPromise = this.prisma.variant.findMany({
      skip,
      take: perPageNumber,
      orderBy: { createdAt: 'desc' },
    });

    const [total, data] = await Promise.all([totalCountPromise, dataPromise]);

    return { data, total };
  }

  async findOne(id: string) {
    const variant = await this.prisma.variant.findUnique({
      where: { id },
    });
    if (!variant) {
      throw new NotFoundException(`Variant with ID ${id} not found`);
    }
    return variant;
  }

  async update(id: string, updateVariantDto: UpdateVariantDto) {
    const variant = await this.prisma.variant.findUnique({
      where: { id },
    });
    if (!variant) {
      throw new NotFoundException(`Variant with ID ${id} not found`);
    }
    const { ...rest } = updateVariantDto;
    const variantUpdate = await this.prisma.variant.update({
      where: { id },
      data: {
        ...rest,
      },
    });
    await this.auditLogService.log(
      id,
      'Variant',
      'UPDATE',
      variant,
      variantUpdate,
    );
    return { message: 'Variant updated successfully', variantUpdate };
  }

  async remove(id: string) {
    const variant = await this.prisma.variant.findUnique({
      where: { id },
    });
    if (!variant) {
      throw new NotFoundException(`Variant with ID ${id} not found`);
    }
    return this.prisma.variant.delete({
      where: { id },
    });
  }
}
