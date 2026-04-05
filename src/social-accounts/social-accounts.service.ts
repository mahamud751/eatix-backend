import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { PrismaService } from '../prisma/prisma.service';

const FB_GRAPH_VERSION = 'v21.0';

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

  /**
   * Instagram Business account linked to a Page — same Page access token works for IG Graph publishing.
   */
  upsertInstagramFromPage(input: {
    userId: string;
    instagramUserId: string;
    instagramUsername?: string;
    pageAccessToken: string;
    linkedPageId: string;
  }) {
    const {
      userId,
      instagramUserId,
      instagramUsername,
      pageAccessToken,
      linkedPageId,
    } = input;
    return this.prisma.socialAccount.upsert({
      where: {
        userId_platform_accountId: {
          userId,
          platform: 'instagram',
          accountId: instagramUserId,
        },
      },
      create: {
        userId,
        platform: 'instagram',
        accountId: instagramUserId,
        accountName: instagramUsername || undefined,
        accessToken: pageAccessToken,
        metadata: { linkedFacebookPageId: linkedPageId } as any,
      },
      update: {
        accountName: instagramUsername || undefined,
        accessToken: pageAccessToken,
        metadata: { linkedFacebookPageId: linkedPageId } as any,
      },
    });
  }

  upsertTikTokAccount(input: {
    userId: string;
    openId: string;
    displayName?: string;
    accessToken: string;
    refreshToken?: string;
    metadata?: Record<string, unknown>;
  }) {
    const { userId, openId, displayName, accessToken, refreshToken, metadata } =
      input;
    return this.prisma.socialAccount.upsert({
      where: {
        userId_platform_accountId: {
          userId,
          platform: 'tiktok',
          accountId: openId,
        },
      },
      create: {
        userId,
        platform: 'tiktok',
        accountId: openId,
        accountName: displayName || undefined,
        accessToken,
        refreshToken: refreshToken || undefined,
        metadata: (metadata || {}) as any,
      },
      update: {
        accountName: displayName || undefined,
        accessToken,
        refreshToken: refreshToken || undefined,
        metadata: (metadata || {}) as any,
      },
    });
  }

  upsertYouTubeChannel(input: {
    userId: string;
    channelId: string;
    channelTitle?: string;
    accessToken: string;
    refreshToken?: string;
    metadata?: Record<string, unknown>;
  }) {
    const {
      userId,
      channelId,
      channelTitle,
      accessToken,
      refreshToken,
      metadata,
    } = input;
    return this.prisma.socialAccount.upsert({
      where: {
        userId_platform_accountId: {
          userId,
          platform: 'youtube',
          accountId: channelId,
        },
      },
      create: {
        userId,
        platform: 'youtube',
        accountId: channelId,
        accountName: channelTitle || undefined,
        accessToken,
        refreshToken: refreshToken || undefined,
        metadata: (metadata || {}) as any,
      },
      update: {
        accountName: channelTitle || undefined,
        accessToken,
        refreshToken: refreshToken || undefined,
        metadata: (metadata || {}) as any,
      },
    });
  }

  /** Read-only: which Facebook Pages have an Instagram Business profile linked. */
  async instagramLinkStatus(userId: string) {
    const pages = await this.prisma.socialAccount.findMany({
      where: { userId, platform: 'facebook' },
      orderBy: { createdAt: 'desc' },
    });
    const results: Array<{
      pageId: string;
      pageName: string | null;
      instagramLinked: boolean;
      instagramUserId?: string;
      instagramUsername?: string;
      error?: string;
    }> = [];
    for (const p of pages) {
      const pageId = String(p.accountId || '').trim();
      const token = String(p.accessToken || '').trim();
      if (!pageId || !token) continue;
      try {
        const r = await axios.get(
          `https://graph.facebook.com/${FB_GRAPH_VERSION}/${encodeURIComponent(pageId)}`,
          {
            params: {
              fields: 'instagram_business_account{id,username,profile_picture_url}',
              access_token: token,
            },
          },
        );
        const ib = r.data?.instagram_business_account;
        results.push({
          pageId,
          pageName: p.accountName,
          instagramLinked: !!ib?.id,
          instagramUserId: ib?.id ? String(ib.id) : undefined,
          instagramUsername: ib?.username ? String(ib.username) : undefined,
        });
      } catch (e: any) {
        results.push({
          pageId,
          pageName: p.accountName,
          instagramLinked: false,
          error:
            e?.response?.data?.error?.message ||
            e?.message ||
            'Could not read Page',
        });
      }
    }
    const igRows = await this.prisma.socialAccount.findMany({
      where: { userId, platform: 'instagram' },
      orderBy: { createdAt: 'desc' },
    });
    return { pages: results, instagramAccounts: igRows };
  }
}

