import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { R2StorageService } from '../r2-storage/r2-storage.service';
import { CreateMenuItemDto } from './dto/create-menu-item.dto';
import { UpdateMenuItemDto } from './dto/update-menu-item.dto';
import { CreateMenuCategoryDto } from './dto/create-menu-category.dto';
import { UpdateMenuCategoryDto } from './dto/update-menu-category.dto';
import {
  menuItemMatchesCategory,
  resolveDiscoveryCategory,
} from './menu-discovery.constants';

@Injectable()
export class MenuService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly r2Storage: R2StorageService,
  ) {}

  private parseCsvRows(text: string): string[][] {
    const rows: string[][] = [];
    let row: string[] = [];
    let field = '';
    let inQuotes = false;
    for (let i = 0; i < text.length; i += 1) {
      const ch = text[i];
      const next = text[i + 1];
      if (ch === '"') {
        if (inQuotes && next === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = !inQuotes;
        }
        continue;
      }
      if (ch === ',' && !inQuotes) {
        row.push(field);
        field = '';
        continue;
      }
      if ((ch === '\n' || ch === '\r') && !inQuotes) {
        if (ch === '\r' && next === '\n') i += 1;
        row.push(field);
        field = '';
        if (row.some((c) => String(c || '').trim().length > 0)) {
          rows.push(row.map((c) => String(c || '').trim()));
        }
        row = [];
        continue;
      }
      field += ch;
    }
    row.push(field);
    if (row.some((c) => String(c || '').trim().length > 0)) {
      rows.push(row.map((c) => String(c || '').trim()));
    }
    return rows;
  }

  private normalizeCsvHeader(h: string): string {
    return String(h || '')
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '_');
  }

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

    const itemIdSet = new Set(items.map((i) => i.id));
    const reviews = await this.prisma.restaurantOrderReview.findMany({
      where: { ownerId: userId },
      select: { orderId: true, rating: true },
    });
    const ratingSum = new Map<string, number>();
    const ratingCnt = new Map<string, number>();
    if (reviews.length > 0) {
      const orderIds = [...new Set(reviews.map((r) => r.orderId))];
      const ratingByOrderId = new Map(
        reviews.map((r) => [r.orderId, r.rating]),
      );
      const lines = await this.prisma.restaurantOrderItem.findMany({
        where: { orderId: { in: orderIds } },
        select: { orderId: true, menuItemId: true },
      });
      const menuIdsPerOrder = new Map<string, Set<string>>();
      for (const l of lines) {
        if (!itemIdSet.has(l.menuItemId)) continue;
        if (!menuIdsPerOrder.has(l.orderId)) {
          menuIdsPerOrder.set(l.orderId, new Set());
        }
        menuIdsPerOrder.get(l.orderId)!.add(l.menuItemId);
      }
      for (const rev of reviews) {
        const mids = menuIdsPerOrder.get(rev.orderId);
        if (!mids) continue;
        for (const mid of mids) {
          ratingSum.set(mid, (ratingSum.get(mid) || 0) + rev.rating);
          ratingCnt.set(mid, (ratingCnt.get(mid) || 0) + 1);
        }
      }
    }

    const menu = items.map((item) => {
      const n = ratingCnt.get(item.id) || 0;
      const avg =
        n > 0 ? Math.round((ratingSum.get(item.id)! / n) * 10) / 10 : null;
      return {
        ...item,
        timesOrdered: qtyByMenuId.get(item.id) ?? 0,
        avgRating: avg,
        ratingCount: n,
      };
    });
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
        description: dto.description && dto.description.trim() ? dto.description.trim() : null,
        price: dto.price,
        imageUrl: dto.imageUrl && dto.imageUrl.trim() ? dto.imageUrl.trim() : null,
        sortOrder: dto.sortOrder != null ? dto.sortOrder : 0,
        dietaryType:
          dto.dietaryType && ['veg', 'egg', 'non_veg'].includes(dto.dietaryType)
            ? dto.dietaryType
            : null,
        allergens: Array.isArray(dto.allergens)
          ? dto.allergens.map((a) => String(a).trim()).filter(Boolean)
          : [],
        allergenIconUrls: Array.isArray(dto.allergenIconUrls)
          ? dto.allergenIconUrls.map((a) => String(a).trim()).filter(Boolean)
          : [],
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
      ...(dto.description !== undefined && {
        description: dto.description && String(dto.description).trim()
          ? String(dto.description).trim()
          : null,
      }),
      ...(dto.price != null && { price: dto.price }),
      ...(dto.imageUrl !== undefined && { imageUrl: dto.imageUrl && dto.imageUrl.trim() ? dto.imageUrl.trim() : null }),
      ...(dto.sortOrder != null && { sortOrder: dto.sortOrder }),
      ...(dto.categoryId !== undefined && {
        categoryId: dto.categoryId && dto.categoryId.trim() ? dto.categoryId.trim() : null,
      }),
      ...(dto.allergens !== undefined && {
        allergens: Array.isArray(dto.allergens)
          ? dto.allergens.map((a) => String(a).trim()).filter(Boolean)
          : [],
      }),
      ...(dto.allergenIconUrls !== undefined && {
        allergenIconUrls: Array.isArray(dto.allergenIconUrls)
          ? dto.allergenIconUrls.map((a) => String(a).trim()).filter(Boolean)
          : [],
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

  async importItemsFromCsv(
    file: Express.Multer.File,
    currentUserId: string,
    role: string,
    userId?: string,
  ) {
    if (!file?.buffer) {
      throw new BadRequestException('CSV file is required');
    }
    const ownerId =
      role === 'admin' || role === 'superAdmin'
        ? userId || currentUserId
        : currentUserId;
    if (
      role !== 'admin' &&
      role !== 'superAdmin' &&
      userId &&
      userId !== currentUserId
    ) {
      throw new ForbiddenException('You can only import your own menu');
    }

    const raw = file.buffer.toString('utf-8').replace(/^\uFEFF/, '');
    const rows = this.parseCsvRows(raw);
    if (!rows.length) {
      throw new BadRequestException('CSV is empty');
    }

    const header = rows[0].map((h) => this.normalizeCsvHeader(h));
    const idx = (keys: string[]) =>
      keys.find((k) => header.indexOf(k) >= 0)
        ? header.indexOf(keys.find((k) => header.indexOf(k) >= 0)!)
        : -1;

    const iName = idx(['item_name', 'itemname', 'name']);
    const iDescription = idx(['description', 'descrioption', 'desc']);
    const iCategory = idx(['category', 'category_name']);
    const iPrice = idx(['price']);
    const iImage = idx(['image_url', 'imageurl', 'image']);
    const iVeg = idx(['veg_nonveg', 'veg_non_veg', 'dietary_type', 'vegnonveg']);
    const iAllergens = idx(['allergens', 'allergen']);

    if (iName < 0 || iPrice < 0) {
      throw new BadRequestException(
        'CSV must include item_name and price columns',
      );
    }

    // Replace mode: clear previous menu data before importing CSV.
    await this.prisma.$transaction([
      this.prisma.menuItem.deleteMany({ where: { userId: ownerId } }),
      this.prisma.menuCategory.deleteMany({ where: { userId: ownerId } }),
    ]);
    const catByKey = new Map<string, { id: string; name: string }>();

    const toCreate: Array<{
      userId: string;
      categoryId: string | null;
      itemName: string;
      description: string | null;
      price: number;
      imageUrl: string | null;
      dietaryType: string | null;
      allergens: string[];
      allergenIconUrls: string[];
      sortOrder: number;
    }> = [];
    const errors: Array<{ row: number; reason: string }> = [];

    for (let r = 1; r < rows.length; r += 1) {
      const cells = rows[r];
      const rowNo = r + 1;
      const itemName = String(cells[iName] || '').trim();
      const priceRaw = String(cells[iPrice] || '').trim();
      if (!itemName) {
        errors.push({ row: rowNo, reason: 'Missing item_name' });
        continue;
      }
      const price = Number(priceRaw);
      if (!Number.isFinite(price) || price < 0) {
        errors.push({ row: rowNo, reason: 'Invalid price' });
        continue;
      }

      const categoryName =
        iCategory >= 0 ? String(cells[iCategory] || '').trim() : '';
      let categoryId: string | null = null;
      if (categoryName) {
        const key = categoryName.toLowerCase();
        let cat = catByKey.get(key) || null;
        if (!cat) {
          cat = await this.prisma.menuCategory.create({
            data: {
              userId: ownerId,
              name: categoryName,
              sortOrder: catByKey.size,
            },
          });
          catByKey.set(key, cat);
        }
        categoryId = cat.id;
      }

      const vegRaw = iVeg >= 0 ? String(cells[iVeg] || '').toLowerCase().trim() : '';
      const dietaryType =
        vegRaw === 'veg' || vegRaw === 'vegetarian'
          ? 'veg'
          : vegRaw === 'egg' || vegRaw === 'egg_veg'
            ? 'egg'
            : vegRaw === 'non-veg' ||
              vegRaw === 'non_veg' ||
              vegRaw === 'nonveg'
              ? 'non_veg'
              : null;

      const allergensRaw =
        iAllergens >= 0 ? String(cells[iAllergens] || '').trim() : '';
      const allergens = allergensRaw
        ? allergensRaw
            .split(',')
            .map((a) => a.trim().toLowerCase())
            .filter(Boolean)
        : [];

      toCreate.push({
        userId: ownerId,
        categoryId,
        itemName,
        description:
          iDescription >= 0 && String(cells[iDescription] || '').trim()
            ? String(cells[iDescription] || '').trim()
            : null,
        price,
        imageUrl:
          iImage >= 0 && String(cells[iImage] || '').trim()
            ? String(cells[iImage] || '').trim()
            : null,
        dietaryType,
        allergens,
        allergenIconUrls: [],
        sortOrder: r - 1,
      });
    }

    if (toCreate.length > 0) {
      await this.prisma.menuItem.createMany({ data: toCreate });
    }

    return {
      importedCount: toCreate.length,
      failedCount: errors.length,
      errors,
      categoryCount: catByKey.size,
      replacedPrevious: true,
    };
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

  /** Delete menu file by id for owner/admin */
  async removeMenuFile(id: string, currentUserId: string, role: string) {
    const existing = await this.prisma.menuFile.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Menu file not found');
    if (
      role !== 'admin' &&
      role !== 'superAdmin' &&
      existing.userId !== currentUserId
    ) {
      throw new ForbiddenException('You can only delete your own menu files');
    }

    // Best-effort: remove file from R2 if URL belongs to current public bucket.
    try {
      const publicUrl = this.r2Storage.getPublicUrl('').replace(/\/$/, '');
      const fileUrl = String(existing.fileUrl || '').trim();
      const key = fileUrl.startsWith(publicUrl)
        ? fileUrl.slice(publicUrl.length + 1)
        : '';
      if (key) {
        await this.r2Storage.deleteFile(key);
      }
    } catch {
      // Keep DB deletion authoritative even if file object cleanup fails.
    }

    await this.prisma.menuFile.delete({ where: { id } });
    return { deleted: true };
  }

  /**
   * Public Foodpanda-style browse: restaurants whose menu matches a category.
   * Media priority: short/video thumbnail → owner photo → matching menu item image.
   */
  async browseByCategory(category: string, page = 1, limit = 20) {
    const filter = String(category || '').trim();
    if (!filter) {
      return { restaurants: [], page, limit, total: 0 };
    }

    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.min(50, Math.max(1, Number(limit) || 20));

    const items = await this.prisma.menuItem.findMany({
      where: {
        user: {
          role: { in: ['owner', 'vendor'] },
        },
      },
      include: {
        category: true,
        user: {
          select: {
            id: true,
            name: true,
            nickname: true,
            address: true,
            photos: true,
            role: true,
          },
        },
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });

    type OwnerAgg = {
      owner: (typeof items)[0]['user'];
      matchingItems: typeof items;
    };
    const byOwner = new Map<string, OwnerAgg>();

    for (const item of items) {
      if (!item.userId || !item.user) continue;
      if (!menuItemMatchesCategory(item, filter)) continue;
      const oid = String(item.userId);
      if (!byOwner.has(oid)) {
        byOwner.set(oid, { owner: item.user, matchingItems: [] });
      }
      byOwner.get(oid)!.matchingItems.push(item);
    }

    const ownerIds = getOwnerIdsSorted(byOwner);
    const total = ownerIds.length;
    const pageIds = ownerIds.slice(
      (safePage - 1) * safeLimit,
      safePage * safeLimit,
    );

    if (pageIds.length === 0) {
      return { restaurants: [], page: safePage, limit: safeLimit, total };
    }

    const [orderAgg, shorts, videos, reviewAgg] = await Promise.all([
      this.prisma.restaurantOrder.groupBy({
        by: ['ownerId'],
        where: { ownerId: { in: pageIds }, status: { not: 'cancelled' } },
        _count: { _all: true },
      }),
      this.prisma.short.findMany({
        where: {
          userId: { in: pageIds },
          visibility: 'public',
          status: 'ready',
        },
        orderBy: [{ viewCount: 'desc' }, { createdAt: 'desc' }],
        select: {
          id: true,
          userId: true,
          videoUrl: true,
          thumbnailUrl: true,
          coverUrl: true,
          viewCount: true,
        },
      }),
      this.prisma.video.findMany({
        where: {
          userId: { in: pageIds },
          visibility: 'public',
          status: 'ready',
        },
        orderBy: [{ viewCount: 'desc' }, { createdAt: 'desc' }],
        select: {
          id: true,
          userId: true,
          videoUrl: true,
          thumbnailUrl: true,
          viewCount: true,
        },
      }),
      this.prisma.restaurantOrderReview.groupBy({
        by: ['ownerId'],
        where: { ownerId: { in: pageIds } },
        _avg: { rating: true },
        _count: { _all: true },
      }),
    ]);

    const orderCountMap = new Map(
      orderAgg.map((r) => [String(r.ownerId), r._count._all]),
    );
    const reviewMap = new Map(
      reviewAgg.map((r) => [
        String(r.ownerId),
        {
          rating: r._avg.rating ?? 0,
          count: r._count._all,
        },
      ]),
    );
    const shortByOwner = pickFirstMediaByOwner(shorts);
    const videoByOwner = pickFirstMediaByOwner(videos);

    const discovery = resolveDiscoveryCategory(filter);
    const categoryLabel = discovery?.label || filter;

    const restaurants = pageIds.map((oid) => {
      const agg = byOwner.get(oid)!;
      const owner = agg.owner;
      const matchingItems = agg.matchingItems;
      const short = shortByOwner.get(oid);
      const video = videoByOwner.get(oid);
      const review = reviewMap.get(oid) || { rating: 0, count: 0 };

      const ownerPhoto = readOwnerPhoto(owner.photos);
      const menuImage =
        matchingItems.find((m) => m.imageUrl)?.imageUrl || null;

      let mediaType: 'short' | 'video' | 'image' = 'image';
      let mediaId = '';
      let mediaUrl = '';
      let mediaThumb = ownerPhoto || menuImage || '';

      if (short?.videoUrl) {
        mediaType = 'short';
        mediaId = short.id;
        mediaUrl = short.videoUrl;
        mediaThumb =
          short.thumbnailUrl || short.coverUrl || mediaThumb;
      } else if (video?.videoUrl) {
        mediaType = 'video';
        mediaId = video.id;
        mediaUrl = video.videoUrl;
        mediaThumb = video.thumbnailUrl || mediaThumb;
      } else if (menuImage) {
        mediaThumb = menuImage;
      }

      const totalViews =
        Number(short?.viewCount || 0) + Number(video?.viewCount || 0);

      return {
        id: oid,
        name: owner.nickname || owner.name || 'Restaurant',
        address: owner.address || 'Near you',
        orderCount: orderCountMap.get(oid) || 0,
        rating: Math.round((review.rating || 0) * 10) / 10,
        reviewCount: review.count,
        mediaType,
        mediaId,
        mediaUrl,
        mediaThumb,
        totalViews,
        categoryLabel,
        matchingItemCount: matchingItems.length,
        matchingItems: matchingItems.slice(0, 6).map((m) => ({
          id: m.id,
          itemName: m.itemName,
          price: m.price,
          imageUrl: m.imageUrl,
          categoryName: m.category?.name || null,
        })),
      };
    });

    return {
      restaurants,
      page: safePage,
      limit: safeLimit,
      total,
      category: discovery?.key || filter.toLowerCase(),
      categoryLabel,
    };
  }
}

function getOwnerIdsSorted(byOwner: Map<string, { matchingItems: { id: string }[]; owner: { id: string } }>) {
  return Array.from(byOwner.entries())
    .sort((a, b) => b[1].matchingItems.length - a[1].matchingItems.length)
    .map(([id]) => id);
}

function pickFirstMediaByOwner<T extends { userId: string }>(rows: T[]) {
  const map = new Map<string, T>();
  for (const row of rows) {
    const id = String(row.userId);
    if (!map.has(id)) map.set(id, row);
  }
  return map;
}

function readOwnerPhoto(photos: unknown): string {
  if (!Array.isArray(photos) || photos.length === 0) return '';
  const first = photos[0];
  if (typeof first === 'string') return first.trim();
  if (first && typeof first === 'object' && 'src' in first) {
    return String((first as { src?: string }).src || '').trim();
  }
  return '';
}
