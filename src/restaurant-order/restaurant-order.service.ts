import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRestaurantOrderDto } from './dto/create-restaurant-order.dto';
import { RestaurantOrderStatus } from '@prisma/client';
import { NotificationService } from '../notification/notification.service';

@Injectable()
export class RestaurantOrderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  async create(userId: string, dto: CreateRestaurantOrderDto) {
    if (!dto.items?.length) {
      throw new BadRequestException('At least one item is required');
    }
    const menuItemIds = dto.items.map((i) => i.menuItemId);
    const menuItems = await this.prisma.menuItem.findMany({
      where: { id: { in: menuItemIds }, userId: dto.ownerId },
    });
    if (menuItems.length !== menuItemIds.length) {
      throw new BadRequestException('Some menu items not found or do not belong to this restaurant');
    }
    const map = new Map(menuItems.map((m) => [m.id, m]));
    let totalAmount = 0;
    const orderItemsData = dto.items.map((item) => {
      const menuItem = map.get(item.menuItemId);
      if (!menuItem) throw new BadRequestException(`Menu item ${item.menuItemId} not found`);
      const subtotal = menuItem.price * item.quantity;
      totalAmount += subtotal;
      return {
        menuItemId: menuItem.id,
        itemName: menuItem.itemName,
        unitPrice: menuItem.price,
        quantity: item.quantity,
      };
    });

    const order = await this.prisma.restaurantOrder.create({
      data: {
        userId,
        ownerId: dto.ownerId,
        status: 'pending',
        totalAmount,
        currency: 'BDT',
        deliveryAddress: dto.deliveryAddress ?? null,
        items: {
          create: orderItemsData,
        },
      },
      include: {
        items: true,
        user: { select: { id: true, name: true, email: true, phone: true, photos: true } },
        owner: {
          select: {
            id: true,
            name: true,
            nickname: true,
            email: true,
            phone: true,
            photos: true,
          },
        },
      },
    });

    // Notify restaurant owner of new order (real-time)
    try {
      const customerName = order.user?.name || 'A customer';
      await this.notificationService.createNotification({
        userId: order.ownerId,
        message: `New order from ${customerName}`,
        type: 'restaurant_order',
        contentId: order.id,
      });
    } catch (e) {
      // Non-blocking
    }

