import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
// import { CreateSubOrderDto } from './dto/sub-order.dto';
// import { UpdateSubOrderDto } from './dto/sub-order.dto';

@Injectable()
export class SubOrderService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    page: number = 1,
    perPage: number = 10,
  ): Promise<{ data: any[]; total: number }> {
    const pageNumber = Number(page) || 1;
    const perPageNumber = Number(perPage) || 10;
    const skip = (pageNumber - 1) * perPageNumber;

    const where: any = {};

    const totalCountPromise = this.prisma.subOrder.count({ where });

    const dataPromise = this.prisma.subOrder.findMany({
      skip,
      take: perPageNumber,
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        order: {
          select: {
            id: true,
            email: true,
            name: true,
            phone: true,
            grandPrice: true,
          },
        },
      },
    });

    const [total, data] = await Promise.all([totalCountPromise, dataPromise]);

    return { data, total };
  }

  async findAllByOrderId(orderId: string) {
    // Verify that the main order exists
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });
    if (!order) {
      throw new NotFoundException('Main order not found');
    }

    return await this.prisma.subOrder.findMany({
      where: { orderId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const subOrder = await this.prisma.subOrder.findUnique({
      where: { id },
    });
    if (!subOrder) {
      throw new NotFoundException('Sub-order not found');
    }
    return subOrder;
  }

  // async updateSubOrder(id: string, updateSubOrderDto: UpdateSubOrderDto) {
  //   const subOrder = await this.prisma.subOrder.findUnique({
  //     where: { id },
  //   });
  //   if (!subOrder) {
  //     throw new NotFoundException('Sub-order not found');
  //   }

  //   // Recalculate totalAmount if price or quantity is updated
  //   const updatedData = {
  //     ...updateSubOrderDto,
  //     totalAmount:
  //       updateSubOrderDto.quantity && updateSubOrderDto.price
  //         ? updateSubOrderDto.quantity * updateSubOrderDto.price
  //         : updateSubOrderDto.totalAmount || subOrder.totalAmount,
  //   };

  //   return await this.prisma.subOrder.update({
  //     where: { id },
  //     data: updatedData,
  //   });
  // }

  async deleteSubOrder(id: string) {
    const subOrder = await this.prisma.subOrder.findUnique({
      where: { id },
    });
    if (!subOrder) {
      throw new NotFoundException('Sub-order not found');
    }

    await this.prisma.subOrder.delete({
      where: { id },
    });

    return { message: 'Sub-order deleted successfully' };
  }
}
