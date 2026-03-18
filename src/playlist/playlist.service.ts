import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
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

  private contentVisible(
    scheduledPublishAt: Date | null,
    isOwnerContext: boolean,
  ): boolean {
    if (isOwnerContext) return true;
    if (!scheduledPublishAt) return true;
    return scheduledPublishAt <= new Date();
  }

  async createUserPlaylist(userId: string, name: string) {
    const n = (name || '').trim();
    if (!n) throw new BadRequestException('Playlist name is required');
    return this.prisma.userPlaylist.create({
      data: { userId, name: n.slice(0, 120) },
      include: { _count: { select: { items: true } } },
    });
  }

  async listUserPlaylists(channelUserId: string) {
    const rows = await this.prisma.userPlaylist.findMany({
      where: { userId: channelUserId },
      orderBy: { updatedAt: 'desc' },
      include: { _count: { select: { items: true } } },
    });
    return {
      playlists: rows.map((r) => ({
        id: r.id,
        name: r.name,
        itemCount: r._count.items,
        updatedAt: r.updatedAt,
      })),
    };
  }

  async deleteUserPlaylist(ownerId: string, playlistId: string) {
    const pl = await this.prisma.userPlaylist.findUnique({
      where: { id: playlistId },
    });
    if (!pl) throw new NotFoundException('Playlist not found');
    if (pl.userId !== ownerId) throw new ForbiddenException();
    await this.prisma.userPlaylist.delete({ where: { id: playlistId } });
    return { success: true };
  }

  async renameUserPlaylist(ownerId: string, playlistId: string, name: string) {
    const n = (name || '').trim();
    if (!n) throw new BadRequestException('Name required');
    const pl = await this.prisma.userPlaylist.findUnique({
      where: { id: playlistId },
    });
    if (!pl) throw new NotFoundException('Playlist not found');
    if (pl.userId !== ownerId) throw new ForbiddenException();
    return this.prisma.userPlaylist.update({
      where: { id: playlistId },
      data: { name: n.slice(0, 120) },
    });
  }

  async getPlaylistItems(
    playlistId: string,
    page = 1,
    limit = 50,
    viewerUserId?: string,
  ) {
    const pl = await this.prisma.userPlaylist.findUnique({
      where: { id: playlistId },
    });
    if (!pl) throw new NotFoundException('Playlist not found');
    const isChannelOwner =
      !!viewerUserId && String(viewerUserId) === String(pl.userId);
    const skip = (page - 1) * limit;
    const items = await this.prisma.userPlaylistItem.findMany({
      where: { playlistId },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    });
    const total = await this.prisma.userPlaylistItem.count({
      where: { playlistId },
    });
    const out: any[] = [];
    for (const it of items) {
      if (it.contentType === 'video') {
        const v = await this.prisma.video.findUnique({
          where: { id: it.contentId },
          include: this.videoInclude,
        });
        if (
          !v ||
          v.status === 'deleted' ||
          !this.contentVisible(v.scheduledPublishAt, isChannelOwner)
        )
          continue;
        if (!isChannelOwner && v.visibility !== 'public') continue;
        out.push({
          ...v,
          type: 'video' as const,
          addedAt: it.createdAt,
        });
      } else {
        const s = await this.prisma.short.findUnique({
          where: { id: it.contentId },
          include: this.shortInclude,
        });
        if (!s || s.status === 'deleted') continue;
        if (!isChannelOwner && s.visibility !== 'public') continue;
        out.push({
          ...s,
          type: 'short' as const,
          addedAt: it.createdAt,
        });
      }
    }
    return {
      items: out,
      playlist: { id: pl.id, name: pl.name, userId: pl.userId },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async setUserPlaylistItem(
    ownerId: string,
    playlistId: string,
    contentType: 'video' | 'short',
    contentId: string,
    add: boolean,
  ) {
    const pl = await this.prisma.userPlaylist.findUnique({
      where: { id: playlistId },
    });
    if (!pl) throw new NotFoundException('Playlist not found');
    if (pl.userId !== ownerId) throw new ForbiddenException();
    if (add) {
      await this.prisma.userPlaylistItem.upsert({
        where: {
          playlistId_contentType_contentId: {
            playlistId,
            contentType,
            contentId,
          },
        },
        create: { playlistId, contentType, contentId },
        update: {},
      });
    } else {
      await this.prisma.userPlaylistItem.deleteMany({
        where: { playlistId, contentType, contentId },
      });
    }
    return { success: true };
  }

  async getSaveMembership(
    userId: string,
    contentType: 'video' | 'short',
    contentId: string,
  ) {
    const base = await this.getStatus(userId, contentType, contentId);
    const customRows = await this.prisma.userPlaylistItem.findMany({
      where: {
        contentType,
        contentId,
        playlist: { userId },
      },
      select: { playlistId: true },
    });
    return {
      ...base,
      customPlaylistIds: customRows.map((r) => r.playlistId),
    };
  }
}
