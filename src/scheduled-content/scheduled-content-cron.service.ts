import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { SocialPublishService } from './social-publish.service';

const AUTO_POST_PLATFORMS = [
  'facebook',
  'instagram',
  'tiktok',
  'youtube',
] as const;

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
    /** Legacy rows only: time is interpreted as UTC, not user local. Prefer metadata.publishAt. */
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

      const meta = (item.metadata as Record<string, unknown>) || {};
      const body =
        String(meta.contentBody || item.contentTitle || '').trim() ||
        'New post';
      const mediaUrls = Array.isArray(meta.contentMediaUrls)
        ? meta.contentMediaUrls.map((x: unknown) => String(x)).filter(Boolean)
        : [];
      const publishResults: Record<string, unknown> = {};
      const primaryMediaIsVideo = meta.primaryMediaIsVideo === true;

      const toRun = platforms.filter((p) =>
        (AUTO_POST_PLATFORMS as readonly string[]).includes(p),
      );
      let anySuccess = false;

      const preferredPageId = String(meta.facebookPageId || '').trim();
      const preferredTikTokId = String(meta.tiktokAccountId || '').trim();
      const preferredInstagramId = String(
        meta.instagramAccountId || '',
      ).trim();
      const preferredYouTubeId = String(meta.youtubeChannelId || '').trim();

      if (toRun.includes('facebook')) {
        try {
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
            publishResults.facebook = {
              error:
                'No connected Facebook page. Connect Facebook in Edit Profile.',
            };
          } else {
            publishResults.facebook = await this.socialPublishService.publishToFacebook(
              {
                pageId: account.accountId,
                pageAccessToken: account.accessToken,
                message: body,
                mediaUrls,
                primaryMediaIsVideo,
              },
            );
            anySuccess = true;
            const tz = meta.timeZone ? String(meta.timeZone) : '';
            this.logger.log(
              `Published scheduled ${item.id} to Facebook user=${item.userId}${tz ? ` tz=${tz}` : ''}`,
            );
          }
        } catch (e: any) {
          publishResults.facebook = { error: e?.message || 'facebook failed' };
          this.logger.warn(
            `Scheduled ${item.id} Facebook error: ${e?.message || e}`,
          );
        }
      }

      if (toRun.includes('instagram')) {
        try {
          let igStandalone = preferredInstagramId
            ? await this.prisma.socialAccount.findFirst({
                where: {
                  userId: item.userId,
                  platform: 'instagram',
                  accountId: preferredInstagramId,
                },
              })
            : null;
          if (!igStandalone) {
            igStandalone = await this.prisma.socialAccount.findFirst({
              where: { userId: item.userId, platform: 'instagram' },
              orderBy: { createdAt: 'desc' },
            });
          }
          let igUserId: string | null = null;
          let igToken: string | null = null;
          if (igStandalone) {
            igUserId = igStandalone.accountId;
            igToken = igStandalone.accessToken;
          } else {
            const fbAcc = preferredPageId
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
            if (fbAcc) {
              igUserId =
                await this.socialPublishService.getInstagramBusinessAccountId(
                  fbAcc.accountId,
                  fbAcc.accessToken,
                );
              igToken = fbAcc.accessToken;
            }
          }
          if (!igUserId || !igToken) {
            publishResults.instagram = {
              error:
                'No Instagram Business account. Link Instagram to your Facebook Page in Meta, or connect an Instagram account.',
            };
          } else {
            publishResults.instagram =
              await this.socialPublishService.publishToInstagram({
                igUserId,
                accessToken: igToken,
                caption: body,
                mediaUrls,
                isVideo: primaryMediaIsVideo,
              });
            anySuccess = true;
            this.logger.log(
              `Published scheduled ${item.id} to Instagram user=${item.userId}`,
            );
          }
        } catch (e: any) {
          publishResults.instagram = {
            error: e?.message || 'instagram failed',
          };
          this.logger.warn(
            `Scheduled ${item.id} Instagram error: ${e?.message || e}`,
          );
        }
      }

      if (toRun.includes('tiktok')) {
        try {
          const ttAcc = preferredTikTokId
            ? await this.prisma.socialAccount.findFirst({
                where: {
                  userId: item.userId,
                  platform: 'tiktok',
                  accountId: preferredTikTokId,
                },
              })
            : await this.prisma.socialAccount.findFirst({
                where: { userId: item.userId, platform: 'tiktok' },
                orderBy: { createdAt: 'desc' },
              });
          if (!ttAcc) {
            publishResults.tiktok = {
              error:
                'No TikTok account connected. Add TikTok login (video.publish) and store token in social accounts.',
            };
          } else {
            const videoUrl =
              mediaUrls.find((u) => /\.(mp4|mov|webm)(\?|$)/i.test(u)) ||
              (primaryMediaIsVideo ? mediaUrls[mediaUrls.length - 1] : '');
            if (!videoUrl || !/^https?:\/\//i.test(videoUrl)) {
              publishResults.tiktok = {
                error:
                  'TikTok auto-post needs a public .mp4/.mov URL (video posts). Image-only is not supported.',
              };
            } else {
              publishResults.tiktok =
                await this.socialPublishService.publishToTikTokPullFromUrl({
                  accessToken: ttAcc.accessToken,
                  videoUrl,
                  title: body,
                });
              anySuccess = true;
              this.logger.log(
                `Initialized TikTok publish for scheduled ${item.id} user=${item.userId}`,
              );
            }
          }
        } catch (e: any) {
          publishResults.tiktok = { error: e?.message || 'tiktok failed' };
          this.logger.warn(
            `Scheduled ${item.id} TikTok error: ${e?.message || e}`,
          );
        }
      }

      if (toRun.includes('youtube')) {
        try {
          const ytAcc = preferredYouTubeId
            ? await this.prisma.socialAccount.findFirst({
                where: {
                  userId: item.userId,
                  platform: 'youtube',
                  accountId: preferredYouTubeId,
                },
              })
            : await this.prisma.socialAccount.findFirst({
                where: { userId: item.userId, platform: 'youtube' },
                orderBy: { createdAt: 'desc' },
              });
          if (!ytAcc) {
            publishResults.youtube = {
              error:
                'No YouTube channel connected. Use Edit Profile → Verify YouTube.',
            };
          } else {
            const videoUrl =
              mediaUrls.find((u) => /\.(mp4|mov|webm)(\?|$)/i.test(u)) ||
              (primaryMediaIsVideo ? mediaUrls[mediaUrls.length - 1] : '');
            if (!videoUrl || !/^https?:\/\//i.test(videoUrl)) {
              publishResults.youtube = {
                error:
                  'YouTube auto-post needs a public .mp4/.mov/.webm URL (video posts only).',
              };
            } else {
              const accessToken =
                await this.socialPublishService.getValidYouTubeAccessToken({
                  accessToken: ytAcc.accessToken,
                  refreshToken: ytAcc.refreshToken,
                });
              publishResults.youtube =
                await this.socialPublishService.publishToYouTubeVideo({
                  accessToken,
                  title: body,
                  description: body,
                  videoUrl,
                });
              anySuccess = true;
              this.logger.log(
                `Published scheduled ${item.id} to YouTube user=${item.userId}`,
              );
            }
          }
        } catch (e: any) {
          publishResults.youtube = { error: e?.message || 'youtube failed' };
          this.logger.warn(
            `Scheduled ${item.id} YouTube error: ${e?.message || e}`,
          );
        }
      }

      const skipped = platforms.filter(
        (p) => !(AUTO_POST_PLATFORMS as readonly string[]).includes(p),
      );
      if (skipped.length > 0) {
        publishResults.skippedPlatforms = skipped;
      }

      const attempted = toRun.length > 0;
      const status = !attempted
        ? platforms.length > 0
          ? 'failed'
          : 'posted'
        : anySuccess
          ? 'posted'
          : 'failed';
      const lastErrorParts: string[] = [];
      for (const k of AUTO_POST_PLATFORMS) {
        if (!toRun.includes(k)) continue;
        const r = publishResults[k] as { error?: string } | undefined;
        if (r && typeof r === 'object' && r.error) {
          lastErrorParts.push(`${k}: ${r.error}`);
        }
      }

      try {
        await this.prisma.scheduledContent.update({
          where: { id: item.id },
          data: {
            status,
            ...(anySuccess ? { postedAt: new Date() } : {}),
            metadata: {
              ...(meta || {}),
              publishResults,
              ...(!anySuccess && attempted && lastErrorParts.length
                ? { lastError: lastErrorParts.join(' | ') }
                : {}),
           } as any,
            
          },
        });
      } catch (e: any) {
        this.logger.warn(
          `Failed to persist scheduled ${item.id}: ${e?.message || e}`,
        );
      }
    }
  }
}
