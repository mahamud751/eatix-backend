import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PlaylistService {
  constructor(private prisma: PrismaService) {}

  private videoInclude = {
    user: { select: { id: true, name: true, nickname: true } },
    _count: { select: { likes: true, comments: true, views: true } },
  };

  private shortInclude = {
    user: { select: { id: true, name: true, nickname: true } },
    _count: { select: { likes: true, comments: true, views: true } },
  };

  async getStatus(userId: string, contentType: 'video' | 'short', contentId: string) {
    if (!userId || !contentType || !contentId) {
      throw new BadRequestException('userId, contentType, and contentId are required');
    }
    if (contentType === 'video') {
      const [wl, fav] = await Promise.all([
        this.prisma.videoWatchLater.findUnique({
          where: { videoId_userId: { videoId: contentId, userId } },
        }),
        this.prisma.videoFavorite.findUnique({
          where: { videoId_userId: { videoId: contentId, userId } },
        }),
      ]);
      return { inWatchLater: !!wl, inFavorites: !!fav };
    } else {
      const [wl, fav] = await Promise.all([
        this.prisma.shortWatchLater.findUnique({
          where: { shortId_userId: { shortId: contentId, userId } },
        }),
        this.prisma.shortFavorite.findUnique({
          where: { shortId_userId: { shortId: contentId, userId } },
        }),
      ]);
      return { inWatchLater: !!wl, inFavorites: !!fav };
    }
  }

  async setPlaylist(
    userId: string,
    playlistType: 'watch_later' | 'favorites',
    contentType: 'video' | 'short',
    contentId: string,
    add: boolean,
  ) {
    if (!userId || !playlistType || !contentType || !contentId) {
      throw new BadRequestException('userId, playlistType, contentType, and contentId are required');
    }
    if (contentType === 'video') {
      if (playlistType === 'watch_later') {
        if (add) {
          await this.prisma.videoWatchLater.upsert({
            where: { videoId_userId: { videoId: contentId, userId } },
            create: { videoId: contentId, userId },
            update: {},
          });
        } else {
          await this.prisma.videoWatchLater.deleteMany({
            where: { videoId: contentId, userId },
          });
        }
      } else {
        if (add) {
          await this.prisma.videoFavorite.upsert({
            where: { videoId_userId: { videoId: contentId, userId } },
            create: { videoId: contentId, userId },
            update: {},
          });
        } else {
          await this.prisma.videoFavorite.deleteMany({
            where: { videoId: contentId, userId },
          });
        }
      }
    } else {
      if (playlistType === 'watch_later') {
        if (add) {
          await this.prisma.shortWatchLater.upsert({
            where: { shortId_userId: { shortId: contentId, userId } },
            create: { shortId: contentId, userId },
            update: {},
          });
        } else {
          await this.prisma.shortWatchLater.deleteMany({
            where: { shortId: contentId, userId },
          });
        }
      } else {
        if (add) {
          await this.prisma.shortFavorite.upsert({
            where: { shortId_userId: { shortId: contentId, userId } },
            create: { shortId: contentId, userId },
            update: {},
          });
        } else {
          await this.prisma.shortFavorite.deleteMany({
            where: { shortId: contentId, userId },
          });
        }
      }
    }
    return { success: true };
  }

  async getWatchLater(userId: string, page = 1, limit = 50) {
    if (!userId) throw new BadRequestException('userId is required');
    const skip = (page - 1) * limit;

    const [vLikes, sLikes] = await Promise.all([
      this.prisma.videoWatchLater.findMany({
        where: { userId },
        skip,
        take: Math.ceil(limit / 2),
        orderBy: { createdAt: 'desc' },
        include: { video: { include: this.videoInclude } },
      }),
      this.prisma.shortWatchLater.findMany({
        where: { userId },
        skip,
        take: Math.ceil(limit / 2),
        orderBy: { createdAt: 'desc' },
        include: { short: { include: this.shortInclude } },
      }),
    ]);

    const videos = vLikes
      .filter((v) => v.video?.status !== 'deleted' && v.video?.visibility === 'public')
      .map((v) => ({ ...v.video, type: 'video' as const, addedAt: v.createdAt }));
    const shorts = sLikes
      .filter((s) => s.short?.status !== 'deleted' && s.short?.visibility === 'public')
      .map((s) => ({ ...s.short, type: 'short' as const, addedAt: s.createdAt }));

    const combined = [...videos, ...shorts].sort(
      (a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime(),
    );
    return { items: combined.slice(0, limit), videos, shorts };
  }

  async getFavorites(userId: string, page = 1, limit = 50) {
    if (!userId) throw new BadRequestException('userId is required');
    const skip = (page - 1) * limit;

    const [vLikes, sLikes] = await Promise.all([
      this.prisma.videoFavorite.findMany({
        where: { userId },
        skip,
        take: Math.ceil(limit / 2),
        orderBy: { createdAt: 'desc' },
        include: { video: { include: this.videoInclude } },
      }),
      this.prisma.shortFavorite.findMany({
        where: { userId },
        skip,
        take: Math.ceil(limit / 2),
        orderBy: { createdAt: 'desc' },
        include: { short: { include: this.shortInclude } },
      }),
    ]);

    const videos = vLikes
      .filter((v) => v.video?.status !== 'deleted' && v.video?.visibility === 'public')
      .map((v) => ({ ...v.video, type: 'video' as const, addedAt: v.createdAt }));
    const shorts = sLikes
      .filter((s) => s.short?.status !== 'deleted' && s.short?.visibility === 'public')
      .map((s) => ({ ...s.short, type: 'short' as const, addedAt: s.createdAt }));

    const combined = [...videos, ...shorts].sort(
      (a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime(),
    );
    return { items: combined.slice(0, limit), videos, shorts };
  }
}
