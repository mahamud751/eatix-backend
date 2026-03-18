import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/** Synced to DB on boot. Free = 10 videos + 10 shorts; higher tiers scale up. */
const DEFAULT_PACKAGES = [
  {
    name: 'free',
    displayName: 'Free',
    videoLimit: 10,
    shortLimit: 10,
    price: 0,
    sortOrder: 1,
  },
  {
    name: 'basic',
    displayName: 'Basic',
    videoLimit: 40,
    shortLimit: 40,
    price: 5.99,
    sortOrder: 2,
  },
  {
    name: 'pro',
    displayName: 'Pro',
    videoLimit: 100,
    shortLimit: 100,
    price: 10.99,
    sortOrder: 3,
  },
  {
    name: 'premium',
    displayName: 'Premium',
    videoLimit: 500,
    shortLimit: 500,
    price: 19.99,
    sortOrder: 4,
  },
];

@Injectable()
export class SubscriptionService {
  constructor(private prisma: PrismaService) {}

  async onModuleInit() {
    await this.ensurePackagesExist();
  }

  private async ensurePackagesExist() {
    for (const pkg of DEFAULT_PACKAGES) {
      const existing = await this.prisma.subscriptionPackage.findFirst({
        where: { name: pkg.name },
      });
      if (existing) {
        await this.prisma.subscriptionPackage.update({
          where: { id: existing.id },
          data: {
            displayName: pkg.displayName,
            videoLimit: pkg.videoLimit,
            shortLimit: pkg.shortLimit,
            price: pkg.price,
            sortOrder: pkg.sortOrder,
          },
        });
      } else {
        await this.prisma.subscriptionPackage.create({
          data: {
            name: pkg.name,
            displayName: pkg.displayName,
            videoLimit: pkg.videoLimit,
            shortLimit: pkg.shortLimit,
            price: pkg.price,
            sortOrder: pkg.sortOrder,
          },
        });
      }
    }
  }

  async getPackages() {
    await this.ensurePackagesExist();
    return this.prisma.subscriptionPackage.findMany({
      orderBy: { sortOrder: 'asc' },
    });
  }

  async getUserSubscription(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { subscriptionPackage: true },
    });
    if (!user) throw new NotFoundException('User not found');

    const pkg = user.subscriptionPackage;
    if (pkg) {
      const [videoCount, shortCount] = await Promise.all([
        this.prisma.video.count({
          where: { userId, status: { not: 'deleted' } },
        }),
        this.prisma.short.count({
          where: { userId, status: { not: 'deleted' } },
        }),
      ]);
      return {
        ...pkg,
        currentVideoCount: videoCount,
        currentShortCount: shortCount,
        canUploadVideo: videoCount < pkg.videoLimit,
        canUploadShort: shortCount < pkg.shortLimit,
        videoRemaining: Math.max(0, pkg.videoLimit - videoCount),
        shortRemaining: Math.max(0, pkg.shortLimit - shortCount),
      };
    }

    const freePkg = await this.prisma.subscriptionPackage.findFirst({
      where: { name: 'free' },
    });
    if (freePkg) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { subscriptionPackageId: freePkg.id },
      });
      return this.getUserSubscription(userId);
    }
    throw new BadRequestException('No subscription package available');
  }

  async checkCanUploadVideo(userId: string) {
    const sub = await this.getUserSubscription(userId);
    if (sub.currentVideoCount >= sub.videoLimit) {
      return {
        allowed: false,
        message: `Video limit reached (${sub.currentVideoCount}/${sub.videoLimit} on ${sub.displayName}). Upgrade your plan for more uploads.`,
        limit: sub.videoLimit,
        current: sub.currentVideoCount,
        packageName: sub.displayName,
      };
    }
    return {
      allowed: true,
      limit: sub.videoLimit,
      current: sub.currentVideoCount,
      remaining: sub.videoLimit - sub.currentVideoCount,
    };
  }

  async checkCanUploadShort(userId: string) {
    const sub = await this.getUserSubscription(userId);
    if (sub.currentShortCount >= sub.shortLimit) {
      return {
        allowed: false,
        message: `Shorts limit reached (${sub.currentShortCount}/${sub.shortLimit} on ${sub.displayName}). Upgrade your plan for more uploads.`,
        limit: sub.shortLimit,
        current: sub.currentShortCount,
        packageName: sub.displayName,
      };
    }
    return {
      allowed: true,
      limit: sub.shortLimit,
      current: sub.currentShortCount,
      remaining: sub.shortLimit - sub.currentShortCount,
    };
  }

  async purchasePackage(userId: string, packageId: string) {
    const pkg = await this.prisma.subscriptionPackage.findUnique({
      where: { id: packageId },
    });
    if (!pkg) throw new NotFoundException('Package not found');

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) throw new NotFoundException('User not found');

    await this.prisma.user.update({
      where: { id: userId },
      data: { subscriptionPackageId: packageId },
    });

    return this.getUserSubscription(userId);
  }
}
