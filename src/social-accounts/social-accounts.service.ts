import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SocialAccountsService {
  constructor(private readonly prisma: PrismaService) {}

  listByUser(userId: string) {
    return this.prisma.socialAccount.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  upsertFacebookPage(input: {
    userId: string;
    pageId: string;
    pageName?: string;
    pageAccessToken: string;
    metadata?: Record<string, unknown>;
  }) {
    const { userId, pageId, pageName, pageAccessToken, metadata } = input;
    return this.prisma.socialAccount.upsert({
      where: {
        userId_platform_accountId: {
          userId,
          platform: 'facebook',
          accountId: pageId,
        },
      },
      create: {
        userId,
        platform: 'facebook',
        accountId: pageId,
        accountName: pageName || undefined,
        accessToken: pageAccessToken,
        metadata: (metadata || {}) as any,
      },
      update: {
        accountName: pageName || undefined,
        accessToken: pageAccessToken,
        metadata: (metadata || {}) as any,
      },
    });
  }

  deleteById(id: string, userId: string) {
    return this.prisma.socialAccount.deleteMany({
      where: { id, userId },
    });
  }
}

