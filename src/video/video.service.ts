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
import { NotificationService } from '../notification/notification.service';
import {
  CreateVideoDto,
  UpdateVideoDto,
  VideoQueryDto,
  VideoLikeDto,
  VideoDislikeDto,
  VideoShareDto,
  VideoCommentDto,
  VideoCommentLikeDto,
  VideoCommentDislikeDto,
  VideoCommentDeleteDto,
  VideoViewDto,
} from './dto/video.dto';
import {
  extractVideoThumbnailFromMulterFile,
  multerFileFromBuffer,
} from '../common/video-thumbnail.util';
import { UK_DEFAULT_RADIUS_KM } from '../common/geo.util';

@Injectable()
export class VideoService {
  private readonly logger = new Logger(VideoService.name);

  constructor(
    private prisma: PrismaService,
    private notificationService: NotificationService,
    private r2Storage: R2StorageService,
    private subscriptionService: SubscriptionService,
  ) {}

  private assertScheduledVideoAccessible(
    video: { userId: string; scheduledPublishAt: Date | null },
    actingUserId?: string,
  ) {
    if (
      video.scheduledPublishAt &&
      video.scheduledPublishAt > new Date() &&
      String(actingUserId || '') !== String(video.userId)
    ) {
      throw new NotFoundException('Video not found');
    }
  }

  /**
   * Upload video with thumbnail
   */
  async uploadVideo(
    videoFile: Express.Multer.File,
    thumbnailFile: Express.Multer.File | null,
    createVideoDto: CreateVideoDto,
  ) {
    const limitCheck = await this.subscriptionService.checkCanUploadVideo(createVideoDto.userId);
    if (!limitCheck.allowed) {
      throw new BadRequestException(limitCheck.message);
    }
    try {
      // Upload video to R2
      const { url: videoUrl, key: videoKey } = await this.r2Storage.uploadFile(
        videoFile,
        'videos',
      );

      let thumbFile = thumbnailFile;
      if (!thumbFile) {
        try {
          const thumbBuffer = await extractVideoThumbnailFromMulterFile(videoFile);
          thumbFile = multerFileFromBuffer(thumbBuffer);
          this.logger.log('Auto-generated video thumbnail from uploaded file');
        } catch (e: any) {
          this.logger.warn(
            `Video thumbnail auto-generation failed: ${e?.message || e}`,
          );
          throw new BadRequestException(
            'Thumbnail is required or could not be generated from the video. Install ffmpeg on the server or upload a cover image.',
          );
        }
      }

      const { url: thumbnailUrl, key: thumbnailKey } =
        await this.r2Storage.uploadFile(thumbFile, 'thumbnails');

      // Create video record in database
      const video = await this.prisma.video.create({
        data: {
          userId: createVideoDto.userId,
          title: createVideoDto.title,
          description: createVideoDto.description,
          videoUrl,
          thumbnailUrl,
          duration: createVideoDto.duration,
          width: createVideoDto.width,
          height: createVideoDto.height,
          fileSize: videoFile.size,
          mimeType: videoFile.mimetype,
          category: createVideoDto.category,
          tags: createVideoDto.tags || [],
          visibility: createVideoDto.visibility || 'public',
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
              phone: true,
            },
          },
        },
      });

      if (createVideoDto.customPlaylistId) {
        const pl = await this.prisma.userPlaylist.findFirst({
          where: {
            id: createVideoDto.customPlaylistId,
            userId: createVideoDto.userId,
          },
        });
        if (pl) {
          await this.prisma.userPlaylistItem.upsert({
            where: {
              playlistId_contentType_contentId: {
                playlistId: pl.id,
                contentType: 'video',
                contentId: video.id,
              },
            },
            create: {
              playlistId: pl.id,
              contentType: 'video',
              contentId: video.id,
            },
            update: {},
          });
        }
      }