    return order;
  }

  async findAll(
    currentUserId: string,
    role: string,
    opts?: {
      status?: RestaurantOrderStatus;
      scope?: string;
      page?: number;
      limit?: number;
    },
  ) {
    const page = Math.max(1, opts?.page ?? 1);
    const limit = Math.min(100, Math.max(1, opts?.limit ?? 20));
    const skip = (page - 1) * limit;

    let where: {
      userId?: string;
      ownerId?: string;
      status?: RestaurantOrderStatus;
    } = {};
    const normalizedRole = String(role || '').toLowerCase();
    const normalizedScope = String(opts?.scope || '').toLowerCase();
    if (role === 'user') {
      where.userId = currentUserId;
    } else if (normalizedRole === 'owner' || normalizedRole === 'vendor') {
      if (normalizedScope === 'customer' || normalizedScope === 'mine') {
        where.userId = currentUserId;
      } else {
        where.ownerId = currentUserId;
      }
    }
    // admin / superAdmin: no extra filter (all orders)
    if (opts?.status) {
      where.status = opts.status;
    }

    const [orders, total] = await Promise.all([
      this.prisma.restaurantOrder.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          items: true,
          user: { select: { id: true, name: true, email: true, phone: true, photos: true } },
          owner: {
            select: {
              id: true,
              name: true,
              nickname: true,
              email: true,
              phone: true,
              photos: true,
            },
          },
        },
      }),
      this.prisma.restaurantOrder.count({ where }),
    ]);

    return { orders, total, page, limit };
  }

  async findOne(id: string, currentUserId: string, role: string) {
    const order = await this.prisma.restaurantOrder.findUnique({
      where: { id },
      include: {
        items: true,
        user: { select: { id: true, name: true, email: true, phone: true, photos: true } },
        owner: {
          select: {
            id: true,
            name: true,
            nickname: true,
            email: true,
            phone: true,
            photos: true,
          },
        },
      },
    });
    if (!order) throw new NotFoundException('Order not found');
    const canAccess =
      order.userId === currentUserId ||
      order.ownerId === currentUserId ||
      role === 'admin' ||
      role === 'superAdmin';
    if (!canAccess) throw new ForbiddenException('You cannot view this order');
    return order;
  }

  async upsertReview(
    orderId: string,
    currentUserId: string,
    role: string,
    dto: { rating: number; comment?: string },
  ) {
    const prisma = this.prisma as any;
    const order = await this.prisma.restaurantOrder.findUnique({
      where: { id: orderId },
    });
    if (!order) throw new NotFoundException('Order not found');
    const r = String(role || '').toLowerCase();
    const isAdmin = r === 'admin' || r === 'superadmin';
    const isCustomer = r === 'user' && order.userId === currentUserId;
    if (!isAdmin && !isCustomer) {
      throw new ForbiddenException('You cannot review this order');
    }

    const comment =
      dto.comment != null && String(dto.comment).trim()
        ? String(dto.comment).trim()
        : null;

    if (isAdmin) {
      const existing = await prisma.restaurantOrderReview.findUnique({
        where: { orderId },
      });
      if (!existing) throw new NotFoundException('Review not found');
      return prisma.restaurantOrderReview.update({
        where: { orderId },
        data: {
          rating: dto.rating,
          comment,
        },
      });
    }

    return prisma.restaurantOrderReview.upsert({
      where: { orderId },
      update: {
        rating: dto.rating,
        comment,
      },
      create: {
        orderId,
        userId: currentUserId,
        ownerId: order.ownerId,
        rating: dto.rating,
        comment,
      },
    });
  }

  async getReview(orderId: string, currentUserId: string, role: string) {
    const prisma = this.prisma as any;
    const order = await this.prisma.restaurantOrder.findUnique({
      where: { id: orderId },
    });
    if (!order) throw new NotFoundException('Order not found');
    const canAccess =
      order.userId === currentUserId ||
      order.ownerId === currentUserId ||
      role === 'admin' ||
      role === 'superAdmin';
    if (!canAccess) throw new ForbiddenException('You cannot view this review');
    return prisma.restaurantOrderReview.findUnique({ where: { orderId } });
  }

  async deleteReview(orderId: string, currentUserId: string, role: string) {
    const prisma = this.prisma as any;
    const order = await this.prisma.restaurantOrder.findUnique({
      where: { id: orderId },
    });
    if (!order) throw new NotFoundException('Order not found');
    const isAdmin = role === 'admin' || role === 'superAdmin';
    const isCustomer = role === 'user' && order.userId === currentUserId;
    if (!isAdmin && !isCustomer) {
      throw new ForbiddenException('You cannot delete this review');
    }
    const existing = await prisma.restaurantOrderReview.findUnique({
      where: { orderId },
    });
    if (!existing) throw new NotFoundException('Review not found');
    await prisma.restaurantOrderReview.delete({ where: { orderId } });
    return { deleted: true };
  }

  async listReviews(
    currentUserId: string,
    role: string,
    opts?: { page?: number; perPage?: number },
  ) {
    const prisma = this.prisma as any;
    const r = (role || '').toLowerCase();
    if (r !== 'admin' && r !== 'superadmin') {
      throw new ForbiddenException('Admins only');
    }
    const page = Math.max(1, opts?.page ?? 1);
    const perPage = Math.min(200, Math.max(1, opts?.perPage ?? 50));
    const skip = (page - 1) * perPage;
    const [items, total] = await Promise.all([
      prisma.restaurantOrderReview.findMany({
        skip,
        take: perPage,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, name: true, nickname: true, email: true } },
          owner: { select: { id: true, name: true, nickname: true, email: true } },
          order: { select: { id: true, status: true, totalAmount: true, currency: true, createdAt: true } },
        },
      }),
      prisma.restaurantOrderReview.count(),
    ]);
    return { items, total, page, perPage };
  }

  /** My subscribers (followers) who ordered from a restaurant owner. */
  async listMySubscribersWhoOrderedFromOwner(currentUserId: string, ownerId: string) {
    if (!ownerId) throw new BadRequestException('ownerId is required');

    const subs = await this.prisma.channelSubscription.findMany({
      where: { channelUserId: currentUserId },
      select: { subscriberId: true },
    });
    const subscriberIds = subs.map((s) => s.subscriberId);
    if (subscriberIds.length === 0) return { items: [] };

    const ordered = await this.prisma.restaurantOrder.findMany({
      where: { ownerId, userId: { in: subscriberIds } },
      select: { userId: true },
      distinct: ['userId'],
    });
    const orderedUserIds = ordered.map((o) => o.userId);
    if (orderedUserIds.length === 0) return { items: [] };

    const users = await this.prisma.user.findMany({
      where: { id: { in: orderedUserIds } },
      select: { id: true, name: true, nickname: true, email: true, photos: true },
      orderBy: { createdAt: 'desc' },
    });

    return {
      items: users.map((u) => {
        const p0 = Array.isArray(u.photos) ? (u.photos[0] as any) : null;
        return {
          id: u.id,
          name: u.nickname || u.name || u.email,
          nickname: u.nickname,
          email: u.email,
          avatar: p0?.src ?? p0 ?? null,
        };
      }),
    };
  }

  async updateStatus(
    id: string,
    currentUserId: string,
    role: string,
    status: RestaurantOrderStatus,
  ) {
    const order = await this.prisma.restaurantOrder.findUnique({ where: { id } });
    if (!order) throw new NotFoundException('Order not found');
    const canUpdate = order.ownerId === currentUserId || role === 'admin' || role === 'superAdmin';
    if (!canUpdate) throw new ForbiddenException('You cannot update this order');
    return this.prisma.restaurantOrder.update({
      where: { id },
      data: { status },
      include: {
        items: true,
        user: { select: { id: true, name: true, email: true, phone: true, photos: true } },
        owner: {
          select: {
            id: true,
            name: true,
            nickname: true,
            email: true,
            phone: true,
            photos: true,
          },
        },
      },
    });
  }

  /** Owner earnings: completed orders count and total. Withdrawals placeholder. */
  async getEarnings(ownerId: string) {
    const where = { ownerId, status: 'completed' as RestaurantOrderStatus };
    const [completedOrders, agg] = await Promise.all([
      this.prisma.restaurantOrder.count({ where }),
      this.prisma.restaurantOrder.aggregate({
        where,
        _sum: { totalAmount: true },
      }),
    ]);
    const totalEarning = agg._sum.totalAmount ?? 0;
    return {
      completedOrders,
      totalEarning,
      currency: 'BDT',
      withdrawals: [] as { id: string; date: string; amount: number; transNo: string }[],
    };
  }

  async getTopRestaurantsByOrders(page = 1, limit = 20) {
    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.min(50, Math.max(1, Number(limit) || 20));
    const skip = (safePage - 1) * safeLimit;

    const grouped = await this.prisma.restaurantOrder.groupBy({
      by: ['ownerId'],
      _count: { _all: true },
      orderBy: { _count: { ownerId: 'desc' } },
      skip,
      take: safeLimit,
    });

    const ownerIds = grouped.map((g) => g.ownerId).filter(Boolean);
    if (ownerIds.length === 0) {
      return { restaurants: [], page: safePage, limit: safeLimit };
    }

    const owners = await this.prisma.user.findMany({
      where: { id: { in: ownerIds } },
      select: {
        id: true,
        name: true,
        nickname: true,
        address: true,
        photos: true,
        role: true,
      },
    });

    const ownerMap = new Map(owners.map((o) => [String(o.id), o]));
    const restaurants = grouped
      .map((g) => {
        const owner = ownerMap.get(String(g.ownerId));
        if (!owner) return null;
        return {
          ...owner,
          orderCount: g._count?._all || 0,
        };
      })
      .filter(Boolean);

    return {
      restaurants,
      page: safePage,
      limit: safeLimit,
    };
  }
}
