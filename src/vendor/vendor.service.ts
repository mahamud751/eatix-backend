import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVendorDto } from './dto/create-vendor.dto';
import { UpdateVendorDto } from './dto/update-vendor.dto';

@Injectable()
export class VendorService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createVendorDto: CreateVendorDto) {
    const { ...rest } = createVendorDto;

    const vendor = await this.prisma.vendor.create({
      data: {
        ...rest,
      },
    });
    return { message: 'vendor created successfully', vendor };
  }

  async findAll(
    page: number = 1,
    perPage: number = 10,
  ): Promise<{ data: any[]; total: number }> {
    const pageNumber = Number(page) || 1;
    const perPageNumber = Number(perPage) || 10;

    const skip = (pageNumber - 1) * perPageNumber;

    const totalCountPromise = this.prisma.vendor.count();

    const dataPromise = this.prisma.vendor.findMany({
      skip,
      take: perPageNumber,
      orderBy: { createdAt: 'desc' },
    });

    const [total, data] = await Promise.all([totalCountPromise, dataPromise]);

    return { data, total };
  }

  async findOne(id: string) {
    const vendor = await this.prisma.vendor.findUnique({ where: { id } });

    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }

    return vendor;
  }

  async update(id: string, updateVendorDto: UpdateVendorDto) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { id },
    });

    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }

    const updatedVendor = await this.prisma.vendor.update({
      where: { id },
      data: {
        ...updateVendorDto,
        status: updateVendorDto.status ? updateVendorDto.status : undefined,
      },
    });

    return { message: 'Vendor updated successfully', updatedVendor };
  }

  async remove(id: string) {
    const vendor = await this.prisma.vendor.findUnique({ where: { id } });

    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }

    await this.prisma.vendor.delete({ where: { id } });

    return { message: 'Vendor deleted successfully' };
  }
}