      this.logger.log(`Video uploaded successfully: ${video.id}`);
      if ((video.visibility || 'public') === 'public') {
        const creatorName =
          video.user?.nickname || video.user?.name || 'Someone';
        this.notificationService
          .notifySubscribersAndAreaUsers({
            creatorUserId: video.userId,
            message: `${creatorName} uploaded a new video: ${video.title || 'Untitled'}`,
            type: 'video_new',
            contentId: video.id,
          })
          .catch(() => null);
      }
      return video;
    } catch (error: any) {
      this.logger.error(`Error uploading video: ${error.message}`);
      const isR2Error = error?.message?.includes('R2');
      if (isR2Error) {
        throw new ServiceUnavailableException(
          'Storage upload failed. If you are the administrator, check Cloudflare R2 credentials and bucket permissions (Access Denied).',
        );
      }
      throw new BadRequestException(error?.message || 'Failed to upload video');
    }
  }

  /**
   * Haversine distance in km between two points
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
   * Get all videos with pagination and filters
   */
  async getVideos(query: VideoQueryDto) {
    const {
      userId,
      category,
      search,
      page = 1,
      limit = 20,
      sort,
      nearbyLat,
      nearbyLng,
      radiusKm = UK_DEFAULT_RADIUS_KM,
      excludeSponsored = false,
      excludeFeatured = false,
      viewerRole,
    } = query;

    const skip = (page - 1) * limit;

    const where: any = {
      status: 'ready',
      visibility: 'public',
    };

    // When viewer role is "user": show only non-vendor uploads (owner, user, admin, etc.). When "vendor" or other: show all (owner + vendor).
    const viewerRoleNorm = (viewerRole || 'user').toLowerCase();
    if (viewerRoleNorm === 'user') {
      where.user = { role: { not: 'vendor' } };
    }

    if (userId) {
      where.userId = userId;
    }

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

    if (category) {
      where.category = category;
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const now = new Date();
    const activeCampaignWhere = {
      status: 'active' as const,
      startDate: { lte: now },
      endDate: { gte: now },
    };
    const excludedIds: string[] = [];
    if (excludeSponsored) {
      const ids = await this.prisma.sponsoredVideo
        .findMany({
          where: activeCampaignWhere,
          select: { videoId: true },
          distinct: ['videoId'],
        })
        .then((rows) => rows.map((r) => r.videoId));
      excludedIds.push(...ids);
    }
    if (excludeFeatured) {
      const ids = await this.prisma.featuredVideo
        .findMany({
          where: activeCampaignWhere,
          select: { videoId: true },
          distinct: ['videoId'],
        })
        .then((rows) => rows.map((r) => r.videoId));
      excludedIds.push(...ids);
    }
    if (excludedIds.length > 0) {
      where.id = { notIn: [...new Set(excludedIds)] };
    }

    where.AND = where.AND || [];
    (where.AND as any[]).push({
      OR: [
        { scheduledPublishAt: null },
        { scheduledPublishAt: { lte: now } },
      ],
    });

    const orderBy =
      sort === 'trending'
        ? { viewCount: 'desc' as const }
        : { createdAt: 'desc' as const };

    const [videos, total] = await Promise.all([
      this.prisma.video.findMany({
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
              phone: true,
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
      this.prisma.video.count({ where }),
    ]);

    return {
      videos,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get single video by ID
   */
  async getVideoById(id: string, userId?: string, viewerRole?: string) {
    const video = await this.prisma.video.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            nickname: true,
            email: true,
            phone: true,
            address: true,
            latitude: true,
            longitude: true,
            socialLinks: true,
            role: true,
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

    if (!video) {
      throw new NotFoundException('Video not found');
    }

    const now = new Date();
    if (
      video.scheduledPublishAt &&
      video.scheduledPublishAt > now &&
      String(userId || '') !== String(video.userId)
    ) {
      throw new NotFoundException('Video not found');
    }

    // When viewer has role "user", do not allow viewing vendor-uploaded videos
    const viewerRoleNorm = (viewerRole || 'user').toLowerCase();
    if (viewerRoleNorm === 'user') {
      const uploaderRole = (video.user?.role || '').toLowerCase();
      if (uploaderRole === 'vendor') {
        throw new NotFoundException('Video not found');
      }
    }

    // Top-level comment count (excludes replies)
    const topLevelCommentCount = await this.prisma.videoComment.count({
      where: { videoId: id, parentId: null },
    });

    // Check if user has liked or disliked the video
    let isLiked = false;
    let isDisliked = false;
    if (userId) {
      const [like, dislike] = await Promise.all([
        this.prisma.videoLike.findUnique({
          where: {
            videoId_userId: { videoId: id, userId },
          },
        }),
        this.prisma.videoDislike.findUnique({
          where: {
            videoId_userId: { videoId: id, userId },
          },
        }),
      ]);
      isLiked = !!like;
      isDisliked = !!dislike;
    }

    return {
      ...video,
      isLiked,
      isDisliked,
      topLevelCommentCount,
    };
  }

  /**
   * Update video details
   */
  async updateVideo(
    id: string,
    userId: string,
    updateVideoDto: UpdateVideoDto,
  ) {
    // Verify ownership
    const video = await this.prisma.video.findUnique({
      where: { id },
    });

    if (!video) {
      throw new NotFoundException('Video not found');
    }

    if (video.userId !== userId) {
      throw new BadRequestException('You can only update your own videos');
    }

    const updatedVideo = await this.prisma.video.update({
      where: { id },
      data: updateVideoDto,
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

    return updatedVideo;
  }

  /**
   * Delete video
   */
  async deleteVideo(id: string, userId: string) {
    const video = await this.prisma.video.findUnique({
      where: { id },
    });

    if (!video) {
      throw new NotFoundException('Video not found');
    }

    if (video.userId !== userId) {
      throw new BadRequestException('You can only delete your own videos');
    }

    // Delete files from R2
    try {
      const videoKey = video.videoUrl.split('/').slice(-2).join('/');
      const thumbnailKey = video.thumbnailUrl.split('/').slice(-2).join('/');

      await Promise.all([
        this.r2Storage.deleteFile(videoKey),
        this.r2Storage.deleteFile(thumbnailKey),
      ]);
    } catch (error: any) {
      this.logger.error(`Error deleting files from R2: ${error.message}`);
    }

    // Delete video from database
    await this.prisma.video.delete({
      where: { id },
    });

    return { message: 'Video deleted successfully' };
  }

  /**
   * Like/Unlike video
   */
  async toggleLike(videoLikeDto: VideoLikeDto) {
    const { videoId, userId } = videoLikeDto;

    // Check if video exists
    const video = await this.prisma.video.findUnique({
      where: { id: videoId },
    });

    if (!video) {
      throw new NotFoundException('Video not found');
    }
    this.assertScheduledVideoAccessible(video, userId);

    // Check if already liked
    const existingLike = await this.prisma.videoLike.findUnique({
      where: {
        videoId_userId: {
          videoId,
          userId,
        },
      },
    });

    if (existingLike) {
      await this.prisma.videoLike.delete({
        where: { id: existingLike.id },
      });
      await this.prisma.video.update({
        where: { id: videoId },
        data: { likeCount: { decrement: 1 } },
      });
      return { liked: false, message: 'Video unliked' };
    } else {
      // If user had disliked, remove it first (like/dislike mutually exclusive)
      try {
        const existingDislike = await this.prisma.videoDislike.findUnique({
          where: { videoId_userId: { videoId, userId } },
        });
        if (existingDislike) {
          await this.prisma.videoDislike.delete({
            where: { id: existingDislike.id },
          });
          await this.prisma.video.update({
            where: { id: videoId },
            data: { dislikeCount: { decrement: 1 } },
          });
        }
      } catch (e) {
        // VideoDislike table may not exist on older DBs - continue with like
      }
      await this.prisma.videoLike.create({
        data: { videoId, userId },
      });
      await this.prisma.video.update({
        where: { id: videoId },
        data: { likeCount: { increment: 1 } },
      });
      // Notify video owner (don't notify self)
      if (video.userId && video.userId !== userId) {
        try {
          const actor = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { nickname: true, name: true },
          });
          const actorName = actor?.nickname || actor?.name || 'Someone';
          await this.notificationService.createNotification({
            userId: video.userId,
            message: `${actorName} liked your video`,
            type: 'video_like',
            contentId: videoId,
          });
        } catch (e) {
          this.logger.warn('Failed to create like notification', e);
        }
      }
      return { liked: true, message: 'Video liked' };
    }
  }

  /**
   * Dislike/Undislike video
   */
  async toggleDislike(videoDislikeDto: VideoDislikeDto) {
    const { videoId, userId } = videoDislikeDto;

    const video = await this.prisma.video.findUnique({
      where: { id: videoId },
    });

    if (!video) {
      throw new NotFoundException('Video not found');
    }
    this.assertScheduledVideoAccessible(video, userId);

    const existingDislike = await this.prisma.videoDislike.findUnique({
      where: { videoId_userId: { videoId, userId } },
    });

    if (existingDislike) {
      await this.prisma.videoDislike.delete({
        where: { id: existingDislike.id },
      });
      await this.prisma.video.update({
        where: { id: videoId },
        data: { dislikeCount: { decrement: 1 } },
      });
      return { disliked: false, message: 'Video undisliked' };
    } else {
      // If user had liked, remove it first (like/dislike mutually exclusive)
      try {
        const existingLike = await this.prisma.videoLike.findUnique({
          where: { videoId_userId: { videoId, userId } },
        });
        if (existingLike) {
          await this.prisma.videoLike.delete({
            where: { id: existingLike.id },
          });
          await this.prisma.video.update({
            where: { id: videoId },
            data: { likeCount: { decrement: 1 } },
          });
        }
      } catch (e) {
        // Continue with dislike
      }
      await this.prisma.videoDislike.create({
        data: { videoId, userId },
      });
      await this.prisma.video.update({
        where: { id: videoId },
        data: { dislikeCount: { increment: 1 } },
      });
      return { disliked: true, message: 'Video disliked' };
    }
  }

  /**
   * Record video share (increment shareCount)
   */
  async recordShare(videoShareDto: VideoShareDto) {
    const { videoId } = videoShareDto;

    const video = await this.prisma.video.findUnique({
      where: { id: videoId },
    });

    if (!video) {
      throw new NotFoundException('Video not found');
    }
    this.assertScheduledVideoAccessible(video, undefined);

    await this.prisma.video.update({
      where: { id: videoId },
      data: { shareCount: { increment: 1 } },
    });

    return { message: 'Share recorded' };
  }

  /**
   * Add comment to video
   */
  async addComment(videoCommentDto: VideoCommentDto) {
    const { videoId, userId, content, parentId } = videoCommentDto;

    // Check if video exists
    const video = await this.prisma.video.findUnique({
      where: { id: videoId },
    });

    if (!video) {
      throw new NotFoundException('Video not found');
    }
    this.assertScheduledVideoAccessible(video, userId);

    // Create comment
    const comment = await this.prisma.videoComment.create({
      data: {
        videoId,
        userId,
        content,
        parentId,
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

    // Increase comment count
    await this.prisma.video.update({
      where: { id: videoId },
      data: { commentCount: { increment: 1 } },
    });

    // Notify video owner (don't notify self)
    if (video.userId && video.userId !== userId) {
      try {
        const actorName =
          comment.user?.nickname || comment.user?.name || 'Someone';
        await this.notificationService.createNotification({
          userId: video.userId,
          message: `${actorName} commented on your video`,
          type: 'video_comment',
          contentId: videoId,
        });
      } catch (e) {
        this.logger.warn('Failed to create comment notification', e);
      }
    }

    return comment;
  }

  /**
   * Get comments for video
   */
  async getComments(
    videoId: string,
    page: number = 1,
    limit: number = 20,
    userId?: string,
  ) {
    const video = await this.prisma.video.findUnique({
      where: { id: videoId },
      select: { userId: true, scheduledPublishAt: true },
    });
    if (!video) {
      throw new NotFoundException('Video not found');
    }
    this.assertScheduledVideoAccessible(video, userId);

    const skip = (page - 1) * limit;

    const [comments, total] = await Promise.all([
      this.prisma.videoComment.findMany({
        where: {
          videoId,
          parentId: null,
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
      this.prisma.videoComment.count({
        where: {
          videoId,
          parentId: null,
        },
      }),
    ]);

    // Add isLiked, isDisliked for each comment and reply if userId provided
    const enrichComment = async (c: any) => {
      let isLiked = false;
      let isDisliked = false;
      if (userId) {
        try {
          const [like, dislike] = await Promise.all([
            this.prisma.videoCommentLike.findUnique({
              where: { commentId_userId: { commentId: c.id, userId } },
            }),
            this.prisma.videoCommentDislike.findUnique({
              where: { commentId_userId: { commentId: c.id, userId } },
            }),
          ]);
          isLiked = !!like;
          isDisliked = !!dislike;
        } catch {
          // Tables may not exist yet
        }
      }
      return {
        ...c,
        isLiked,
        isDisliked,
        dislikeCount: c.dislikeCount ?? 0,
        replies: await Promise.all((c.replies || []).map(enrichComment)),
      };
    };

    const enrichedComments = await Promise.all(comments.map(enrichComment));

    return {
      comments: enrichedComments,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Like/Unlike comment
   */
  async toggleCommentLike(dto: VideoCommentLikeDto) {
    const { commentId, userId } = dto;

    const comment = await this.prisma.videoComment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    const existingLike = await this.prisma.videoCommentLike.findUnique({
      where: { commentId_userId: { commentId, userId } },
    });

    if (existingLike) {
      await this.prisma.videoCommentLike.delete({
        where: { id: existingLike.id },
      });
      await this.prisma.videoComment.update({
        where: { id: commentId },
        data: { likeCount: { decrement: 1 } },
      });
      return { liked: false };
    } else {
      try {
        const existingDislike = await this.prisma.videoCommentDislike.findUnique({
          where: { commentId_userId: { commentId, userId } },
        });
        if (existingDislike) {
          await this.prisma.videoCommentDislike.delete({
            where: { id: existingDislike.id },
          });
          await this.prisma.videoComment.update({
            where: { id: commentId },
            data: { dislikeCount: { decrement: 1 } },
          });
        }
      } catch {}
      await this.prisma.videoCommentLike.create({
        data: { commentId, userId },
      });
      await this.prisma.videoComment.update({
        where: { id: commentId },
        data: { likeCount: { increment: 1 } },
      });
      return { liked: true };
    }
  }

  /**
   * Dislike/Undislike comment
   */
  async toggleCommentDislike(dto: VideoCommentDislikeDto) {
    const { commentId, userId } = dto;

    const comment = await this.prisma.videoComment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    const existingDislike = await this.prisma.videoCommentDislike.findUnique({
      where: { commentId_userId: { commentId, userId } },
    });

    if (existingDislike) {
      await this.prisma.videoCommentDislike.delete({
        where: { id: existingDislike.id },
      });
      await this.prisma.videoComment.update({
        where: { id: commentId },
        data: { dislikeCount: { decrement: 1 } },
      });
      return { disliked: false };
    } else {
      try {
        const existingLike = await this.prisma.videoCommentLike.findUnique({
          where: { commentId_userId: { commentId, userId } },
        });
        if (existingLike) {
          await this.prisma.videoCommentLike.delete({
            where: { id: existingLike.id },
          });
          await this.prisma.videoComment.update({
            where: { id: commentId },
            data: { likeCount: { decrement: 1 } },
          });
        }
      } catch {}
      await this.prisma.videoCommentDislike.create({
        data: { commentId, userId },
      });
      await this.prisma.videoComment.update({
        where: { id: commentId },
        data: { dislikeCount: { increment: 1 } },
      });
      return { disliked: true };
    }
  }

  /**
   * Delete own comment or reply
   */
  async deleteComment(dto: VideoCommentDeleteDto) {
    const { commentId, userId } = dto;

    const comment = await this.prisma.videoComment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    if (comment.userId !== userId) {
      throw new BadRequestException(
        'You can only delete your own comments',
      );
    }

    const replyCount = await this.prisma.videoComment.count({
      where: { parentId: commentId },
    });

    await this.prisma.$transaction([
      this.prisma.videoComment.deleteMany({
        where: { parentId: commentId },
      }),
      this.prisma.videoComment.delete({
        where: { id: commentId },
      }),
    ]);

    await this.prisma.video.update({
      where: { id: comment.videoId },
      data: {
        commentCount: { decrement: 1 + replyCount },
      },
    });

    return {
      message: 'Comment deleted',
      wasTopLevel: !comment.parentId,
    };
  }

  /**
   * Record video view
   */
  async recordView(videoViewDto: VideoViewDto) {
    const { videoId, userId, watchTime, completed } = videoViewDto;

    // Check if video exists
    const video = await this.prisma.video.findUnique({
      where: { id: videoId },
    });

    if (!video) {
      throw new NotFoundException('Video not found');
    }

    const nowView = new Date();
    if (
      video.scheduledPublishAt &&
      video.scheduledPublishAt > nowView &&
      String(userId || '') !== String(video.userId)
    ) {
      throw new NotFoundException('Video not found');
    }

    // Create view record (userId optional for anonymous views)
    await this.prisma.videoView.create({
      data: {
        videoId,
        userId: userId || null,
        watchTime: Number(watchTime) || 0,
        completed: Boolean(completed),
      },
    });

    // Increase view count
    await this.prisma.video.update({
      where: { id: videoId },
      data: { viewCount: { increment: 1 } },
    });

    return { message: 'View recorded' };
  }

  /**
   * Get user's watch history (videos they've viewed)
   */
  async getUserVideoHistory(userId: string, page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    const views = await this.prisma.videoView.findMany({
      where: { userId },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        video: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                nickname: true,
                email: true,
                phone: true,
              },
            },
            _count: { select: { likes: true, comments: true, views: true } },
          },
        },
      },
    });
    const total = await this.prisma.videoView.count({ where: { userId } });
    const history = views
      .filter(
        (v) =>
          v.video &&
          v.video.status !== 'deleted' &&
          v.video.visibility === 'public' &&
          (!v.video.scheduledPublishAt || v.video.scheduledPublishAt <= new Date()),
      )
      .map((v) => ({ video: v.video, watchedAt: v.createdAt }));
    return {
      history,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  /**
   * Get user's liked videos
   */
  async getUserLikedVideos(userId: string, page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    const likes = await this.prisma.videoLike.findMany({
      where: { userId },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        video: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                nickname: true,
                phone: true,
              },
            },
            _count: { select: { likes: true, comments: true, views: true } },
          },
        },
      },
    });
    const total = await this.prisma.videoLike.count({ where: { userId } });
    const videos = likes
      .filter(
        (l) =>
          l.video &&
          l.video.status !== 'deleted' &&
          l.video.visibility === 'public' &&
          (!l.video.scheduledPublishAt || l.video.scheduledPublishAt <= new Date()),
      )
      .map((l) => l.video);
    return {
      videos,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  /**
   * Get user's uploaded videos
   */
  async getUserVideos(
    userId: string,
    page: number = 1,
    limit: number = 20,
  ) {
    const skip = (page - 1) * limit;
    const now = new Date();
    const scheduledFilter = {
      OR: [
        { scheduledPublishAt: null },
        { scheduledPublishAt: { lte: now } },
      ],
    };

    const [videos, total] = await Promise.all([
      this.prisma.video.findMany({
        where: {
          userId,
          status: {
            not: 'deleted', // Show all videos except deleted ones
          },
          ...scheduledFilter,
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
              email: true,
              phone: true,
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
      this.prisma.video.count({
        where: {
          userId,
          status: {
            not: 'deleted',
          },
          ...scheduledFilter,
        },
      }),
    ]);

    return {
      videos,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
