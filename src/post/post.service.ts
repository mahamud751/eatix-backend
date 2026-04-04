import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ServiceUnavailableException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { R2StorageService } from '../r2-storage/r2-storage.service';
import { ScheduledContentService } from '../scheduled-content/scheduled-content.service';
import {
  CreatePostDto,
  UpdatePostDto,
  PostQueryDto,
  PostLikeDto,
  PostDislikeDto,
  PostShareDto,
  PostCommentDto,
  PostCommentLikeDto,
  PostCommentDislikeDto,
  PostCommentDeleteDto,
} from './dto/post.dto';

@Injectable()
export class PostService {
  private readonly logger = new Logger(PostService.name);

  constructor(
    private prisma: PrismaService,
    private notificationService: NotificationService,
    private r2Storage: R2StorageService,
    private scheduledContentService: ScheduledContentService,
  ) {}

  /**
   * Multipart `platforms` JSON; default facebook+instagram+tiktok if absent; [] disables auto-post.
   */
  private parsePlatformsInput(raw: unknown): string[] {
    if (raw == null || String(raw).trim() === '') {
      return ['facebook', 'instagram', 'tiktok'];
    }
    try {
      const parsed = JSON.parse(String(raw));
      if (Array.isArray(parsed)) {
        return parsed
          .map((x) => String(x).toLowerCase().trim())
          .filter(Boolean);
      }
    } catch {
      return ['facebook', 'instagram', 'tiktok'];
    }
    return ['facebook', 'instagram', 'tiktok'];
  }

  private static readonly AUTO_POST_PLATFORMS = [
    'facebook',
    'instagram',
    'tiktok',
  ] as const;

  /**
   * One scheduled row per post: cron publishes to Facebook / Instagram / TikTok at metadata.publishAt.
   */
  private async syncSocialScheduleForNewPost(params: {
    userId: string;
    postId: string;
    title: string;
    description?: string | null;
    publishedAt: Date;
    thumbnailUrl?: string | null;
    mediaUrl?: string | null;
    mediaType?: 'image' | 'video';
    platforms: string[];
    facebookPageId?: string | null;
    instagramAccountId?: string | null;
    tiktokAccountId?: string | null;
    deviceTimeZone?: string | null;
  }): Promise<void> {
    const requested = params.platforms.map((p) => String(p).toLowerCase()).filter(Boolean);
    const socialTargets = requested.filter((p) =>
      (PostService.AUTO_POST_PLATFORMS as readonly string[]).includes(p),
    );
    if (socialTargets.length === 0) {
      return;
    }

    const pageIdFilter = params.facebookPageId?.trim();
    let facebookPageIdForMeta: string | undefined;
    const needsPageHint =
      socialTargets.includes('facebook') || socialTargets.includes('instagram');
    if (needsPageHint) {
      const fbAcc = pageIdFilter
        ? await this.prisma.socialAccount.findFirst({
            where: {
              userId: params.userId,
              platform: 'facebook',
              accountId: pageIdFilter,
            },
          })
        : await this.prisma.socialAccount.findFirst({
            where: { userId: params.userId, platform: 'facebook' },
            orderBy: { createdAt: 'desc' },
          });
      if (fbAcc?.accountId) {
        facebookPageIdForMeta = fbAcc.accountId;
      }
    }

    const user = await this.prisma.user.findUnique({
      where: { id: params.userId },
      select: { businessName: true, nickname: true, name: true },
    });
    const companyName =
      user?.businessName?.trim() ||
      user?.nickname?.trim() ||
      user?.name?.trim() ||
      'Company';
    const when = params.publishedAt;
    const publishAtIso = when.toISOString();
    const y = when.getUTCFullYear();
    const mo = String(when.getUTCMonth() + 1).padStart(2, '0');
    const day = String(when.getUTCDate()).padStart(2, '0');
    const scheduledDateStr = `${y}-${mo}-${day}`;
    const hh = String(when.getUTCHours()).padStart(2, '0');
    const mm = String(when.getUTCMinutes()).padStart(2, '0');
    const mediaUrls = [params.thumbnailUrl, params.mediaUrl].filter(
      (u): u is string => typeof u === 'string' && /^https?:\/\//i.test(u),
    );
    const primaryMediaIsVideo = params.mediaType === 'video';

    const metadata: Record<string, unknown> = {
      source: 'post-create',
      contentType: 'post',
      contentBody: (params.description || params.title || '').trim(),
      contentMediaUrls: mediaUrls,
      publishAt: publishAtIso,
      primaryMediaIsVideo,
      ...(facebookPageIdForMeta
        ? { facebookPageId: facebookPageIdForMeta }
        : {}),
      ...(params.instagramAccountId?.trim()
        ? { instagramAccountId: params.instagramAccountId.trim() }
        : {}),
      ...(params.tiktokAccountId?.trim()
        ? { tiktokAccountId: params.tiktokAccountId.trim() }
        : {}),
    };
    const tz = params.deviceTimeZone?.trim();
    if (tz) {
      metadata.timeZone = tz;
    }
    try {
      await this.scheduledContentService.create({
        userId: params.userId,
        companyId: params.userId,
        companyName,
        contentId: params.postId,
        contentTitle: params.title,
        scheduledDate: scheduledDateStr,
        scheduledTime: `${hh}:${mm}`,
        platforms: requested.length ? requested : socialTargets,
        status: 'scheduled',
        metadata,
      });
      this.logger.log(
        `Social schedule row for post ${params.postId} platforms=${(requested.length ? requested : socialTargets).join(',')} publishAt=${publishAtIso}`,
      );
    } catch (e: any) {
      this.logger.error(
        `Failed scheduled-content for post ${params.postId}: ${e?.message || e}`,
      );
    }
  }

