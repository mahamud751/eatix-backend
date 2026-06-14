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
import {
  haversineKm,
  isValidCoord,
  UK_DEFAULT_RADIUS_KM,
  resolveTaxChargeForDistanceKm,
  resolveOwnerAreaKm,
} from '../common/geo.util';
import { isValidUkPhone, normalizeUkPhone, extractPhoneFromDeliveryAddress } from '../common/phone.util';
import {
  calcPercentDiscount,
  findMatchingTier,
  getFreeTaxChargeTier,
  isPromotionActive,
  matchesFulfillmentScope,
  parsePercentDiscountTiers,
  parsePromotionTiers,
} from '../promotion/promotion-discount.util';

const ORDER_INCLUDE = {
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
      deliveryTime: true,
      contentAreaKm: true,
      pickupAreaKm: true,
      deliveryAreaKm: true,
    },
  },
  rider: {
    select: {
      id: true,
      name: true,
      nickname: true,
      email: true,
      phone: true,
      photos: true,
    },
  },
  riderReview: {
    include: {
      user: {
        select: {
          id: true,
          name: true,
          nickname: true,
          email: true,
          photos: true,
        },
      },
    },
  },
} as const;

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

    let deliveryAddress = String(dto.deliveryAddress || '').trim();
    let phoneRaw = String(dto.customerPhone || '').trim();
    if (!phoneRaw && deliveryAddress) {
      const extracted = extractPhoneFromDeliveryAddress(deliveryAddress);
      if (extracted.phone) {
        phoneRaw = extracted.phone;
        deliveryAddress = extracted.deliveryAddress;
      }
    }

    console.log('[RestaurantOrder.create]', {
      userId,
      ownerId: dto.ownerId,
      itemCount: dto.items.length,
      customerPhone: dto.customerPhone,
      phoneRaw,
      deliveryAddressPreview: deliveryAddress.slice(0, 80),
    });

    if (!phoneRaw || !isValidUkPhone(phoneRaw)) {
      throw new BadRequestException(
        'A valid UK contact phone number is required to place an order',
      );
    }
    const customerPhone = normalizeUkPhone(phoneRaw);
    const fulfillmentType = String(dto.fulfillmentType || 'delivery').toLowerCase();
    const isCollection = fulfillmentType === 'collection';

    if (!isCollection && !deliveryAddress) {
      throw new BadRequestException('Delivery address is required');
    }
    const menuItemIds = dto.items.map((i) => i.menuItemId);
    const menuItems = await this.prisma.menuItem.findMany({
      where: { id: { in: menuItemIds }, userId: dto.ownerId },
    });
    if (menuItems.length !== menuItemIds.length) {
      throw new BadRequestException('Some menu items not found or do not belong to this restaurant');
    }

    const owner = await this.prisma.user.findUnique({
      where: { id: dto.ownerId },
      select: {
        id: true,
        latitude: true,
        longitude: true,
        contentAreaKm: true,
        pickupAreaKm: true,
        deliveryAreaKm: true,
        deliveryTime: true,
        taxCharge0To10Km: true,
        taxCharge11To20Km: true,
        taxCharge21To30Km: true,
        nickname: true,
        name: true,
        address: true,
        postcode: true,
      },
    });
    if (!owner) {
      throw new BadRequestException('Restaurant not found');
    }

    const maxAreaKm = resolveOwnerAreaKm(
      owner,
      isCollection ? 'pickup' : 'delivery',
    );

    let customerLat = dto.customerLatitude;
    let customerLng = dto.customerLongitude;
    if (!isValidCoord(customerLat) || !isValidCoord(customerLng)) {
      const customer = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { latitude: true, longitude: true },
      });
      customerLat = customer?.latitude ?? customerLat;
      customerLng = customer?.longitude ?? customerLng;
    }

    let distanceKm: number | null = null;
    if (
      isValidCoord(owner.latitude) &&
      isValidCoord(owner.longitude) &&
      isValidCoord(customerLat) &&
      isValidCoord(customerLng)
    ) {
      distanceKm = haversineKm(
        owner.latitude!,
        owner.longitude!,
        customerLat!,
        customerLng!,
      );
    }

    if (maxAreaKm != null) {
      if (!isValidCoord(owner.latitude) || !isValidCoord(owner.longitude)) {
        throw new BadRequestException(
          'This restaurant has not set a shop location yet. Orders are unavailable until they update their profile.',
        );
      }

      if (distanceKm == null) {
        throw new BadRequestException(
          isCollection
            ? 'Set your location in your profile so we can check you are within this restaurant pickup area.'
            : 'Set your delivery location on the map or use "Use my location" so we can check you are within the restaurant delivery area.',
        );
      }

      if (distanceKm > maxAreaKm) {
        const restaurantName =
          owner.nickname || owner.name || 'This restaurant';
        if (isCollection) {
          throw new BadRequestException(
            `${restaurantName} only accepts pickup orders within ${maxAreaKm} km. Your location is about ${distanceKm.toFixed(1)} km away.`,
          );
        }
        throw new BadRequestException(
          `${restaurantName} only delivers within ${maxAreaKm} km. Your delivery location is about ${distanceKm.toFixed(1)} km away.`,
        );
      }
    }

    if (isCollection && !deliveryAddress) {
      const restaurantLabel = owner.nickname || owner.name || 'Restaurant';
      const addrParts = [String(owner.address || '').trim(), String(owner.postcode || '').trim()]
        .filter(Boolean);
      deliveryAddress = addrParts.length
        ? `Pick up — ${restaurantLabel}, ${addrParts.join(', ')}`
        : `Pick up — ${restaurantLabel}`;
    }

    const taxCharge = isCollection
      ? 0
      : resolveTaxChargeForDistanceKm(distanceKm, owner);

    const map = new Map(menuItems.map((m) => [m.id, m]));
    let itemsSubtotal = 0;
    const orderItemsData = dto.items.map((item) => {
      const menuItem = map.get(item.menuItemId);
      if (!menuItem) throw new BadRequestException(`Menu item ${item.menuItemId} not found`);
      const subtotal = menuItem.price * item.quantity;
      itemsSubtotal += subtotal;
      return {
        menuItemId: menuItem.id,
        itemName: menuItem.itemName,
        unitPrice: menuItem.price,
        quantity: item.quantity,
      };
    });

    let effectiveTaxCharge = taxCharge;
    let discountAmount = 0;
    let appliedPromotionId: string | undefined;
    let appliedPromoCode: string | undefined;

    const fulfillmentKey = isCollection ? 'collection' : 'delivery';

    const applyPromoToOrder = (promo: {
      id: string;
      promoCode?: string | null;
      promoAmount?: number | null;
      offerType?: string | null;
      fulfillmentScopes?: string[] | null;
      discountTiers?: unknown;
    }) => {
      const offerType = promo.offerType || 'order';
      const allTiers = parsePromotionTiers(promo.discountTiers);
      const freeTaxTier =
        !isCollection &&
        matchesFulfillmentScope(promo.fulfillmentScopes, fulfillmentKey)
          ? getFreeTaxChargeTier(allTiers, itemsSubtotal)
          : null;
      if (freeTaxTier) {
        effectiveTaxCharge = 0;
      }

      const billBeforeDiscount = itemsSubtotal + effectiveTaxCharge;

      if (offerType === 'order') {
        const percentTiers = parsePercentDiscountTiers(promo.discountTiers);
        if (percentTiers.length) {
          if (!matchesFulfillmentScope(promo.fulfillmentScopes, fulfillmentKey)) {
            throw new BadRequestException(
              'This promotion does not apply to this order type',
            );
          }
          const tier = findMatchingTier(percentTiers, billBeforeDiscount, 'amount');
          if (!tier && !freeTaxTier) {
            throw new BadRequestException(
              'Order total does not qualify for this promotion',
            );
          }
          if (tier) {
            discountAmount = calcPercentDiscount(billBeforeDiscount, tier.percent);
          }
        } else if (freeTaxTier) {
          // Tax/charges waived only
        } else if (
          allTiers.some((t) => t.benefit === 'free_tax_charge')
        ) {
          throw new BadRequestException(
            'Order total does not qualify for free delivery charges',
          );
        } else {
          discountAmount = calcPercentDiscount(
            itemsSubtotal,
            Number(promo.promoAmount),
          );
        }
      } else if (offerType === 'amount_discount') {
        if (!matchesFulfillmentScope(promo.fulfillmentScopes, fulfillmentKey)) {
          throw new BadRequestException(
            'This amount discount does not apply to this order type',
          );
        }
        const tier = findMatchingTier(
          parsePercentDiscountTiers(promo.discountTiers),
          billBeforeDiscount,
          'amount',
        );
        if (!tier) {
          throw new BadRequestException(
            'Order total does not qualify for this amount discount',
          );
        }
        discountAmount = calcPercentDiscount(billBeforeDiscount, tier.percent);
      } else {
        throw new BadRequestException('This promotion is not valid for orders');
      }
      appliedPromotionId = promo.id;
      appliedPromoCode = promo.promoCode || undefined;
    };

    if (dto.promotionId || dto.promoCode?.trim()) {
      const promo = dto.promotionId
        ? await this.prisma.promotion.findFirst({
            where: {
              id: dto.promotionId,
              userId: dto.ownerId,
            },
          })
        : await this.prisma.promotion.findFirst({
            where: {
              userId: dto.ownerId,
              promoCode: dto.promoCode!.trim(),
              offerType: 'order',
            },
          });
      if (!promo || !isPromotionActive(promo)) {
        throw new BadRequestException('Invalid or expired promotion');
      }
      if (dto.promoCode?.trim() && promo.promoCode !== dto.promoCode.trim()) {
        throw new BadRequestException('Promotion code does not match');
      }
      applyPromoToOrder(promo);
    } else {
      const amountPromos = await this.prisma.promotion.findMany({
        where: {
          userId: dto.ownerId,
          offerType: { in: ['amount_discount', 'order'] },
          startDate: { lte: new Date() },
          expireDate: { gte: new Date() },
        },
        orderBy: { createdAt: 'desc' },
      });
      for (const promo of amountPromos) {
        if (!matchesFulfillmentScope(promo.fulfillmentScopes, fulfillmentKey)) {
          continue;
        }
        const percentTiers = parsePercentDiscountTiers(promo.discountTiers);
        if (!percentTiers.length) {
          continue;
        }
        effectiveTaxCharge = taxCharge;
        discountAmount = 0;
        const billBeforeDiscount = itemsSubtotal + effectiveTaxCharge;
        const tier = findMatchingTier(percentTiers, billBeforeDiscount, 'amount');
        if (tier) {
          discountAmount = calcPercentDiscount(billBeforeDiscount, tier.percent);
          appliedPromotionId = promo.id;
          break;
        }
      }
    }

    const totalAmount = Math.max(0, itemsSubtotal + effectiveTaxCharge - discountAmount);

    const order = await this.prisma.restaurantOrder.create({
      data: {
        userId,
        ownerId: dto.ownerId,
        status: 'pending',
        totalAmount,
        taxCharge: effectiveTaxCharge,
        discountAmount,
        promotionId: appliedPromotionId,
        promoCode: appliedPromoCode,
        deliveryDistanceKm: isCollection ? undefined : distanceKm ?? undefined,
        currency: 'BDT',
        deliveryAddress,
        customerPhone,
        fulfillmentType: isCollection ? 'collection' : 'delivery',
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
            deliveryTime: true,
            deliveryAreaKm: true,
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

    try {
      await this.prisma.user.update({
        where: { id: userId },
        data: { phone: customerPhone },
      });
    } catch (_) {
      // Non-blocking profile sync
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
      riderId?: string;
      status?: RestaurantOrderStatus;
    } = {};
    const normalizedRole = String(role || '').toLowerCase();
    const normalizedScope = String(opts?.scope || '').toLowerCase();
    if (normalizedRole === 'rider') {
      where.riderId = currentUserId;
    } else if (role === 'user') {
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
        include: ORDER_INCLUDE,
      }),
      this.prisma.restaurantOrder.count({ where }),
    ]);

    return { orders, total, page, limit };
  }

  async findOne(id: string, currentUserId: string, role: string) {
    const order = await this.prisma.restaurantOrder.findUnique({
      where: { id },
      include: ORDER_INCLUDE,
    });
    if (!order) throw new NotFoundException('Order not found');
    const normalizedRole = String(role || '').toLowerCase();
    const canAccess =
      order.userId === currentUserId ||
      order.ownerId === currentUserId ||
      order.riderId === currentUserId ||
      normalizedRole === 'admin' ||
      normalizedRole === 'superadmin';
    if (!canAccess) throw new ForbiddenException('You cannot view this order');
    return order;
  }

  async getOrderCounts(currentUserId: string, role: string) {
    const normalizedRole = String(role || '').toLowerCase();
    if (normalizedRole === 'rider') {
      const base = { riderId: currentUserId };
      const [assigned, inProgress, completed, rejected] = await Promise.all([
        this.prisma.restaurantOrder.count({
          where: { ...base, status: 'rider_assigned' },
        }),
        this.prisma.restaurantOrder.count({
          where: {
            ...base,
            status: { in: ['rider_accepted', 'out_for_delivery'] },
          },
        }),
        this.prisma.restaurantOrder.count({
          where: {
            ...base,
            status: { in: ['delivery_complete', 'completed'] },
          },
        }),
        this.prisma.restaurantOrder.count({
          where: { ...base, status: 'cancelled' },
        }),
      ]);
      return { pending: assigned, inProgress, completed, rejected };
    }
    if (normalizedRole === 'owner' || normalizedRole === 'vendor') {
      const base = { ownerId: currentUserId };
      const [pending, completed, rejected] = await Promise.all([
        this.prisma.restaurantOrder.count({
          where: { ...base, status: 'pending' },
        }),
        this.prisma.restaurantOrder.count({
          where: { ...base, status: 'completed' },
        }),
        this.prisma.restaurantOrder.count({
          where: { ...base, status: 'cancelled' },
        }),
      ]);
      return { pending, completed, rejected };
    }
    if (role === 'user') {
      const base = { userId: currentUserId };
      const [pending, completed, rejected] = await Promise.all([
        this.prisma.restaurantOrder.count({
          where: { ...base, status: 'pending' },
        }),
        this.prisma.restaurantOrder.count({
          where: { ...base, status: 'completed' },
        }),
        this.prisma.restaurantOrder.count({
          where: { ...base, status: 'cancelled' },
        }),
      ]);
      return { pending, completed, rejected };
    }
    return { pending: 0, completed: 0, rejected: 0 };
  }

  async assignRider(
    orderId: string,
    currentUserId: string,
    role: string,
    riderId: string,
  ) {
    const order = await this.prisma.restaurantOrder.findUnique({
      where: { id: orderId },
    });
    if (!order) throw new NotFoundException('Order not found');

    const normalizedRole = String(role || '').toLowerCase();
    const canAssign =
      order.ownerId === currentUserId ||
      normalizedRole === 'admin' ||
      normalizedRole === 'superadmin';
    if (!canAssign) {
      throw new ForbiddenException('Only the restaurant owner can assign a rider');
    }

    if (order.status === 'cancelled' || order.status === 'completed') {
      throw new BadRequestException('Cannot assign a rider to a closed order');
    }
    if (order.status !== 'preparing') {
      throw new BadRequestException(
        'Assign a rider only when the order is in preparing status',
      );
    }
    if (String(order.fulfillmentType || 'delivery').toLowerCase() === 'collection') {
      throw new BadRequestException(
        'Rider assignment is only for collection delivery orders, not pick-up orders',
      );
    }

    const rider = await this.prisma.user.findUnique({
      where: { id: riderId },
      select: { id: true, role: true, employerId: true, name: true, nickname: true },
    });
    if (!rider || String(rider.role || '').toLowerCase() !== 'rider') {
      throw new BadRequestException('Invalid rider account');
    }
    if (rider.employerId !== order.ownerId) {
      throw new BadRequestException('This rider does not belong to your restaurant');
    }

    const updated = await this.prisma.restaurantOrder.update({
      where: { id: orderId },
      data: {
        riderId,
        assignedAt: new Date(),
        status: 'rider_assigned',
      },
      include: ORDER_INCLUDE,
    });

    try {
      await this.notificationService.createNotification({
        userId: riderId,
        message: `New delivery assigned — order #${orderId.slice(0, 8)}. Please accept.`,
        type: 'restaurant_order',
        contentId: orderId,
      });
    } catch (_) {
      // non-blocking
    }

    return updated;
  }

  async rejectRiderAssignment(
    orderId: string,
    currentUserId: string,
    role: string,
  ) {
    const order = await this.prisma.restaurantOrder.findUnique({
      where: { id: orderId },
    });
    if (!order) throw new NotFoundException('Order not found');

    const normalizedRole = String(role || '').toLowerCase();
    if (normalizedRole !== 'rider' || order.riderId !== currentUserId) {
      throw new ForbiddenException(
        'Only the assigned rider can reject this assignment',
      );
    }
    if (order.status !== 'rider_assigned') {
      throw new BadRequestException(
        'Can only reject orders awaiting your acceptance',
      );
    }
    if (
      String(order.fulfillmentType || 'delivery').toLowerCase() === 'collection'
    ) {
      throw new BadRequestException('Pick-up orders do not use riders');
    }

    const updated = await this.prisma.restaurantOrder.update({
      where: { id: orderId },
      data: {
        status: 'preparing',
        riderId: null,
        assignedAt: null,
      },
      include: ORDER_INCLUDE,
    });

    if (order.ownerId) {
      try {
        await this.notificationService.createNotification({
          userId: order.ownerId,
          message: `Rider declined delivery — order #${orderId.slice(0, 8)}. Assign another rider.`,
          type: 'restaurant_order',
          contentId: orderId,
        });
      } catch (_) {
        // non-blocking
      }
    }

    return updated;
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

  private isDeliveryOrder(order: { fulfillmentType?: string | null }) {
    const ft = String(order.fulfillmentType || 'delivery').toLowerCase();
    return ft !== 'collection' && ft !== 'pickup';
  }

  async upsertRiderReview(
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
      throw new ForbiddenException('You cannot review this rider');
    }
    if (!this.isDeliveryOrder(order)) {
      throw new BadRequestException('Rider reviews apply to delivery orders only');
    }
    if (!order.riderId) {
      throw new BadRequestException('This order has no assigned rider');
    }
    if (order.status !== 'completed') {
      throw new BadRequestException(
        'You can review the rider after the order is completed',
      );
    }

    const comment =
      dto.comment != null && String(dto.comment).trim()
        ? String(dto.comment).trim()
        : null;

    if (isAdmin) {
      const existing = await prisma.restaurantOrderRiderReview.findUnique({
        where: { orderId },
      });
      if (!existing) throw new NotFoundException('Rider review not found');
      return prisma.restaurantOrderRiderReview.update({
        where: { orderId },
        data: {
          rating: dto.rating,
          comment,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              nickname: true,
              email: true,
              photos: true,
            },
          },
        },
      });
    }

    return prisma.restaurantOrderRiderReview.upsert({
      where: { orderId },
      update: {
        rating: dto.rating,
        comment,
      },
      create: {
        orderId,
        userId: currentUserId,
        riderId: order.riderId,
        rating: dto.rating,
        comment,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            nickname: true,
            email: true,
            photos: true,
          },
        },
      },
    });
  }

  async getRiderReview(orderId: string, currentUserId: string, role: string) {
    const prisma = this.prisma as any;
    const order = await this.prisma.restaurantOrder.findUnique({
      where: { id: orderId },
    });
    if (!order) throw new NotFoundException('Order not found');
    const normalizedRole = String(role || '').toLowerCase();
    const canAccess =
      order.userId === currentUserId ||
      order.ownerId === currentUserId ||
      order.riderId === currentUserId ||
      normalizedRole === 'admin' ||
      normalizedRole === 'superadmin';
    if (!canAccess) {
      throw new ForbiddenException('You cannot view this rider review');
    }
    return prisma.restaurantOrderRiderReview.findUnique({
      where: { orderId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            nickname: true,
            email: true,
            photos: true,
          },
        },
      },
    });
  }

  async deleteRiderReview(orderId: string, currentUserId: string, role: string) {
    const prisma = this.prisma as any;
    const order = await this.prisma.restaurantOrder.findUnique({
      where: { id: orderId },
    });
    if (!order) throw new NotFoundException('Order not found');
    const isAdmin = role === 'admin' || role === 'superAdmin';
    const isCustomer = role === 'user' && order.userId === currentUserId;
    if (!isAdmin && !isCustomer) {
      throw new ForbiddenException('You cannot delete this rider review');
    }
    const existing = await prisma.restaurantOrderRiderReview.findUnique({
      where: { orderId },
    });
    if (!existing) throw new NotFoundException('Rider review not found');
    await prisma.restaurantOrderRiderReview.delete({ where: { orderId } });
    return { deleted: true };
  }

  async listRiderReviewsForRider(
    currentUserId: string,
    role: string,
    opts?: { page?: number; perPage?: number },
  ) {
    const prisma = this.prisma as any;
    const r = (role || '').toLowerCase();
    if (r !== 'rider' && r !== 'admin' && r !== 'superadmin') {
      throw new ForbiddenException('Riders only');
    }
    const page = Math.max(1, opts?.page ?? 1);
    const perPage = Math.min(100, Math.max(1, opts?.perPage ?? 20));
    const skip = (page - 1) * perPage;
    const where =
      r === 'rider' ? { riderId: currentUserId } : {};

    const [items, total, agg] = await Promise.all([
      prisma.restaurantOrderRiderReview.findMany({
        where,
        skip,
        take: perPage,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              nickname: true,
              email: true,
              photos: true,
            },
          },
          order: {
            select: {
              id: true,
              status: true,
              totalAmount: true,
              currency: true,
              createdAt: true,
              deliveryAddress: true,
            },
          },
        },
      }),
      prisma.restaurantOrderRiderReview.count({ where }),
      prisma.restaurantOrderRiderReview.aggregate({
        where,
        _avg: { rating: true },
        _count: { rating: true },
      }),
    ]);

    return {
      items,
      total,
      page,
      perPage,
      avgRating:
        agg._count.rating > 0
          ? Math.round((agg._avg.rating || 0) * 10) / 10
          : null,
      reviewCount: agg._count.rating,
    };
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
    const normalizedRole = String(role || '').toLowerCase();
    const isOwner =
      order.ownerId === currentUserId ||
      normalizedRole === 'admin' ||
      normalizedRole === 'superadmin';
    const isAssignedRider =
      normalizedRole === 'rider' && order.riderId === currentUserId;

    const isPickupOrder =
      String(order.fulfillmentType || 'delivery').toLowerCase() === 'collection';

    if (isAssignedRider) {
      if (isPickupOrder) {
        throw new ForbiddenException('Riders are not used for pick-up orders');
      }
      const transitions: Partial<
        Record<RestaurantOrderStatus, RestaurantOrderStatus[]>
      > = {
        rider_assigned: ['rider_accepted'],
        out_for_delivery: ['delivery_complete'],
      };
      const allowed = transitions[order.status] || [];
      if (!allowed.includes(status)) {
        throw new ForbiddenException(
          'Invalid delivery status update for this order',
        );
      }
    } else if (isOwner) {
      if (status === 'preparing' && order.status !== 'pending') {
        throw new BadRequestException(
          'Only pending orders can be moved to preparing',
        );
      }
      if (status === 'ready') {
        if (!isPickupOrder || order.status !== 'preparing') {
          throw new BadRequestException(
            'Mark ready only for pick-up orders that are preparing',
          );
        }
      }
      if (status === 'completed') {
        if (isPickupOrder) {
          if (order.status !== 'ready') {
            throw new BadRequestException(
              'Pick-up orders can be completed only after they are ready',
            );
          }
        } else if (order.status !== 'delivery_complete') {
          throw new BadRequestException(
            'Complete delivery orders only after the rider marks delivery complete',
          );
        }
      }
      if (
        status === 'out_for_delivery' &&
        order.status !== 'rider_accepted'
      ) {
        throw new BadRequestException(
          'Start delivery only after the rider has accepted',
        );
      }
      if (status === 'out_for_delivery' && isPickupOrder) {
        throw new BadRequestException(
          'Pick-up orders do not use delivery start',
        );
      }
      if (status === 'cancelled' && order.status === 'completed') {
        throw new BadRequestException('Completed orders cannot be cancelled');
      }
    } else {
      throw new ForbiddenException('You cannot update this order');
    }

    const updated = await this.prisma.restaurantOrder.update({
      where: { id },
      data: { status },
      include: ORDER_INCLUDE,
    });

    if (status === 'out_for_delivery' && order.userId) {
      try {
        await this.notificationService.createNotification({
          userId: order.userId,
          message: `Your rider is on the way — order #${id.slice(0, 8)}`,
          type: 'restaurant_order',
          contentId: id,
        });
      } catch (_) {
        // non-blocking
      }
    }

    if (status === 'ready' && order.userId) {
      try {
        await this.notificationService.createNotification({
          userId: order.userId,
          message: `Your order is ready for pick-up — order #${id.slice(0, 8)}`,
          type: 'restaurant_order',
          contentId: id,
        });
      } catch (_) {
        // non-blocking
      }
    }

    if (
      isAssignedRider &&
      status === 'rider_accepted' &&
      order.ownerId
    ) {
      try {
        await this.notificationService.createNotification({
          userId: order.ownerId,
          message: `Rider accepted delivery — order #${id.slice(0, 8)}`,
          type: 'restaurant_order',
          contentId: id,
        });
      } catch (_) {
        // non-blocking
      }
    }

    if (
      isAssignedRider &&
      status === 'delivery_complete' &&
      order.ownerId
    ) {
      try {
        await this.notificationService.createNotification({
          userId: order.ownerId,
          message: `Rider marked delivery complete — order #${id.slice(0, 8)}. You can finalize the order.`,
          type: 'restaurant_order',
          contentId: id,
        });
      } catch (_) {
        // non-blocking
      }
    }

    const customerStatusMessages: Partial<
      Record<RestaurantOrderStatus, string>
    > = {
      preparing: `Your order is being prepared — order #${id.slice(0, 8)}`,
      completed: `Your order is complete — order #${id.slice(0, 8)}`,
      cancelled: `Your order was cancelled — order #${id.slice(0, 8)}`,
      delivery_complete: `Your order was delivered — order #${id.slice(0, 8)}`,
      rider_accepted: `A rider accepted your order — order #${id.slice(0, 8)}`,
    };
    const customerMessage = customerStatusMessages[status];
    if (customerMessage && order.userId) {
      try {
        await this.notificationService.createNotification({
          userId: order.userId,
          message: customerMessage,
          type: 'restaurant_order',
          contentId: id,
        });
      } catch (_) {
        // non-blocking
      }
    }

    return updated;
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

  async getTopRestaurantsByOrders(
    page = 1,
    limit = 20,
    opts?: { nearbyLat?: number; nearbyLng?: number; radiusKm?: number },
  ) {
    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.min(50, Math.max(1, Number(limit) || 20));
    const nearbyLat = opts?.nearbyLat;
    const nearbyLng = opts?.nearbyLng;
    const radiusKm = opts?.radiusKm ?? UK_DEFAULT_RADIUS_KM;

    if (isValidCoord(nearbyLat) && isValidCoord(nearbyLng)) {
      const owners = await this.prisma.user.findMany({
        where: {
          role: { in: ['owner', 'vendor'] },
          latitude: { not: null },
          longitude: { not: null },
        },
        select: {
          id: true,
          name: true,
          nickname: true,
          address: true,
          postcode: true,
          photos: true,
          role: true,
          latitude: true,
          longitude: true,
        },
      });

      const nearby = owners
        .map((o) => {
          const distanceKm = haversineKm(
            nearbyLat!,
            nearbyLng!,
            o.latitude!,
            o.longitude!,
          );
          return { ...o, distanceKm };
        })
        .filter((o) => o.distanceKm <= radiusKm)
        .sort((a, b) => a.distanceKm - b.distanceKm);

      const ownerIds = nearby.map((o) => o.id);
      if (ownerIds.length === 0) {
        return { restaurants: [], page: safePage, limit: safeLimit, total: 0 };
      }

      const grouped = await this.prisma.restaurantOrder.groupBy({
        by: ['ownerId'],
        where: { ownerId: { in: ownerIds }, status: { not: 'cancelled' } },
        _count: { _all: true },
      });
      const countMap = new Map(
        grouped.map((g) => [String(g.ownerId), g._count?._all || 0]),
      );

      const withOrders = nearby.map((o) => ({
        ...o,
        orderCount: countMap.get(String(o.id)) || 0,
      }));

      const total = withOrders.length;
      const skip = (safePage - 1) * safeLimit;
      const pageRows = withOrders.slice(skip, skip + safeLimit);

      return {
        restaurants: pageRows,
        page: safePage,
        limit: safeLimit,
        total,
      };
    }

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
        postcode: true,
        photos: true,
        role: true,
        latitude: true,
        longitude: true,
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
