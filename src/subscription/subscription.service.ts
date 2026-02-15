import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const DEFAULT_PACKAGES = [
  { name: 'free', displayName: 'Free', videoLimit: 2, shortLimit: 2, price: 0, sortOrder: 1 },
  { name: 'basic', displayName: 'Basic', videoLimit: 5, shortLimit: 5, price: 10, sortOrder: 2 },
  { name: 'pro', displayName: 'Pro', videoLimit: 15, shortLimit: 15, price: 30, sortOrder: 3 },
  { name: 'premium', displayName: 'Premium', videoLimit: 30, shortLimit: 30, price: 50, sortOrder: 4 },
];

@Injectable()
export class SubscriptionService {
  constructor(private prisma: PrismaService) {}

  async onModuleInit() {
    await this.ensurePackagesExist();
  }

  private async ensurePackagesExist() {
    const count = await this.prisma.subscriptionPackage.count();
    if (count === 0) {
      await this.prisma.subscriptionPackage.createMany({
        data: DEFAULT_PACKAGES,
      });
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
        message: `You have reached your video limit (${sub.videoLimit}). Upgrade your plan to upload more.`,
        limit: sub.videoLimit,
        current: sub.currentVideoCount,
      };
    }
    return { allowed: true };
  }

  async checkCanUploadShort(userId: string) {
    const sub = await this.getUserSubscription(userId);
    if (sub.currentShortCount >= sub.shortLimit) {
      return {
        allowed: false,
        message: `You have reached your shorts limit (${sub.shortLimit}). Upgrade your plan to upload more.`,
        limit: sub.shortLimit,
        current: sub.currentShortCount,
      };
    }
    return { allowed: true };
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
