import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWishlistDto } from './dto/create-wishlist.dto';
import { UpdateWishlistDto } from './dto/update-wishlist.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class WishlistService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createWishlistDto: CreateWishlistDto) {
    const { productId, ...rest } = createWishlistDto;

    return this.prisma.wishlist.create({
      data: {
        ...rest,
        productId: productId,
      },
    });
  }

  async findAll(
    page: number = 1,
    perPage: number = 10,
    email?: string,
    productId?: string,
  ): Promise<{ data: any[]; total: number }> {
    const pageNumber = Number(page) || 1;
    const perPageNumber = Number(perPage) || 10;
    const skip = (pageNumber - 1) * perPageNumber;

    const where: any = {};

    if (email) {
      where.email = {
        contains: email,
        mode: 'insensitive',
      };
    }

    if (productId) {
      where.productId = productId;
    }

    const totalCountPromise = this.prisma.wishlist.count({
      where,
    });

    const dataPromise = this.prisma.wishlist.findMany({
      skip,
      take: perPageNumber,
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        products: true,
      },
    });

    const [total, data] = await Promise.all([totalCountPromise, dataPromise]);
    return { data, total };
  }

  async findOneByProductAndEmail(
    productId: string,
    email?: string,
  ): Promise<any> {
    const where: any = {
      productId: productId,
    };

    if (email) {
      where.email = email; // Add email filter if provided
    }

    const wishList = await this.prisma.wishlist.findFirst({
      where,
      include: {
        products: true,
      },
    });

    return wishList;
  }

  findOne(id: string) {
    return this.prisma.wishlist.findUnique({
      where: { id },
      include: { products: true },
    });
  }

  async update(id: string, updateWishlistDto: UpdateWishlistDto) {
    const { productId, ...rest } = updateWishlistDto;

    return this.prisma.wishlist.update({
      where: { id },
      data: {
        ...rest,
        products: {
          connect: { id: productId },
        },
      },
    });
  }

  remove(id: string) {
    return this.prisma.wishlist.delete({ where: { id } });
  }
}
