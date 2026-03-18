import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { R2StorageService } from '../r2-storage/r2-storage.service';
import { CreateMenuItemDto } from './dto/create-menu-item.dto';
import { UpdateMenuItemDto } from './dto/update-menu-item.dto';
import { CreateMenuCategoryDto } from './dto/create-menu-category.dto';
import { UpdateMenuCategoryDto } from './dto/update-menu-category.dto';

@Injectable()
export class MenuService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly r2Storage: R2StorageService,
  ) {}

  /** Public: get menu items and categories for a user (e.g. restaurant owner). */
  async getByUserId(userId: string) {
    const [categories, items, orderAgg] = await Promise.all([
      this.prisma.menuCategory.findMany({
        where: { userId },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      }),
      this.prisma.menuItem.findMany({
        where: { userId },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        include: { category: true },
      }),
      this.prisma.restaurantOrderItem.groupBy({
        by: ['menuItemId'],
        where: {
          order: {
            ownerId: userId,
            status: { not: 'cancelled' },
          },
        },
        _sum: { quantity: true },
      }),
    ]);
    const qtyByMenuId = new Map(
      orderAgg.map((r) => [r.menuItemId, r._sum.quantity ?? 0]),
    );
    const menu = items.map((item) => ({
      ...item,
      timesOrdered: qtyByMenuId.get(item.id) ?? 0,
    }));
    return { menu, categories };
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
      include: { category: true },
    });
    return { menu: items };
  }

  /** List menu categories for owner (auth) or by userId for admin. */
  async findCategories(currentUserId: string, role: string, userId?: string) {
    const targetUserId =
      role === 'admin' || role === 'superAdmin' ? userId || currentUserId : currentUserId;
    if (role !== 'admin' && role !== 'superAdmin' && userId && userId !== currentUserId) {
      throw new ForbiddenException('You can only list your own categories');
    }
    const categories = await this.prisma.menuCategory.findMany({
      where: { userId: targetUserId },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      include: { _count: { select: { items: true } } },
    });
    return {
      categories: categories.map((c) => ({
        id: c.id,
        userId: c.userId,
        name: c.name,
        sortOrder: c.sortOrder,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
        itemCount: c._count.items,
      })),
    };
  }

  async createCategory(
    currentUserId: string,
    role: string,
    dto: CreateMenuCategoryDto,
    userId?: string,
  ) {
    const ownerId =
      role === 'admin' || role === 'superAdmin' ? userId || currentUserId : currentUserId;
    if (role !== 'admin' && role !== 'superAdmin' && userId && userId !== currentUserId) {
      throw new ForbiddenException('You can only add categories to your own menu');
    }
    return this.prisma.menuCategory.create({
      data: {
        userId: ownerId,
        name: dto.name.trim(),
        sortOrder: dto.sortOrder ?? 0,
      },
    });
  }

  async updateCategory(
    id: string,
    currentUserId: string,
    role: string,
    dto: UpdateMenuCategoryDto,
  ) {
    const existing = await this.prisma.menuCategory.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Menu category not found');
    if (role !== 'admin' && role !== 'superAdmin' && existing.userId !== currentUserId) {
      throw new ForbiddenException('You can only edit your own categories');
    }
    return this.prisma.menuCategory.update({
      where: { id },
      data: {
        ...(dto.name != null && { name: dto.name.trim() }),
        ...(dto.sortOrder != null && { sortOrder: dto.sortOrder }),
      },
    });
  }

  async removeCategory(id: string, currentUserId: string, role: string) {
    const existing = await this.prisma.menuCategory.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Menu category not found');
    if (role !== 'admin' && role !== 'superAdmin' && existing.userId !== currentUserId) {
      throw new ForbiddenException('You can only delete your own categories');
    }
    await this.prisma.menuItem.updateMany({
      where: { categoryId: id },
      data: { categoryId: null },
    });
    await this.prisma.menuCategory.delete({ where: { id } });
    return { deleted: true };
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
    if (dto.categoryId) {
      const cat = await this.prisma.menuCategory.findFirst({
        where: { id: dto.categoryId, userId: ownerId },
      });
      if (!cat) throw new ForbiddenException('Category not found or not yours');
    }
    return this.prisma.menuItem.create({
      data: {
        userId: ownerId,
        categoryId: dto.categoryId && dto.categoryId.trim() ? dto.categoryId.trim() : null,
        itemName: dto.itemName.trim(),
        price: dto.price,
        imageUrl: dto.imageUrl && dto.imageUrl.trim() ? dto.imageUrl.trim() : null,
        sortOrder: dto.sortOrder != null ? dto.sortOrder : 0,
        dietaryType:
          dto.dietaryType && ['veg', 'egg', 'non_veg'].includes(dto.dietaryType)
            ? dto.dietaryType
            : null,
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
    if (dto.categoryId !== undefined) {
      if (dto.categoryId && dto.categoryId.trim()) {
        const cat = await this.prisma.menuCategory.findFirst({
          where: { id: dto.categoryId, userId: existing.userId },
        });
        if (!cat) throw new ForbiddenException('Category not found or not yours');
      }
    }
    const data: Record<string, unknown> = {
      ...(dto.itemName != null && { itemName: dto.itemName.trim() }),
      ...(dto.price != null && { price: dto.price }),
      ...(dto.imageUrl !== undefined && { imageUrl: dto.imageUrl && dto.imageUrl.trim() ? dto.imageUrl.trim() : null }),
      ...(dto.sortOrder != null && { sortOrder: dto.sortOrder }),
      ...(dto.categoryId !== undefined && {
        categoryId: dto.categoryId && dto.categoryId.trim() ? dto.categoryId.trim() : null,
      }),
    };
    if (dto.clearDietary === true) {
      data.dietaryType = null;
    } else if (dto.dietaryType !== undefined && dto.dietaryType != null) {
      data.dietaryType = ['veg', 'egg', 'non_veg'].includes(dto.dietaryType)
        ? dto.dietaryType
        : null;
    }
    return this.prisma.menuItem.update({
      where: { id },
      data: data as any,
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

  /** Upload menu item image to R2; returns public URL */
  async uploadImage(file: Express.Multer.File): Promise<{ imageUrl: string }> {
    const { url } = await this.r2Storage.uploadFile(file, 'menu');
    return { imageUrl: url };
  }

  /** Upload menu file (PDF or image) for owner; creates MenuFile record */
  async uploadMenuFile(userId: string, file: Express.Multer.File): Promise<{ fileUrl: string; fileType: string; id: string }> {
    const { url } = await this.r2Storage.uploadFile(file, 'menu-files');
    const fileType = file.mimetype?.startsWith('application/pdf') ? 'pdf' : 'image';
    const menuFile = await this.prisma.menuFile.create({
      data: { userId, fileUrl: url, fileType },
    });
    return { fileUrl: url, fileType, id: menuFile.id };
  }

  /** List menu files for owner */
  async findMenuFiles(userId: string, currentUserId: string, role: string) {
    const targetUserId = role === 'admin' || role === 'superAdmin' ? userId || currentUserId : currentUserId;
    if (role !== 'admin' && role !== 'superAdmin' && userId && userId !== currentUserId) {
      throw new ForbiddenException('You can only list your own menu files');
    }
    const files = await this.prisma.menuFile.findMany({
      where: { userId: targetUserId },
      orderBy: { createdAt: 'desc' },
    });
    return { files };
  }
}
