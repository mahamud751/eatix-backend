/* eslint-disable prettier/prettier */
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePriceSettingDto } from './dto/create-price.dto';
import { UpdatePriceSettingDto } from './dto/update-price.dto';

@Injectable()
export class PriceSettingService {
  constructor(private prisma: PrismaService) {}

  async create(createPriceSettingDto: CreatePriceSettingDto) {
    return this.prisma.priceSetting.create({
      data: {
        ...createPriceSettingDto,
      },
    });
  }

  async update(id: string, updatePriceSettingDto: UpdatePriceSettingDto) {
    const existing = await this.prisma.priceSetting.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException(`PriceSetting with ID ${id} not found`);
    }
    return this.prisma.priceSetting.update({
      where: { id },
      data: {
        ...updatePriceSettingDto,
      },
    });
  }

  async findAll() {
    return this.prisma.priceSetting.findMany();
  }

  async findOne(id: string) {
    const priceSetting = await this.prisma.priceSetting.findUnique({
      where: { id },
    });
    if (!priceSetting) {
      throw new NotFoundException(`PriceSetting with ID ${id} not found`);
    }
    return priceSetting;
  }
}
