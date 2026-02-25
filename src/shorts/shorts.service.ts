import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ServiceUnavailableException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { R2StorageService } from '../r2-storage/r2-storage.service';
import { SubscriptionService } from '../subscription/subscription.service';
import {
  CreateShortDto,
  UpdateShortDto,
  ShortQueryDto,
  ShortLikeDto,
  ShortCommentDto,
  ShortCommentLikeDto,
  ShortCommentDislikeDto,
  ShortViewDto,
} from './dto/shorts.dto';

@Injectable()
export class ShortsService {
  private readonly logger = new Logger(ShortsService.name);

  constructor(
    private prisma: PrismaService,
    private r2Storage: R2StorageService,
    private subscriptionService: SubscriptionService,
  ) {}

  /**
   * Upload short video with thumbnail
   */
  async uploadShort(
    videoFile: Express.Multer.File,
    thumbnailFile: Express.Multer.File | null,
    createShortDto: CreateShortDto,
  ) {
    const limitCheck = await this.subscriptionService.checkCanUploadShort(createShortDto.userId);
    if (!limitCheck.allowed) {
      throw new BadRequestException(limitCheck.message);
    }
    try {
      const { url: videoUrl, key: videoKey } = await this.r2Storage.uploadFile(
        videoFile,
        'shorts',
      );

      let thumbnailUrl: string | null = null;
      if (thumbnailFile) {
        const thumb = await this.r2Storage.uploadFile(
          thumbnailFile,
          'shorts/thumbnails',
        );
        thumbnailUrl = thumb.url;
      }

      const short = await this.prisma.short.create({
        data: {
          userId: createShortDto.userId,
          title: createShortDto.title || 'Untitled Short',
          description: createShortDto.description,
          videoUrl,
          thumbnailUrl,
          duration: createShortDto.duration,
          durationLimit: createShortDto.durationLimit || '60',
          fileSize: videoFile.size,
          mimeType: videoFile.mimetype,
          filterId: createShortDto.filterId,
          filterName: createShortDto.filterName,
          soundId: createShortDto.soundId,
          soundTitle: createShortDto.soundTitle,
          soundArtist: createShortDto.soundArtist,
          soundUrl: createShortDto.soundUrl,
          beautyLevel: createShortDto.beautyLevel ?? 0,
          timerSeconds: createShortDto.timerSeconds,
          speedFactor: createShortDto.speedFactor ?? 1,
          cameraFacing: createShortDto.cameraFacing,
          commentSetting: createShortDto.commentSetting || 'allow',
          visibility: createShortDto.visibility || 'public',
          isLive: createShortDto.isLive || false,
          liveChannelId: createShortDto.liveChannelId,
          category: createShortDto.category,
          tags: createShortDto.tags || [],
          status: 'ready',
          publishedAt: new Date(),
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              nickname: true,
              email: true,
            },
          },
        },
      });

