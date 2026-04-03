import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { SocialPublishService } from './social-publish.service';

@Injectable()
export class ScheduledContentCronService {
  private readonly logger = new Logger(ScheduledContentCronService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly socialPublishService: SocialPublishService,
  ) {}

  /**
   * Prefer metadata.publishAt (ISO from app) — matches the user's chosen instant.
   * Fallback: scheduledDate + scheduledTime (legacy; uses UTC calendar parts from DB date).
   */
  private isDue(item: {
    scheduledDate: Date;
    scheduledTime?: string | null;
    metadata?: unknown;
  }): boolean {
    const now = Date.now();
    const meta = (item.metadata as Record<string, unknown>) || {};
    const publishAtRaw = meta.publishAt;
    if (publishAtRaw != null && String(publishAtRaw).trim() !== '') {
      const t = new Date(String(publishAtRaw));
      if (!Number.isNaN(t.getTime())) {
        return t.getTime() <= now;
      }
    }
    const sd = item.scheduledDate;
    const timeStr =
      item.scheduledTime && /^\d{1,2}:\d{2}$/.test(String(item.scheduledTime).trim())
        ? String(item.scheduledTime).trim()
        : '00:00';
    const [hh, mm] = timeStr.split(':').map((x) => parseInt(x, 10));
    const y = sd.getUTCFullYear();
    const mo = sd.getUTCMonth();
    const d = sd.getUTCDate();
    const targetMs = Date.UTC(y, mo, d, hh || 0, mm || 0, 0, 0);
    return targetMs <= now;
  }

  @Cron('* * * * *')
  async processDueScheduledPosts() {
    const due = await this.prisma.scheduledContent.findMany({
      where: { status: 'scheduled' },
      orderBy: { scheduledDate: 'asc' },
      take: 100,
    });
    for (const item of due) {
      if (!this.isDue(item)) continue;
      const platforms = Array.isArray(item.platforms)
        ? item.platforms.map((p) => String(p).toLowerCase())
        : [];

      const meta = (item.metadata as any) || {};
      const body =
        String(meta.contentBody || item.contentTitle || '').trim() ||
        'New post';
      const mediaUrls = Array.isArray(meta.contentMediaUrls)
        ? meta.contentMediaUrls.map((x: unknown) => String(x)).filter(Boolean)
        : [];
      const publishResults: Record<string, unknown> = {};
      const unsupported = platforms.filter((p) => p !== 'facebook');

      try {
        if (platforms.includes('facebook')) {
          const preferredPageId = String(meta.facebookPageId || '').trim();
          const account = preferredPageId
            ? await this.prisma.socialAccount.findFirst({
                where: {
                  userId: item.userId,
                  platform: 'facebook',
                  accountId: preferredPageId,
                },
              })
            : await this.prisma.socialAccount.findFirst({
                where: { userId: item.userId, platform: 'facebook' },
                orderBy: { createdAt: 'desc' },
              });
          if (!account) {
            throw new Error(
              `No connected Facebook page for user ${item.userId}. Connect Facebook in Edit Profile.`,
            );
          }
          const publishRes = await this.socialPublishService.publishToFacebook({
            pageId: account.accountId,
            pageAccessToken: account.accessToken,
            message: body,
            mediaUrls,
          });
          publishResults.facebook = publishRes;
          this.logger.log(
            `Published scheduled content ${item.id} to Facebook for user ${item.userId}`,
          );
        }
        if (unsupported.length > 0) {
          publishResults.unsupportedPlatforms = unsupported;
        }
        const hasSupported = platforms.includes('facebook');
        await this.prisma.scheduledContent.update({
          where: { id: item.id },
          data: {
            status: hasSupported ? 'posted' : 'failed',
            ...(hasSupported ? { postedAt: new Date() } : {}),
            metadata: {
              ...(meta || {}),
              publishResults,
              ...(hasSupported
                ? {}
                : {
                    lastError: `Unsupported platforms: ${platforms.join(', ')}`,
                  }),
            },
          },
        });
      } catch (e: any) {
        this.logger.warn(
          `Failed scheduled post ${item.id}: ${e?.message || 'unknown error'}`,
        );
        await this.prisma.scheduledContent.update({
          where: { id: item.id },
          data: {
            status: 'failed',
            metadata: {
              ...(meta || {}),
              lastError: e?.message || 'failed to publish',
            },
          },
        });
      }
    }
  }
}
