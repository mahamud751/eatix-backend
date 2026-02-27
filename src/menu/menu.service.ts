import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMenuItemDto } from './dto/create-menu-item.dto';
import { UpdateMenuItemDto } from './dto/update-menu-item.dto';

@Injectable()
export class MenuService {
  constructor(private readonly prisma: PrismaService) {}

  async getByUserId(userId: string) {
    const items = await this.prisma.menuItem.findMany({
      where: { userId },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
    return { menu: items };
  }

  async findItems(currentUserId: string, role: string, userId?: string) {
    const targetUserId =
      role === 'admin' || role === 'superAdmin' ? userId || currentUserId : currentUserId;
    if (role !== 'admin' && role !== 'superAdmin' && userId && userId !== currentUserId) {
      throw new ForbiddenException('You can only list your own menu');
    }
    const items = await this.prisma.menuItem.findMany({
      where: { userId: targetUserId },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
    return { menu: items };
  }

  async createItem(
    currentUserId: string,
    role: string,
    dto: CreateMenuItemDto,
  ) {
    const ownerId =
      role === 'admin' || role === 'superAdmin'
        ? (dto.userId || currentUserId)
        : currentUserId;
    if (role !== 'admin' && role !== 'superAdmin' && dto.userId && dto.userId !== currentUserId) {
      throw new ForbiddenException('You can only add items to your own menu');
    }
    return this.prisma.menuItem.create({
      data: {
        userId: ownerId,
        itemName: dto.itemName.trim(),
        price: dto.price,
        imageUrl: dto.imageUrl && dto.imageUrl.trim() ? dto.imageUrl.trim() : null,
        sortOrder: dto.sortOrder != null ? dto.sortOrder : 0,
      },
    });
  }

  async updateItem(
    id: string,
    currentUserId: string,
    role: string,
    dto: UpdateMenuItemDto,
  ) {
    const existing = await this.prisma.menuItem.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Menu item not found');
    if (role !== 'admin' && role !== 'superAdmin' && existing.userId !== currentUserId) {
      throw new ForbiddenException('You can only edit your own menu items');
    }
    return this.prisma.menuItem.update({
      where: { id },
      data: {
        ...(dto.itemName != null && { itemName: dto.itemName.trim() }),
        ...(dto.price != null && { price: dto.price }),
        ...(dto.imageUrl !== undefined && { imageUrl: dto.imageUrl && dto.imageUrl.trim() ? dto.imageUrl.trim() : null }),
        ...(dto.sortOrder != null && { sortOrder: dto.sortOrder }),
      },
    });
  }

  async removeItem(id: string, currentUserId: string, role: string) {
    const existing = await this.prisma.menuItem.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Menu item not found');
    if (role !== 'admin' && role !== 'superAdmin' && existing.userId !== currentUserId) {
      throw new ForbiddenException('You can only delete your own menu items');
    }
    await this.prisma.menuItem.delete({ where: { id } });
    return { deleted: true };
  }
}