  /** Hide posts whose publishedAt is in the future unless the viewer is the author. */
  private applyPublishedVisibility(
    where: Record<string, unknown>,
    opts: { profileUserId?: string; viewerUserId?: string },
  ) {
    const { profileUserId, viewerUserId } = opts;
    const viewingOwnProfile =
      !!profileUserId &&
      !!viewerUserId &&
      String(profileUserId) === String(viewerUserId);
    if (viewingOwnProfile) {
      return;
    }
    const now = new Date();
    const pubClause = {
      OR: [{ publishedAt: null }, { publishedAt: { lte: now } }],
    };
    if (!where.AND) {
      where.AND = [pubClause];
    } else if (Array.isArray(where.AND)) {
      where.AND.push(pubClause);
    } else {
      where.AND = [where.AND, pubClause];
    }
  }

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

  async getPosts(query: PostQueryDto) {
    const {
      userId,
      page = 1,
      limit = 20,
      sort = 'latest',
      nearbyLat,
      nearbyLng,
      radiusKm = 50,
      viewerRole,
      viewerUserId,
    } = query;

    const skip = (page - 1) * limit;
    const where: any = {};

    // Nearby: same as Video — filter by creator (user) location only
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
            this.haversineKm(nearbyLat, nearbyLng, u.latitude, u.longitude) <= radiusKm,
        )
        .map((u) => u.id);
      if (userId) {
        where.userId = nearbyUserIds.includes(userId) ? userId : '';
      } else {
        where.userId = { in: nearbyUserIds.length > 0 ? nearbyUserIds : [''] };
      }
    } else if (userId) {
      where.userId = userId;
    }

    // Exclude vendor posts from feed only when viewer is 'user' and we're not loading a specific user's profile
    const viewerRoleNorm = (viewerRole || 'user').toLowerCase();
    if (viewerRoleNorm === 'user' && userId == null) {
      where.user = { role: { not: 'vendor' } };
    }

    this.applyPublishedVisibility(where, {
      profileUserId: userId ?? undefined,
      viewerUserId: viewerUserId ?? undefined,
    });

    const orderBy = { createdAt: 'desc' as const };

    const [posts, total] = await Promise.all([
      this.prisma.post.findMany({
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
              address: true,
              latitude: true,
              longitude: true,
              photos: true,
            },
          },
          _count: {
            select: { likes: true, comments: true },
          },
        },
      }),
      this.prisma.post.count({ where }),
    ]);

    return {
      posts,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getPostById(id: string, userId?: string) {
    const post = await this.prisma.post.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            nickname: true,
            address: true,
            latitude: true,
            longitude: true,
            socialLinks: true,
            role: true,
            photos: true,
          },
        },
        _count: {
          select: { likes: true, comments: true },
        },
      },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    const now = new Date();
    if (
      post.publishedAt &&
      post.publishedAt.getTime() > now.getTime() &&
      (!userId || String(post.userId) !== String(userId))
    ) {
      throw new NotFoundException('Post not found');
    }

    let isLiked = false;
    let isDisliked = false;
    if (userId) {
      const [like, dislike] = await Promise.all([
        this.prisma.postLike.findUnique({
          where: { postId_userId: { postId: id, userId } },
        }),
        this.prisma.postDislike.findUnique({
          where: { postId_userId: { postId: id, userId } },
        }),
      ]);
      isLiked = !!like;
      isDisliked = !!dislike;
    }

    const topLevelCommentCount = await this.prisma.postComment.count({
      where: { postId: id, parentId: null },
    });

    return {
      ...post,
      isLiked,
      isDisliked,
      topLevelCommentCount,
    };
  }

  /**
   * Upload post with thumbnail (required) and optional video.
   * files: 1 = image only (mediaType image), 2 = image + video (mediaType video).
   */
  async uploadPost(
    files: Express.Multer.File[],
    body: {
      userId: string;
      title: string;
      description?: string;
      website?: string;
      hashtags?: string[] | string;
      duration?: number;
      scheduledPublishAt?: string;
      platforms?: string;
      facebookPageId?: string;
      instagramAccountId?: string;
      tiktokAccountId?: string;
      deviceTimeZone?: string;
    },
  ) {
    if (!files || files.length < 1) {
      throw new BadRequestException('At least a thumbnail image is required');
    }
    const imageFile = files.find((f) => f.mimetype.startsWith('image/'));
    const videoFile = files.find((f) => f.mimetype.startsWith('video/'));
    if (!imageFile) {
      throw new BadRequestException('Thumbnail must be an image');
    }
    if (!body.userId || !body.title) {
      throw new BadRequestException('userId and title are required');
    }
    let hashtags: string[] = [];
    if (Array.isArray(body.hashtags)) {
      hashtags = body.hashtags.map(String);
    } else if (typeof body.hashtags === 'string' && body.hashtags.trim()) {
      try {
        const parsed = JSON.parse(body.hashtags);
        hashtags = Array.isArray(parsed) ? parsed.map(String) : body.hashtags.split(',').map((s) => s.trim()).filter(Boolean);
      } catch {
        hashtags = body.hashtags.split(',').map((s) => s.trim()).filter(Boolean);
      }
    }
    const duration =
      typeof body.duration === 'number'
        ? body.duration
        : body.duration != null
          ? parseInt(String(body.duration), 10)
          : undefined;
    try {
      const { url: thumbnailUrl } = await this.r2Storage.uploadFile(
        imageFile,
        'thumbnails',
      );
      let mediaUrl = thumbnailUrl;
      let mediaType: 'image' | 'video' = 'image';
      let durationSec = duration ?? 0;
      if (videoFile && files.length >= 2) {
        const { url: videoUrl } = await this.r2Storage.uploadFile(
          videoFile,
          'videos',
        );
        mediaUrl = videoUrl;
        mediaType = 'video';
        if (durationSec === 0 && videoFile.size) {
          durationSec = 0;
        }
      }
      let publishedAt = new Date();
      const schedRaw = body.scheduledPublishAt?.trim();
      if (schedRaw) {
        const d = new Date(schedRaw);
        if (!Number.isNaN(d.getTime()) && d.getTime() > Date.now() + 30_000) {
          publishedAt = d;
        }
      }
      const post = await this.prisma.post.create({
        data: {
          userId: body.userId,
          title: body.title,
          description: body.description ?? undefined,
          mediaUrl,
          thumbnailUrl,
          mediaType,
          duration: durationSec,
          website: body.website ?? undefined,
          hashtags: Array.isArray(hashtags) ? hashtags : [],
          publishedAt,
        },
        include: {
          user: {
            select: { id: true, name: true, nickname: true },
          },
        },
      });
      this.logger.log(`Post uploaded successfully: ${post.id}`);
      const platforms = this.parsePlatformsInput(body.platforms);
      await this.syncSocialScheduleForNewPost({
        userId: post.userId,
        postId: post.id,
        title: post.title,
        description: post.description,
        publishedAt: post.publishedAt ?? publishedAt,
        thumbnailUrl: post.thumbnailUrl,
        mediaUrl: post.mediaUrl,
        mediaType: mediaType,
        platforms,
        facebookPageId: body.facebookPageId,
        instagramAccountId: body.instagramAccountId,
        tiktokAccountId: body.tiktokAccountId,
        deviceTimeZone: body.deviceTimeZone,
      });
      return post;
    } catch (error: any) {
      this.logger.error(`Error uploading post: ${error?.message}`);
      if (error?.message?.includes('R2')) {
        throw new ServiceUnavailableException(
          'Storage upload failed. Check R2 credentials and bucket permissions.',
        );
      }
      throw new BadRequestException(
        error?.message || 'Failed to upload post',
      );
    }
  }

  async createPost(dto: CreatePostDto) {
    let publishedAt = new Date();
    if (dto.publishedAt) {
      const d = new Date(dto.publishedAt);
      if (!Number.isNaN(d.getTime()) && d.getTime() > Date.now() + 30_000) {
        publishedAt = d;
      }
    }
    const post = await this.prisma.post.create({
      data: {
        userId: dto.userId,
        title: dto.title,
        description: dto.description,
        mediaUrl: dto.mediaUrl,
        thumbnailUrl: dto.thumbnailUrl,
        mediaType: (dto.mediaType as 'image' | 'video') || 'image',
        duration: dto.duration,
        website: dto.website,
        hashtags: dto.hashtags || [],
        publishedAt,
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
    this.logger.log(`Post created: ${post.id}`);
    const platforms =
      dto.platforms === undefined
        ? ['facebook', 'instagram', 'tiktok']
        : dto.platforms.map((p) => String(p).toLowerCase()).filter(Boolean);
    await this.syncSocialScheduleForNewPost({
      userId: post.userId,
      postId: post.id,
      title: post.title,
      description: post.description,
      publishedAt: post.publishedAt ?? publishedAt,
      thumbnailUrl: post.thumbnailUrl,
      mediaUrl: post.mediaUrl,
      mediaType: (dto.mediaType as 'image' | 'video') || 'image',
      platforms,
      facebookPageId: dto.facebookAccountId,
      instagramAccountId: dto.instagramAccountId,
      tiktokAccountId: dto.tiktokAccountId,
      deviceTimeZone: null,
    });
    return post;
  }

  async updatePost(id: string, userId: string, dto: UpdatePostDto) {
    const post = await this.prisma.post.findUnique({ where: { id } });
    if (!post) throw new NotFoundException('Post not found');
    if (post.userId !== userId) {
      throw new BadRequestException('You can only update your own posts');
    }
    return this.prisma.post.update({
      where: { id },
      data: dto,
      include: {
        user: {
          select: { id: true, name: true, nickname: true },
        },
      },
    });
  }

  async deletePost(id: string, userId: string) {
    const post = await this.prisma.post.findUnique({ where: { id } });
    if (!post) throw new NotFoundException('Post not found');
    if (post.userId !== userId) {
      throw new BadRequestException('You can only delete your own posts');
    }
    await this.prisma.post.delete({ where: { id } });
    return { message: 'Post deleted successfully' };
  }

  async toggleLike(dto: PostLikeDto) {
    const { postId, userId } = dto;
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundException('Post not found');

    const existing = await this.prisma.postLike.findUnique({
      where: { postId_userId: { postId, userId } },
    });

    if (existing) {
      await this.prisma.postLike.delete({ where: { id: existing.id } });
      await this.prisma.post.update({
        where: { id: postId },
        data: { likeCount: { decrement: 1 } },
      });
      return { liked: false };
    }
    const existingDislike = await this.prisma.postDislike.findUnique({
      where: { postId_userId: { postId, userId } },
    });
    if (existingDislike) {
      await this.prisma.postDislike.delete({ where: { id: existingDislike.id } });
      await this.prisma.post.update({
        where: { id: postId },
        data: { dislikeCount: { decrement: 1 } },
      });
    }
    await this.prisma.postLike.create({ data: { postId, userId } });
    await this.prisma.post.update({
      where: { id: postId },
      data: { likeCount: { increment: 1 } },
    });
    if (post.userId !== userId) {
      try {
        const actor = await this.prisma.user.findUnique({
          where: { id: userId },
          select: { nickname: true, name: true },
        });
        const name = actor?.nickname || actor?.name || 'Someone';
        await this.notificationService.createNotification({
          userId: post.userId,
          message: `${name} liked your post`,
          type: 'post_like',
          contentId: postId,
        });
      } catch (e) {
        this.logger.warn('Failed to create like notification', e);
      }
    }
    return { liked: true };
  }

  async toggleDislike(dto: PostDislikeDto) {
    const { postId, userId } = dto;
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundException('Post not found');

    const existing = await this.prisma.postDislike.findUnique({
      where: { postId_userId: { postId, userId } },
    });

    if (existing) {
      await this.prisma.postDislike.delete({ where: { id: existing.id } });
      await this.prisma.post.update({
        where: { id: postId },
        data: { dislikeCount: { decrement: 1 } },
      });
      return { disliked: false };
    }
    const existingLike = await this.prisma.postLike.findUnique({
      where: { postId_userId: { postId, userId } },
    });
    if (existingLike) {
      await this.prisma.postLike.delete({ where: { id: existingLike.id } });
      await this.prisma.post.update({
        where: { id: postId },
        data: { likeCount: { decrement: 1 } },
      });
    }
    await this.prisma.postDislike.create({ data: { postId, userId } });
    await this.prisma.post.update({
      where: { id: postId },
      data: { dislikeCount: { increment: 1 } },
    });
    return { disliked: true };
  }

  async recordShare(dto: PostShareDto) {
    const { postId } = dto;
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundException('Post not found');
    await this.prisma.post.update({
      where: { id: postId },
      data: { shareCount: { increment: 1 } },
    });
    return { message: 'Share recorded' };
  }

  async addComment(dto: PostCommentDto) {
    const { postId, userId, content, parentId } = dto;
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundException('Post not found');

    const comment = await this.prisma.postComment.create({
      data: { postId, userId, content, parentId },
      include: {
        user: {
          select: { id: true, name: true, nickname: true },
        },
      },
    });

    await this.prisma.post.update({
      where: { id: postId },
      data: { commentCount: { increment: 1 } },
    });

    if (post.userId !== userId) {
      try {
        const name = comment.user?.nickname || comment.user?.name || 'Someone';
        await this.notificationService.createNotification({
          userId: post.userId,
          message: `${name} commented on your post`,
          type: 'post_comment',
          contentId: postId,
        });
      } catch (e) {
        this.logger.warn('Failed to create comment notification', e);
      }
    }
    return comment;
  }

  async getComments(postId: string, page: number = 1, limit: number = 20, userId?: string) {
    const skip = (page - 1) * limit;

    const [comments, total] = await Promise.all([
      this.prisma.postComment.findMany({
        where: { postId, parentId: null },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { id: true, name: true, nickname: true },
          },
          replies: {
            include: {
              user: {
                select: { id: true, name: true, nickname: true },
              },
            },
            orderBy: { createdAt: 'asc' },
          },
        },
      }),
      this.prisma.postComment.count({
        where: { postId, parentId: null },
      }),
    ]);

    const enrich = async (c: any) => {
      let isLiked = false;
      let isDisliked = false;
      if (userId) {
        const [like, dislike] = await Promise.all([
          this.prisma.postCommentLike.findUnique({
            where: { commentId_userId: { commentId: c.id, userId } },
          }),
          this.prisma.postCommentDislike.findUnique({
            where: { commentId_userId: { commentId: c.id, userId } },
          }),
        ]);
        isLiked = !!like;
        isDisliked = !!dislike;
      }
      return {
        ...c,
        isLiked,
        isDisliked,
        replies: await Promise.all((c.replies || []).map(enrich)),
      };
    };

    const enriched = await Promise.all(comments.map(enrich));

    return {
      comments: enriched,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async toggleCommentLike(dto: PostCommentLikeDto) {
    const { commentId, userId } = dto;
    const comment = await this.prisma.postComment.findUnique({
      where: { id: commentId },
    });
    if (!comment) throw new NotFoundException('Comment not found');

    const existing = await this.prisma.postCommentLike.findUnique({
      where: { commentId_userId: { commentId, userId } },
    });

    if (existing) {
      await this.prisma.postCommentLike.delete({ where: { id: existing.id } });
      await this.prisma.postComment.update({
        where: { id: commentId },
        data: { likeCount: { decrement: 1 } },
      });
      return { liked: false };
    }
    const existingDislike = await this.prisma.postCommentDislike.findUnique({
      where: { commentId_userId: { commentId, userId } },
    });
    if (existingDislike) {
      await this.prisma.postCommentDislike.delete({
        where: { id: existingDislike.id },
      });
      await this.prisma.postComment.update({
        where: { id: commentId },
        data: { dislikeCount: { decrement: 1 } },
      });
    }
    await this.prisma.postCommentLike.create({ data: { commentId, userId } });
    await this.prisma.postComment.update({
      where: { id: commentId },
      data: { likeCount: { increment: 1 } },
    });
    return { liked: true };
  }

  async toggleCommentDislike(dto: PostCommentDislikeDto) {
    const { commentId, userId } = dto;
    const comment = await this.prisma.postComment.findUnique({
      where: { id: commentId },
    });
    if (!comment) throw new NotFoundException('Comment not found');

    const existing = await this.prisma.postCommentDislike.findUnique({
      where: { commentId_userId: { commentId, userId } },
    });

    if (existing) {
      await this.prisma.postCommentDislike.delete({ where: { id: existing.id } });
      await this.prisma.postComment.update({
        where: { id: commentId },
        data: { dislikeCount: { decrement: 1 } },
      });
      return { disliked: false };
    }
    const existingLike = await this.prisma.postCommentLike.findUnique({
      where: { commentId_userId: { commentId, userId } },
    });
    if (existingLike) {
      await this.prisma.postCommentLike.delete({ where: { id: existingLike.id } });
      await this.prisma.postComment.update({
        where: { id: commentId },
        data: { likeCount: { decrement: 1 } },
      });
    }
    await this.prisma.postCommentDislike.create({ data: { commentId, userId } });
    await this.prisma.postComment.update({
      where: { id: commentId },
      data: { dislikeCount: { increment: 1 } },
    });
    return { disliked: true };
  }

  async deleteComment(dto: PostCommentDeleteDto) {
    const { commentId, userId } = dto;
    const comment = await this.prisma.postComment.findUnique({
      where: { id: commentId },
    });
    if (!comment) throw new NotFoundException('Comment not found');
    if (comment.userId !== userId) {
      throw new BadRequestException('You can only delete your own comment');
    }
    await this.prisma.postComment.delete({ where: { id: commentId } });
    await this.prisma.post.update({
      where: { id: comment.postId },
      data: { commentCount: { decrement: 1 } },
    });
    return { message: 'Comment deleted' };
  }

  async getUserPosts(
    userId: string,
    page: number = 1,
    limit: number = 20,
    viewerUserId?: string,
  ) {
    return this.getPosts({
      userId,
      page,
      limit,
      sort: 'latest',
      viewerUserId,
    });
  }
}
