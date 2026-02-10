import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../audit/audit.service';
import { Prisma } from '@prisma/client';
import { CreateShippingDto } from './dto/create-shipping-dto';
import { UpdateShippingDto } from './dto/update-shipping-dto';

@Injectable()
export class ShippingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async create(createShippingDto: CreateShippingDto) {
    const { rates, status } = createShippingDto;

    const shipping = await this.prisma.shipping.create({
      data: {
        rates: rates as unknown as Prisma.InputJsonValue,
        status: status || 'active',
      },
    });

    return { message: 'Shipping created successfully', shipping };
  }

  async findAll(): Promise<{ data: any[]; total: number }> {
    const totalCountPromise = this.prisma.shipping.count();
    const dataPromise = this.prisma.shipping.findMany({
      orderBy: { createdAt: 'desc' },
    });

    const [total, data] = await Promise.all([totalCountPromise, dataPromise]);

    return { data, total };
  }

  async findOne(id: string) {
    const shipping = await this.prisma.shipping.findUnique({
      where: { id },
    });

    if (!shipping) {
      throw new NotFoundException('Shipping not found');
    }
    return shipping;
  }

  async update(id: string, updateShippingDto: UpdateShippingDto) {
    const oldShipping = await this.prisma.shipping.findUnique({
      where: { id },
    });

    if (!oldShipping) {
      throw new NotFoundException('Shipping not found');
    }

    const shippingUpdate = await this.prisma.shipping.update({
      where: { id },
      data: {
        rates: updateShippingDto.rates as unknown as Prisma.InputJsonValue,
        status: updateShippingDto.status,
      },
    });

    await this.auditLogService.log(
      id,
      'shipping',
      'UPDATE',
      oldShipping,
      shippingUpdate,
    );
    return { message: 'Shipping updated successfully', shippingUpdate };
  }

  async remove(id: string) {
    const shipping = await this.prisma.shipping.findUnique({
      where: { id },
    });

    if (!shipping) {
      throw new NotFoundException('Shipping not found');
    }

    await this.prisma.shipping.delete({ where: { id } });
    return { message: 'Shipping deleted successfully' };
  }
}
