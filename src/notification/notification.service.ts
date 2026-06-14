import {
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateNotificationDto,
  UpdateNotificationStatusDto,
} from './dto/create-notification.dto';
import { NotificationGateway } from './notification.gateway';
import { resolveOwnerAreaKm } from '../common/geo.util';

@Injectable()
export class NotificationService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => NotificationGateway))
    private readonly notificationGateway: NotificationGateway,
  ) {}

  async createNotification(createNotificationDto: CreateNotificationDto) {
    const notification = await this.prisma.notification.create({
      data: createNotificationDto,
    });

    this.notificationGateway.emitNotification(notification);

    return notification;
  }

  async findAll(
    page: number = 1,
    perPage: number = 10,
    email?: string,
    status?: string,
    clientId?: string,
    assignId?: string,
    userId?: string,
  ): Promise<{ data: any[]; total: number }> {
    const pageNumber = Number(page) || 1;
    const perPageNumber = perPage ? Number(perPage) : null;
    const skip = (pageNumber - 1) * (perPageNumber || 0);

    const where: any = {};

    if (email) {
      where.userEmail = {
        contains: email,
        mode: 'insensitive',
      };
    }

    if (status) {
      where.status = status;
    }

    if (clientId) {
      where.clientId = clientId;
    }

    if (assignId) {
      where.assignId = assignId;
    }

    if (userId) {
      where.userId = userId;
    }

    const totalCountPromise = this.prisma.notification.count({
      where,
    });

    const dataPromise = this.prisma.notification.findMany({
      skip: perPageNumber ? skip : undefined,
      take: perPageNumber || undefined,
      where,
      orderBy: { createdAt: 'desc' },
    });

    const [total, data] = await Promise.all([totalCountPromise, dataPromise]);
    return { data, total };
  }

  findOne(id: string) {
    return this.prisma.notification.findUnique({
      where: { id },
    });
  }

  async getNotificationsForUserByEmail(email: string) {
    return this.prisma.notification.findMany({
      where: { userEmail: email },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getNotificationsByUserId(userId: string) {
    return this.prisma.notification.findMany({
      where: {
        OR: [{ userId: userId }, { clientId: userId }],
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.prisma.notification.count({
      where: {
        OR: [{ userId }, { clientId: userId }],
        status: { not: 'read' },
      },
    });
  }

  async markAllAsRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: {
        OR: [{ userId }, { clientId: userId }],
        status: { not: 'read' },
      },
      data: { status: 'read' },
    });
    return { success: true };
  }

  private haversineKm(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  /**
   * Notify channel subscribers and users within the creator's delivery area.
   */
  async notifySubscribersAndAreaUsers(params: {
    creatorUserId: string;
    message: string;
    type: string;
    contentId: string;
    orderId?: string;
    radiusKm?: number;
  }) {
    const creator = await this.prisma.user.findUnique({
      where: { id: params.creatorUserId },
      select: {
        id: true,
        latitude: true,
        longitude: true,
        contentAreaKm: true,
        pickupAreaKm: true,
        deliveryAreaKm: true,
      },
    });
    if (!creator) return;

    const [subscribers, usersWithLoc] = await Promise.all([
      this.prisma.channelSubscription.findMany({
        where: { channelUserId: params.creatorUserId },
        select: { subscriberId: true },
      }),
      creator.latitude != null && creator.longitude != null
        ? this.prisma.user.findMany({
            where: {
              latitude: { not: null },
              longitude: { not: null },
              id: { not: params.creatorUserId },
            },
            select: { id: true, latitude: true, longitude: true },
          })
        : Promise.resolve([]),
    ]);

    const recipientSet = new Set<string>(
      subscribers.map((s) => s.subscriberId).filter(Boolean),
    );

    if (
      creator.latitude != null &&
      creator.longitude != null &&
      usersWithLoc.length
    ) {
      const ownerMaxKm = resolveOwnerAreaKm(creator, 'content');
      const effectiveRadiusKm =
        ownerMaxKm != null
          ? Math.min(params.radiusKm ?? 50, ownerMaxKm)
          : params.radiusKm ?? 50;

      for (const u of usersWithLoc) {
        if (u.latitude == null || u.longitude == null) continue;
        const distanceKm = this.haversineKm(
          creator.latitude,
          creator.longitude,
          u.latitude,
          u.longitude,
        );
        if (distanceKm <= effectiveRadiusKm) {
          recipientSet.add(u.id);
        }
      }
    }

    recipientSet.delete(params.creatorUserId);

    const tasks = Array.from(recipientSet).map((userId) =>
      this.createNotification({
        userId,
        message: params.message,
        type: params.type,
        contentId: params.contentId,
        orderId: params.orderId,
      }).catch(() => null),
    );
    await Promise.all(tasks);
  }

  async getNotificationsByCompanyId(companyId: string) {
    return this.prisma.notification.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getNotificationsByAssignId(assignId: string) {
    return this.prisma.notification.findMany({
      where: { assignId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateNotificationStatus(
    id: string,
    updateStatusDto: UpdateNotificationStatusDto,
  ) {
    return this.prisma.notification.update({
      where: { id },
      data: { status: updateStatusDto.status },
    });
  }

  async remove(id: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    return this.prisma.notification.delete({ where: { id } });
  }
}
