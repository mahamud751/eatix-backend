import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { R2StorageService } from '../r2-storage/r2-storage.service';
import { CreateMenuItemDto } from './dto/create-menu-item.dto';
import { UpdateMenuItemDto } from './dto/update-menu-item.dto';

@Injectable()
export class MenuService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly r2Storage: R2StorageService,
  ) {}

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
