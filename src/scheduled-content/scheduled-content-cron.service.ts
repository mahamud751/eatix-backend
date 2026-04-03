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

  private isDue(scheduledDate: Date, scheduledTime?: string | null) {
    const now = new Date();
    const target = new Date(scheduledDate);
    if (scheduledTime && /^\d{2}:\d{2}$/.test(scheduledTime)) {
      const [hh, mm] = scheduledTime.split(':').map(Number);
      target.setHours(hh || 0, mm || 0, 0, 0);
    } else {
      target.setHours(0, 0, 0, 0);
    }
    return target.getTime() <= now.getTime();
  }

  @Cron('* * * * *')
  async processDueScheduledPosts() {
    const due = await this.prisma.scheduledContent.findMany({
      where: { status: 'scheduled' },
      orderBy: { scheduledDate: 'asc' },
      take: 100,
    });
    for (const item of due) {
      if (!this.isDue(item.scheduledDate, item.scheduledTime)) continue;
      const platforms = Array.isArray(item.platforms) ? item.platforms : [];
      const wantsFacebook = platforms.some(
        p => String(p).toLowerCase() === 'facebook',
      );
      if (!wantsFacebook) {
        await this.prisma.scheduledContent.update({
          where: { id: item.id },
          data: { status: 'posted', postedAt: new Date() },
        });
        continue;
      }

      const meta = (item.metadata as any) || {};
      const body =
        String(meta.contentBody || item.contentTitle || '').trim() || 'New post';
      const mediaUrls = Array.isArray(meta.contentMediaUrls)
        ? meta.contentMediaUrls.map((x: unknown) => String(x)).filter(Boolean)
        : [];

      try {
        const account = await this.prisma.socialAccount.findFirst({
          where: { userId: item.userId, platform: 'facebook' },
          orderBy: { createdAt: 'desc' },
        });
        if (!account) {
          throw new Error('No connected facebook page for this user');
        }
        const publishRes = await this.socialPublishService.publishToFacebook({
          pageId: account.accountId,
          pageAccessToken: account.accessToken,
          message: body,
          mediaUrls,
        });
        await this.prisma.scheduledContent.update({
          where: { id: item.id },
          data: {
            status: 'posted',
            postedAt: new Date(),
            metadata: {
              ...(meta || {}),
              publishResults: { facebook: publishRes },
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

