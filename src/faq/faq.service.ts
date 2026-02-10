import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFaqDto } from './dto/create-faq.dto';
import { UpdateFaqDto } from './dto/update-faq.dto';
import { AuditLogService } from 'src/audit/audit.service';

@Injectable()
export class FaqService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async create(createFaqDto: CreateFaqDto) {
    const { title, desc, position } = createFaqDto;

    const faq = await this.prisma.faq.create({
      data: {
        title,
        desc,
        position,
      },
    });
    return { message: 'Faq comment created successfully', faq };
  }

  async findAll(
    page: number = 1,
    perPage: number = 10,
  ): Promise<{ data: any[]; total: number }> {
    const pageNumber = Number(page) || 1;
    const perPageNumber = Number(perPage) || 10;

    const skip = (pageNumber - 1) * perPageNumber;

    const totalCountPromise = this.prisma.faq.count();

    const dataPromise = this.prisma.faq.findMany({
      skip,
      take: perPageNumber,
      orderBy: { createdAt: 'desc' },
    });

    const [total, data] = await Promise.all([totalCountPromise, dataPromise]);

    return { data, total };
  }

  async findOne(id: string) {
    const faq = await this.prisma.faq.findUnique({
      where: { id },
    });

    if (!faq) {
      throw new NotFoundException('Faq comment not found');
    }

    return faq;
  }

  async update(id: string, updateFaqDto: UpdateFaqDto) {
    const faq = await this.prisma.faq.findUnique({
      where: { id },
    });

    if (!faq) {
      throw new NotFoundException('Faq not found');
    }

    const updatedFaq = await this.prisma.faq.update({
      where: { id },
      data: updateFaqDto,
    });

    await this.auditLogService.log(id, 'Faq', 'UPDATE', faq, updatedFaq);

    return { message: 'Faq updated successfully', updatedFaq };
  }

  async remove(id: string) {
    const faq = await this.prisma.faq.findUnique({
      where: { id },
    });

    if (!faq) {
      throw new NotFoundException('Faq not found');
    }

    await this.prisma.faq.delete({
      where: { id },
    });

    return { message: 'Faq deleted successfully' };
  }
}
