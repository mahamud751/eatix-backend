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
        owner: { select: { id: true, name: true, email: true, phone: true } },
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
    opts?: { status?: RestaurantOrderStatus; page?: number; limit?: number },
  ) {
    const page = Math.max(1, opts?.page ?? 1);
    const limit = Math.min(100, Math.max(1, opts?.limit ?? 20));
    const skip = (page - 1) * limit;

    let where: { userId?: string; ownerId?: string; status?: RestaurantOrderStatus } = {};
    if (role === 'user') {
      where.userId = currentUserId;
    } else if (role === 'owner' || role === 'vendor') {
      where.ownerId = currentUserId;
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
          owner: { select: { id: true, name: true, email: true, phone: true } },
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
        owner: { select: { id: true, name: true, email: true, phone: true } },
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
        owner: { select: { id: true, name: true, email: true, phone: true } },
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
}