      this.logger.log(`Short uploaded successfully: ${short.id}`);
      return short;
    } catch (error: any) {
      this.logger.error(`Error uploading short: ${error.message}`);
      const isR2Error = error?.message?.includes('R2');
      if (isR2Error) {
        throw new ServiceUnavailableException(
          'Storage upload failed. Check R2 credentials.',
        );
      }
      throw new BadRequestException(
        error?.message || 'Failed to upload short',
      );
    }
  }

  /**
   * Create live short (Agora channel)
   */
  async createLiveShort(userId: string, channelName: string) {
    const short = await this.prisma.short.create({
      data: {
        userId,
        title: 'Live',
        videoUrl: '', // Live streams don't have stored video
        isLive: true,
        liveChannelId: channelName,
        status: 'ready',
        publishedAt: new Date(),
        visibility: 'public',
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            nickname: true,
          },
        },
      },
    });
    return short;
  }

  /**
   * Haversine distance in km
   */
  private haversineKm(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number,
  ): number {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Get shorts with pagination and filters
   */
  async getShorts(query: ShortQueryDto) {
    const {
      userId,
      category,
      search,
      isLive,
      page = 1,
      limit = 20,
      sort,
      nearbyLat,
      nearbyLng,
      radiusKm = 50,
    } = query;
    const skip = (page - 1) * limit;

    const where: any = {
      status: 'ready',
      visibility: 'public',
    };

    if (userId) where.userId = userId;
    if (nearbyLat != null && nearbyLng != null) {
      const usersWithLocation = await this.prisma.user.findMany({
        where: {
          latitude: { not: null },
          longitude: { not: null },
        },
        select: { id: true, latitude: true, longitude: true },
      });
      const nearbyUserIds = usersWithLocation
        .filter(
          (u) =>
            u.latitude != null &&
            u.longitude != null &&
            this.haversineKm(nearbyLat, nearbyLng, u.latitude, u.longitude) <=
              radiusKm,
        )
        .map((u) => u.id);
      where.userId = { in: nearbyUserIds.length > 0 ? nearbyUserIds : [''] };
    }
    if (category) where.category = category;
    if (isLive !== undefined) where.isLive = isLive;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const orderBy =
      sort === 'trending'
        ? { viewCount: 'desc' as const }
        : { createdAt: 'desc' as const };

    const [shorts, total] = await Promise.all([
      this.prisma.short.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              nickname: true,
              email: true,
              address: true,
              latitude: true,
              longitude: true,
            },
          },
          _count: {
            select: {
              likes: true,
              comments: true,
              views: true,
            },
          },
        },
      }),
      this.prisma.short.count({ where }),
    ]);

    return {
      shorts,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get short by ID
   */
  async getShortById(id: string, userId?: string) {
    const short = await this.prisma.short.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            nickname: true,
            email: true,
            address: true,
            latitude: true,
            longitude: true,
            socialLinks: true,
          },
        },
        _count: {
          select: {
            likes: true,
            comments: true,
            views: true,
          },
        },
      },
    });

    if (!short) throw new NotFoundException('Short not found');

    let isLiked = false;
    if (userId) {
      const like = await this.prisma.shortLike.findUnique({
        where: {
          shortId_userId: { shortId: id, userId },
        },
      });
      isLiked = !!like;
    }

    return { ...short, isLiked };
  }

  /**
   * Update short
   */
  async updateShort(id: string, userId: string, updateShortDto: UpdateShortDto) {
    const short = await this.prisma.short.findUnique({ where: { id } });
    if (!short) throw new NotFoundException('Short not found');
    if (short.userId !== userId) {
      throw new BadRequestException('You can only update your own shorts');
    }

    return this.prisma.short.update({
      where: { id },
      data: updateShortDto,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            nickname: true,
          },
        },
      },
    });
  }

  /**
   * Delete short
   */
  async deleteShort(id: string, userId: string) {
    const short = await this.prisma.short.findUnique({ where: { id } });
    if (!short) throw new NotFoundException('Short not found');
    if (short.userId !== userId) {
      throw new BadRequestException('You can only delete your own shorts');
    }

    if (short.videoUrl && !short.isLive) {
      try {
        const videoKey = short.videoUrl.split('/').slice(-2).join('/');
        await this.r2Storage.deleteFile(videoKey);
      } catch (e: any) {
        this.logger.error(`Error deleting R2 file: ${e.message}`);
      }
    }

    await this.prisma.short.delete({ where: { id } });
    return { message: 'Short deleted successfully' };
  }

  /**
   * Toggle like
   */
  async toggleLike(shortLikeDto: ShortLikeDto) {
    const { shortId, userId } = shortLikeDto;
    const short = await this.prisma.short.findUnique({
      where: { id: shortId },
    });
    if (!short) throw new NotFoundException('Short not found');

    const existing = await this.prisma.shortLike.findUnique({
      where: {
        shortId_userId: { shortId, userId },
      },
    });

    if (existing) {
      await this.prisma.shortLike.delete({ where: { id: existing.id } });
      await this.prisma.short.update({
        where: { id: shortId },
        data: { likeCount: { decrement: 1 } },
      });
      return { liked: false, message: 'Short unliked' };
    } else {
      await this.prisma.shortLike.create({
        data: { shortId, userId },
      });
      await this.prisma.short.update({
        where: { id: shortId },
        data: { likeCount: { increment: 1 } },
      });
      return { liked: true, message: 'Short liked' };
    }
  }

  /**
   * Toggle dislike
   */
  async toggleDislike(shortDislikeDto: { shortId: string; userId: string }) {
    const { shortId, userId } = shortDislikeDto;
    const short = await this.prisma.short.findUnique({
      where: { id: shortId },
    });
    if (!short) throw new NotFoundException('Short not found');

    const existing = await this.prisma.shortDislike.findUnique({
      where: {
        shortId_userId: { shortId, userId },
      },
    });

    if (existing) {
      await this.prisma.shortDislike.delete({ where: { id: existing.id } });
      await this.prisma.short.update({
        where: { id: shortId },
        data: { dislikeCount: { decrement: 1 } },
      });
      return { disliked: false, message: 'Short undisliked' };
    } else {
      await this.prisma.shortDislike.create({
        data: { shortId, userId },
      });
      await this.prisma.short.update({
        where: { id: shortId },
        data: { dislikeCount: { increment: 1 } },
      });
      return { disliked: true, message: 'Short disliked' };
    }
  }

  /**
   * Add comment
   */
  async addComment(shortCommentDto: ShortCommentDto) {
    const { shortId, userId, content, parentId } = shortCommentDto;
    const short = await this.prisma.short.findUnique({
      where: { id: shortId },
    });
    if (!short) throw new NotFoundException('Short not found');

    const comment = await this.prisma.shortComment.create({
      data: { shortId, userId, content, parentId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            nickname: true,
          },
        },
      },
    });

    await this.prisma.short.update({
      where: { id: shortId },
      data: { commentCount: { increment: 1 } },
    });

    return comment;
  }

  /**
   * Get comments
   */
  async getComments(
    shortId: string,
    page = 1,
    limit = 20,
    userId?: string,
  ) {
    const skip = (page - 1) * limit;
    const [comments, total] = await Promise.all([
      this.prisma.shortComment.findMany({
        where: { shortId, parentId: null },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              nickname: true,
            },
          },
          replies: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  nickname: true,
                },
              },
            },
            orderBy: { createdAt: 'asc' },
          },
        },
      }),
      this.prisma.shortComment.count({
        where: { shortId, parentId: null },
      }),
    ]);

    const enrichComment = async (c: any) => {
      let isLiked = false;
      let isDisliked = false;
      if (userId) {
        const [like, dislike] = await Promise.all([
          this.prisma.shortCommentLike.findUnique({
            where: { commentId_userId: { commentId: c.id, userId } },
          }),
          this.prisma.shortCommentDislike.findUnique({
            where: { commentId_userId: { commentId: c.id, userId } },
          }),
        ]);
        isLiked = !!like;
        isDisliked = !!dislike;
      }
      const repliesEnriched = await Promise.all(
        (c.replies || []).map((r: any) => enrichComment(r)),
      );
      return {
        ...c,
        replies: repliesEnriched,
        isLiked,
        isDisliked,
      };
    };

    const commentsEnriched = await Promise.all(comments.map(enrichComment));

    return {
      comments: commentsEnriched,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Toggle comment like
   */
  async toggleCommentLike(dto: ShortCommentLikeDto) {
    const { commentId, userId } = dto;

    const comment = await this.prisma.shortComment.findUnique({
      where: { id: commentId },
    });
    if (!comment)
      throw new NotFoundException('Comment not found');

    const existingLike = await this.prisma.shortCommentLike.findUnique({
      where: { commentId_userId: { commentId, userId } },
    });

    if (existingLike) {
      await this.prisma.shortCommentLike.delete({
        where: { id: existingLike.id },
      });
      await this.prisma.shortComment.update({
        where: { id: commentId },
        data: { likeCount: { decrement: 1 } },
      });
      return { liked: false };
    } else {
      const existingDislike = await this.prisma.shortCommentDislike.findUnique({
        where: { commentId_userId: { commentId, userId } },
      });
      if (existingDislike) {
        await this.prisma.shortCommentDislike.delete({
          where: { id: existingDislike.id },
        });
        await this.prisma.shortComment.update({
          where: { id: commentId },
          data: { dislikeCount: { decrement: 1 } },
        });
      }
      await this.prisma.shortCommentLike.create({
        data: { commentId, userId },
      });
      await this.prisma.shortComment.update({
        where: { id: commentId },
        data: { likeCount: { increment: 1 } },
      });
      return { liked: true };
    }
  }

  /**
   * Toggle comment dislike
   */
  async toggleCommentDislike(dto: ShortCommentDislikeDto) {
    const { commentId, userId } = dto;

    const comment = await this.prisma.shortComment.findUnique({
      where: { id: commentId },
    });
    if (!comment)
      throw new NotFoundException('Comment not found');

    const existingDislike = await this.prisma.shortCommentDislike.findUnique({
      where: { commentId_userId: { commentId, userId } },
    });

    if (existingDislike) {
      await this.prisma.shortCommentDislike.delete({
        where: { id: existingDislike.id },
      });
      await this.prisma.shortComment.update({
        where: { id: commentId },
        data: { dislikeCount: { decrement: 1 } },
      });
      return { disliked: false };
    } else {
      const existingLike = await this.prisma.shortCommentLike.findUnique({
        where: { commentId_userId: { commentId, userId } },
      });
      if (existingLike) {
        await this.prisma.shortCommentLike.delete({
          where: { id: existingLike.id },
        });
        await this.prisma.shortComment.update({
          where: { id: commentId },
          data: { likeCount: { decrement: 1 } },
        });
      }
      await this.prisma.shortCommentDislike.create({
        data: { commentId, userId },
      });
      await this.prisma.shortComment.update({
        where: { id: commentId },
        data: { dislikeCount: { increment: 1 } },
      });
      return { disliked: true };
    }
  }

  /**
   * Record view
   */
  async recordView(shortViewDto: ShortViewDto) {
    const { shortId, userId, watchTime, completed } = shortViewDto;
    const short = await this.prisma.short.findUnique({
      where: { id: shortId },
    });
    if (!short) throw new NotFoundException('Short not found');

    await this.prisma.shortView.create({
      data: {
        shortId,
        userId,
        watchTime: watchTime || 0,
        completed: completed || false,
      },
    });

    await this.prisma.short.update({
      where: { id: shortId },
      data: { viewCount: { increment: 1 } },
    });

    return { message: 'View recorded' };
  }

  /**
   * Get user's watch history (shorts they've viewed)
   */
  async getUserShortHistory(userId: string, page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    const views = await this.prisma.shortView.findMany({
      where: { userId },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        short: {
          include: {
            user: {
              select: { id: true, name: true, nickname: true },
            },
            _count: { select: { likes: true, comments: true, views: true } },
          },
        },
      },
    });
    const total = await this.prisma.shortView.count({ where: { userId } });
    const history = views
      .filter(
        (v) =>
          v.short &&
          v.short.status !== 'deleted' &&
          v.short.visibility === 'public',
      )
      .map((v) => ({ short: v.short, watchedAt: v.createdAt }));
    return {
      history,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  /**
   * Get user's liked shorts
   */
  async getUserLikedShorts(userId: string, page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    const likes = await this.prisma.shortLike.findMany({
      where: { userId },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        short: {
          include: {
            user: {
              select: { id: true, name: true, nickname: true },
            },
            _count: { select: { likes: true, comments: true, views: true } },
          },
        },
      },
    });
    const total = await this.prisma.shortLike.count({ where: { userId } });
    const shorts = likes
      .filter(
        (l) =>
          l.short &&
          l.short.status !== 'deleted' &&
          l.short.visibility === 'public',
      )
      .map((l) => l.short);
    return {
      shorts,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  /**
   * Get user shorts
   */
  async getUserShorts(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [shorts, total] = await Promise.all([
      this.prisma.short.findMany({
        where: {
          userId,
          status: { not: 'deleted' },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              nickname: true,
            },
          },
          _count: {
            select: {
              likes: true,
              comments: true,
              views: true,
            },
          },
        },
      }),
      this.prisma.short.count({
        where: {
          userId,
          status: { not: 'deleted' },
        },
      }),
    ]);

    return {
      shorts,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get sounds library (for shorts)
   */
  async getSounds(search?: string, trending = false) {
    const where: any = {};
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { artist: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (trending) where.isTrending = true;

    const sounds = await this.prisma.shortSound.findMany({
      where,
      orderBy: [{ isTrending: 'desc' }, { usageCount: 'desc' }],
      take: 50,
    });
    return { sounds };
  }

  /**
   * Get filters library
   */
  async getFilters(trending = false) {
    const where: any = {};
    if (trending) where.isTrending = true;
    const filters = await this.prisma.shortFilter.findMany({
      where,
      orderBy: [{ isTrending: 'desc' }],
      take: 50,
    });
    return { filters };
  }
}
