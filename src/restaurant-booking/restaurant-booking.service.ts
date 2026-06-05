import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { CreateRestaurantBookingDto } from './dto/create-restaurant-booking.dto';

type RestaurantBookingStatus =
  | 'pending'
  | 'confirmed'
  | 'completed'
  | 'cancelled';

@Injectable()
export class RestaurantBookingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  private includeRelations = {
    user: {
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        address: true,
        photos: true,
      },
    },
    owner: {
      select: {
        id: true,
        name: true,
        nickname: true,
        email: true,
        phone: true,
        address: true,
        photos: true,
      },
    },
  } as const;

  async create(userId: string, dto: CreateRestaurantBookingDto) {
    const prisma = this.prisma as any;
    if (!dto.ownerId || dto.ownerId === userId) {
      throw new BadRequestException('Invalid restaurant owner');
    }

    const owner = await prisma.user.findUnique({
      where: { id: dto.ownerId },
      select: { id: true, role: true, name: true, nickname: true },
    });
    if (!owner) throw new NotFoundException('Restaurant not found');

    const customerName = String(dto.customerName || '').trim();
    const customerAddress = String(dto.customerAddress || '').trim();
    const customerPhone = String(dto.customerPhone || '').trim();
    const persons = Math.max(1, Number(dto.persons) || 0);
    const bookingDate = new Date(dto.bookingDate);

    if (!customerName) throw new BadRequestException('Name is required');
    if (!customerAddress) throw new BadRequestException('Address is required');
    if (!customerPhone)
      throw new BadRequestException('Phone number is required');
    if (!Number.isFinite(bookingDate.getTime())) {
      throw new BadRequestException('Valid booking date is required');
    }
    if (!persons) throw new BadRequestException('Persons must be at least 1');

    const booking = await prisma.restaurantBooking.create({
      data: {
        userId,
        ownerId: dto.ownerId,
        customerName,
        customerAddress,
        customerPhone,
        persons,
        bookingDate,
        note: dto.note ? String(dto.note).trim() : null,
      },
      include: this.includeRelations,
    });

    try {
      await this.notificationService.createNotification({
        userId: booking.ownerId,
        message: `New booking from ${customerName} for ${persons} person${persons > 1 ? 's' : ''}`,
        type: 'restaurant_booking',
        contentId: booking.id,
      });
    } catch (_) {}

    try {
      await prisma.user.update({
        where: { id: userId },
        data: {
          name: customerName,
          address: customerAddress,
          phone: customerPhone,
        },
      });
    } catch (_) {}

    return booking;
  }

  async findAll(
    currentUserId: string,
    role: string,
    opts?: {
      status?: RestaurantBookingStatus;
      scope?: string;
      page?: number;
      limit?: number;
    },
  ) {
    const prisma = this.prisma as any;
    const page = Math.max(1, opts?.page ?? 1);
    const limit = Math.min(100, Math.max(1, opts?.limit ?? 20));
    const skip = (page - 1) * limit;
    const normalizedRole = String(role || '').toLowerCase();
    const normalizedScope = String(opts?.scope || '').toLowerCase();
    const where: {
      userId?: string;
      ownerId?: string;
      status?: RestaurantBookingStatus;
    } = {};

    if (
      normalizedRole === 'admin' ||
      normalizedRole === 'superadmin' ||
      normalizedRole === 'super_admin'
    ) {
      // all bookings
    } else if (normalizedRole === 'owner' || normalizedRole === 'vendor') {
      if (normalizedScope === 'customer' || normalizedScope === 'mine') {
        where.userId = currentUserId;
      } else {
        where.ownerId = currentUserId;
      }
    } else {
      where.userId = currentUserId;
    }
    if (opts?.status) where.status = opts.status;

    const [bookings, total] = await Promise.all([
      prisma.restaurantBooking.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: this.includeRelations,
      }),
      prisma.restaurantBooking.count({ where }),
    ]);

    return { bookings, total, page, limit };
  }

  async updateStatus(
    id: string,
    currentUserId: string,
    role: string,
    status: RestaurantBookingStatus,
  ) {
    const prisma = this.prisma as any;
    const booking = await prisma.restaurantBooking.findUnique({
      where: { id },
    });
    if (!booking) throw new NotFoundException('Booking not found');

    const normalizedRole = String(role || '').toLowerCase();
    const canUpdate =
      booking.ownerId === currentUserId ||
      normalizedRole === 'admin' ||
      normalizedRole === 'superadmin' ||
      normalizedRole === 'super_admin';
    if (!canUpdate)
      throw new ForbiddenException('You cannot update this booking');

    return prisma.restaurantBooking.update({
      where: { id },
      data: { status },
      include: this.includeRelations,
    });
  }
}
