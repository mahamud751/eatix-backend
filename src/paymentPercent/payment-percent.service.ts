import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../audit/audit.service';
import { CreatePaymentPercentDto } from './dto/create-payment-percent.dto';
import { UpdatePaymentPercentDto } from './dto/update-payment-percent.dto';

@Injectable()
export class PaymentPercentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async create(createBannerDto: CreatePaymentPercentDto) {
    const { name, status } = createBannerDto;

    const paymentPercent = await this.prisma.paymentPercent.create({
      data: {
        name: name,
        status: status || 'active',
      },
    });

    return { message: 'paymentPercent created successfully', paymentPercent };
  }

  async findAll(): Promise<{ data: any[]; total: number }> {
    const totalCountPromise = this.prisma.paymentPercent.count();
    const dataPromise = this.prisma.paymentPercent.findMany({
      orderBy: { createdAt: 'desc' },
    });

    const [total, data] = await Promise.all([totalCountPromise, dataPromise]);

    return { data, total };
  }

  async findOne(id: string) {
    const paymentPercent = await this.prisma.paymentPercent.findUnique({
      where: { id },
    });

    if (!paymentPercent) {
      throw new NotFoundException('paymentPercent not found');
    }
    return paymentPercent;
  }

  async update(id: string, UpdatePaymentPercentDto: UpdatePaymentPercentDto) {
    const oldBanner = await this.prisma.paymentPercent.findUnique({
      where: { id },
    });

    if (!oldBanner) {
      throw new NotFoundException('paymentPercent not found');
    }
    const { name, ...rest } = UpdatePaymentPercentDto;

    const bannerUpdate = await this.prisma.paymentPercent.update({
      where: { id },
      data: {
        ...rest,
      },
    });

    await this.auditLogService.log(
      id,
      'paymentPercent',
      'UPDATE',
      oldBanner,
      bannerUpdate,
    );
    return { message: 'paymentPercent updated successfully', bannerUpdate };
  }

  async remove(id: string) {
    const paymentPercent = await this.prisma.paymentPercent.findUnique({
      where: { id },
    });

    if (!paymentPercent) {
      throw new NotFoundException('paymentPercent not found');
    }

    return this.prisma.paymentPercent.delete({ where: { id } });
  }
}
