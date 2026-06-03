import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ServiceUnavailableException,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { PrismaService } from '../prisma/prisma.service';
import { R2StorageService } from '../r2-storage/r2-storage.service';
import { SubscriptionService } from '../subscription/subscription.service';
import { NotificationService } from '../notification/notification.service';
import { ScheduledContentService } from '../scheduled-content/scheduled-content.service';
import {
  CreateShortDto,
  ShortsUploadUrlRequestDto,
  CompleteShortUploadDto,
  UpdateShortDto,
  ShortQueryDto,
  ShortLikeDto,
  ShortCommentDto,
  ShortCommentLikeDto,
  ShortCommentDislikeDto,
  ShortViewDto,
} from './dto/shorts.dto';
import { ShortsTranscodeService } from './shorts-transcode.service';
import {
  extractVideoThumbnailFromPath,
} from '../common/video-thumbnail.util';
import { UK_DEFAULT_RADIUS_KM } from '../common/geo.util';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class ShortsService {
  private readonly logger = new Logger(ShortsService.name);

  constructor(
    private prisma: PrismaService,
    private r2Storage: R2StorageService,
    private subscriptionService: SubscriptionService,
    private notificationService: NotificationService,
    private shortsTranscode: ShortsTranscodeService,
    private readonly scheduledContentService: ScheduledContentService,
  ) {}

  private async uploadShortThumbnailFromVideoPath(
    videoPath: string,
  ): Promise<string | null> {
    try {
      const buf = await extractVideoThumbnailFromPath(videoPath);
      const { url } = await this.r2Storage.uploadBuffer(
        buf,
        `${uuidv4()}.jpg`,
        'image/jpeg',
        'shorts/thumbnails',
      );
      this.logger.log('Auto-generated short thumbnail from video');
      return url;
    } catch (e: any) {
      this.logger.warn(
        `Short thumbnail auto-generation failed: ${e?.message || e}`,
      );
      return null;
    }
  }

  private static readonly AUTO_POST_PLATFORMS = [
    'facebook',
    'instagram',
    'tiktok',
    'youtube',
  ] as const;

  private async syncSocialScheduleForNewShort(params: {
    userId: string;
    shortId: string;
    title: string;
    description?: string | null;
    publishedAt: Date;
    thumbnailUrl?: string | null;
    videoUrl?: string | null;
    platforms: string[];
    facebookPageId?: string | null;
    instagramAccountId?: string | null;
    tiktokAccountId?: string | null;
    youtubeChannelId?: string | null;
  }): Promise<void> {
    const requested = params.platforms
      .map((p) => String(p).toLowerCase())
      .filter(Boolean);
    const socialTargets = requested.filter((p) =>
      (ShortsService.AUTO_POST_PLATFORMS as readonly string[]).includes(p),
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
    const hh = String(when.getUTCHours()).padStart(2, '0');
    const mm = String(when.getUTCMinutes()).padStart(2, '0');
    const mediaUrls = [params.thumbnailUrl, params.videoUrl].filter(
      (u): u is string => typeof u === 'string' && /^https?:\/\//i.test(u),
    );
    const metadata: Record<string, unknown> = {
      source: 'short-create',
      contentType: 'short',
      contentBody: (params.description || params.title || '').trim(),
      contentMediaUrls: mediaUrls,
      publishAt: publishAtIso,
      primaryMediaIsVideo: true,
      ...(facebookPageIdForMeta
        ? { facebookPageId: facebookPageIdForMeta }
        : {}),
      ...(params.instagramAccountId?.trim()
        ? { instagramAccountId: params.instagramAccountId.trim() }
        : {}),
      ...(params.tiktokAccountId?.trim()
        ? { tiktokAccountId: params.tiktokAccountId.trim() }
        : {}),
      ...(params.youtubeChannelId?.trim()
        ? { youtubeChannelId: params.youtubeChannelId.trim() }
        : {}),
    };
    try {
      await this.scheduledContentService.create({
        userId: params.userId,
        companyId: params.userId,
        companyName,
        contentId: params.shortId,
        contentTitle: params.title,
        scheduledDate: `${y}-${mo}-${day}`,
        scheduledTime: `${hh}:${mm}`,
        platforms: requested.length ? requested : socialTargets,
        status: 'scheduled',
        metadata,
      });
      this.logger.log(
        `Social schedule row for short ${params.shortId} platforms=${(requested.length ? requested : socialTargets).join(',')} publishAt=${publishAtIso}`,
      );
    } catch (e: any) {
      this.logger.error(
        `Failed scheduled-content for short ${params.shortId}: ${e?.message || e}`,
      );
    }
  }

  async createPresignedUploadUrls(dto: ShortsUploadUrlRequestDto) {
    const limitCheck = await this.subscriptionService.checkCanUploadShort(
      dto.userId,
    );
    if (!limitCheck.allowed) {
      throw new BadRequestException(limitCheck.message);
    }
    const video = await this.r2Storage.createPresignedPutUrl({
      folder: 'shorts/raw',
      originalName: dto.videoName || 'short.mp4',
      mimeType: dto.videoType || 'video/mp4',
      expiresInSec: 1800,
    });
    let thumbnail: { key: string; putUrl: string; publicUrl: string } | null =
      null;
    if (dto.thumbnailName && dto.thumbnailType) {
      thumbnail = await this.r2Storage.createPresignedPutUrl({
        folder: 'shorts/thumbnails/raw',
        originalName: dto.thumbnailName,
        mimeType: dto.thumbnailType,
        expiresInSec: 1800,
      });
    }
    return { video, thumbnail };
  }

  async completePresignedUpload(dto: CompleteShortUploadDto) {
    const limitCheck = await this.subscriptionService.checkCanUploadShort(
      dto.userId,
    );
    if (!limitCheck.allowed) {
      throw new BadRequestException(limitCheck.message);
    }
    const rawKey = String(dto.videoKey || '').trim();
    if (!rawKey) throw new BadRequestException('videoKey is required');

    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const inPath = path.join(os.tmpdir(), `eatix-sh-presign-in-${id}.mp4`);
    let processedPath: string | null = null;
    const cleanupPaths = new Set<string>([inPath]);
    try {
      // Download the raw upload from R2 to disk, then process with FFmpeg if needed.
      await this.r2Storage.downloadToFile(rawKey, inPath);
      const shouldProcess = this.shortsTranscode.shouldProcess(dto);
      if (shouldProcess) {
        try {
          processedPath = await this.shortsTranscode.processFile(inPath, dto);
          if (processedPath && processedPath !== inPath)
            cleanupPaths.add(processedPath);
        } catch (e: any) {
          // Some mobile encoders/container variants fail ffprobe/ffmpeg detection.
          // In that case, keep user flow successful by falling back to raw upload.
          this.logger.warn(
            `completePresignedUpload transcode failed, using raw input: ${e?.message || e}`,
          );
          processedPath = inPath;
        }
      } else {
        processedPath = inPath;
      }

      const uploaded = await this.r2Storage.uploadFileFromPath(
        processedPath,
        'short.mp4',
        dto.videoMimeType || 'video/mp4',
        'shorts',
      );
      const videoUrl = uploaded.url;

      const thumbKey = dto.thumbnailKey ? String(dto.thumbnailKey).trim() : '';
      let thumbnailUrl = thumbKey
        ? this.r2Storage.getPublicUrl(thumbKey)
        : null;
      if (!thumbnailUrl && processedPath) {
        thumbnailUrl = await this.uploadShortThumbnailFromVideoPath(processedPath);
      }

      const normalizedTags = (() => {
        const base = Array.isArray(dto.tags) ? dto.tags : [];
        const fromHashtags = Array.isArray(dto.hashtags) ? dto.hashtags : [];
        const all = [...base, ...fromHashtags]
          .map((t) =>
            String(t || '')
              .replace(/^#/, '')
              .trim(),
          )
          .filter(Boolean);
        return Array.from(new Set(all));
      })();

      const publishAt = dto.scheduledPublishAt
        ? new Date(dto.scheduledPublishAt)
        : new Date();

      const short = await this.prisma.short.create({
        data: {
          userId: dto.userId,
          title: dto.title || 'Untitled Short',
          description: dto.description,
          videoUrl,
          thumbnailUrl,
          coverUrl: thumbnailUrl,
          duration: dto.duration,
          durationLimit: dto.durationLimit || '60',
          fileSize: dto.videoFileSize,
          mimeType: dto.videoMimeType || 'video/mp4',
          filterId: dto.filterId,
          filterName: dto.filterName,
          soundId: dto.soundId,
          soundTitle: dto.soundTitle,
          soundArtist: dto.soundArtist,
          soundUrl: dto.soundUrl,
          beautyLevel: dto.beautyLevel ?? 0,
          timerSeconds: dto.timerSeconds,
          speedFactor: dto.speedFactor ?? 1,
          cameraFacing: dto.cameraFacing,
          commentSetting: dto.commentSetting || 'allow',
          visibility: dto.visibility || 'public',
          isLive: dto.isLive || false,
          liveChannelId: dto.liveChannelId,
          category: dto.category,
          tags: normalizedTags,
          status: 'ready',
          publishedAt: publishAt,
        },
        include: {
          user: {
            select: { id: true, name: true, nickname: true, email: true },
          },
        },
      });

      await this.syncSocialScheduleForNewShort({
        userId: short.userId,
        shortId: short.id,
        title: short.title || 'Short',
        description: short.description ?? undefined,
        publishedAt: publishAt,
        thumbnailUrl: short.thumbnailUrl ?? undefined,
        videoUrl: short.videoUrl ?? undefined,
        platforms: Array.isArray(dto.platforms) ? dto.platforms : [],
        facebookPageId: dto.facebookPageId,
        instagramAccountId: dto.instagramAccountId,
        tiktokAccountId: dto.tiktokAccountId,
        youtubeChannelId: dto.youtubeChannelId,
      });

      // Best-effort cleanup of the raw object; ignore if it fails.
      try {
        await this.r2Storage.deleteFile(rawKey);
      } catch {}

      return short;
    } catch (e: any) {
      this.logger.error(`completePresignedUpload: ${e?.message || e}`);
      throw new BadRequestException(e?.message || 'Failed to complete upload');
    } finally {
      for (const p of cleanupPaths) {
        try {
          await fs.unlink(p);
        } catch {}
      }
    }
  }

  /**
   * Upload short video with thumbnail
   */
  async uploadShort(
    videoFile: Express.Multer.File,
    thumbnailFile: Express.Multer.File | null,
    createShortDto: CreateShortDto,
  ) {
    const limitCheck = await this.subscriptionService.checkCanUploadShort(
      createShortDto.userId,
    );
    if (!limitCheck.allowed) {
      throw new BadRequestException(limitCheck.message);
    }
    const cleanupPaths = new Set<string>();
    try {
      if ((videoFile as any)?.path) cleanupPaths.add((videoFile as any).path);
      if ((thumbnailFile as any)?.path)
        cleanupPaths.add((thumbnailFile as any).path);

      let videoUpload = {
        path: videoFile?.path,
        originalname: videoFile?.originalname,
        mimetype: videoFile?.mimetype,
        size: videoFile?.size,
        buffer: videoFile?.buffer,
      };
      if (this.shortsTranscode.shouldProcess(createShortDto)) {
        try {
          const baseName = (videoFile.originalname || 'short.mp4').replace(
            /\.[^.]+$/,
            '',
          );
          if (videoFile?.path) {
            const processedPath = await this.shortsTranscode.processFile(
              videoFile.path,
              createShortDto,
            );
            if (processedPath && processedPath !== videoFile.path)
              cleanupPaths.add(processedPath);
            videoUpload = {
              path: processedPath,
              originalname: `${baseName}.mp4`,
              mimetype: 'video/mp4',
              size: undefined,
              buffer: undefined,
            };
          } else {
            const processed = await this.shortsTranscode.process(
              videoFile.buffer,
              createShortDto,
            );
            videoUpload = {
              path: undefined,
              originalname: `${baseName}.mp4`,
              mimetype: 'video/mp4',
              size: processed.length,
              buffer: processed,
            };
          }
          this.logger.log(
            `Shorts FFmpeg: processed upload filter=${createShortDto.filterId ?? 'none'} beauty=${createShortDto.beautyLevel ?? 0} speed=${createShortDto.speedFactor ?? 1} sound=${Boolean(createShortDto.soundUrl?.trim())}`,
          );
        } catch (e: any) {
          this.logger.error(
            `Shorts FFmpeg failed (upload aborted, source not stored raw): ${e?.message}`,
            e?.stack,
          );
          if (process.env.SHORTS_UPLOAD_RAW_ON_FFMPEG_FAIL === '1') {
            this.logger.warn(
              'SHORTS_UPLOAD_RAW_ON_FFMPEG_FAIL=1: falling back to unprocessed video',
            );
          } else {
            throw new BadRequestException(
              `Video processing failed (${e?.message || 'ffmpeg error'}). Long or heavy edits need more time and memory—try trimming to a shorter clip, using Wi‑Fi, and retrying.`,
            );
          }
        }
      }

      const { url: videoUrl, key: videoKey } = videoUpload?.path
        ? await this.r2Storage.uploadFileFromPath(
            videoUpload.path,
            videoUpload.originalname || 'short.mp4',
            videoUpload.mimetype || 'video/mp4',
            'shorts',
          )
        : await this.r2Storage.uploadBuffer(
            videoUpload.buffer,
            videoUpload.originalname || 'short.mp4',
            videoUpload.mimetype || 'video/mp4',
            'shorts',
          );

      let thumbnailUrl: string | null = null;
      if (thumbnailFile) {
        const thumb = thumbnailFile?.path
          ? await this.r2Storage.uploadFileFromPath(
              thumbnailFile.path,
              thumbnailFile.originalname || 'thumb.jpg',
              thumbnailFile.mimetype || 'image/jpeg',
              'shorts/thumbnails',
            )
          : await this.r2Storage.uploadFile(thumbnailFile, 'shorts/thumbnails');
        thumbnailUrl = thumb.url;
      } else if (videoUpload?.path) {
        thumbnailUrl = await this.uploadShortThumbnailFromVideoPath(
          videoUpload.path,
        );
      }

      const normalizedTags = (() => {
        const base = Array.isArray(createShortDto.tags)
          ? createShortDto.tags
          : [];
        const fromHashtags = Array.isArray(createShortDto.hashtags)
          ? createShortDto.hashtags
          : [];
        const all = [...base, ...fromHashtags]
          .map((t) =>
            String(t || '')
              .replace(/^#/, '')
              .trim(),
          )
          .filter(Boolean);
        return Array.from(new Set(all));
      })();
      const publishAt = createShortDto.scheduledPublishAt
        ? new Date(createShortDto.scheduledPublishAt)
        : new Date();

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
          tags: normalizedTags,
          status: 'ready',
          publishedAt: publishAt,
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

      await this.syncSocialScheduleForNewShort({
        userId: short.userId,
        shortId: short.id,
        title: short.title,
        description: short.description ?? undefined,
        publishedAt: publishAt,
        thumbnailUrl: short.thumbnailUrl ?? undefined,
        videoUrl: short.videoUrl ?? undefined,
        platforms: Array.isArray(createShortDto.platforms)
          ? createShortDto.platforms
          : [],
        facebookPageId: createShortDto.facebookPageId,
        instagramAccountId: createShortDto.instagramAccountId,
        tiktokAccountId: createShortDto.tiktokAccountId,
        youtubeChannelId: createShortDto.youtubeChannelId,
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
      throw new BadRequestException(error?.message || 'Failed to upload short');
    } finally {
      // Clean up disk-uploaded temp files (multer diskStorage + transcode outputs).
      // Ignore errors to avoid masking the real upload result.
      for (const p of cleanupPaths) {
        try {
          await fs.unlink(p);
        } catch {}
      }
    }
  }

  /**
   * Replace video and/or thumbnail for an existing short (R2 upload).
   */
  async replaceShortMedia(
    id: string,
    userId: string,
    videoFile: Express.Multer.File | null,
    thumbnailFile: Express.Multer.File | null,
  ) {
    const short = await this.prisma.short.findUnique({ where: { id } });
    if (!short) throw new NotFoundException('Short not found');
    if (short.userId !== userId) {
      throw new BadRequestException('You can only update your own shorts');
    }
    if (short.isLive) {
      throw new BadRequestException('Cannot replace media for a live short');
    }
    if (!videoFile && !thumbnailFile) {
      throw new BadRequestException('At least one file is required');
    }

    const keyFromUrl = (url: string | null | undefined): string | null => {
      const s = url != null ? String(url).trim() : '';
      if (!s) return null;
      const parts = s.split('/').filter(Boolean);
      if (parts.length < 2) return null;
      return parts.slice(-2).join('/');
    };

    const tryDeleteR2 = async (url: string | null | undefined) => {
      const key = keyFromUrl(url);
      if (!key) return;
      try {
        await this.r2Storage.deleteFile(key);
      } catch (e: any) {
        this.logger.warn(
          `replaceShortMedia: could not delete old object (${key}): ${e?.message}`,
        );
      }
    };

    const data: Prisma.ShortUpdateInput = {};
    const cleanupPaths = new Set<string>();
    if ((videoFile as any)?.path) cleanupPaths.add((videoFile as any).path);
    if ((thumbnailFile as any)?.path) cleanupPaths.add((thumbnailFile as any).path);

    try {
      if (videoFile) {
        await tryDeleteR2(short.videoUrl);
        const { url: videoUrl } = (videoFile as any)?.path
          ? await this.r2Storage.uploadFileFromPath(
              (videoFile as any).path,
              videoFile.originalname || 'short.mp4',
              videoFile.mimetype || 'video/mp4',
              'shorts',
            )
          : await this.r2Storage.uploadFile(videoFile, 'shorts');
        data.videoUrl = videoUrl;
        data.fileSize = videoFile.size;
        data.mimeType = videoFile.mimetype;
      }

      if (thumbnailFile) {
        await tryDeleteR2(short.thumbnailUrl);
        await tryDeleteR2(short.coverUrl);
        const { url: thumbUrl } = (thumbnailFile as any)?.path
          ? await this.r2Storage.uploadFileFromPath(
              (thumbnailFile as any).path,
              thumbnailFile.originalname || 'thumb.jpg',
              thumbnailFile.mimetype || 'image/jpeg',
              'shorts/thumbnails',
            )
          : await this.r2Storage.uploadFile(thumbnailFile, 'shorts/thumbnails');
        data.thumbnailUrl = thumbUrl;
        data.coverUrl = thumbUrl;
      }

      return this.prisma.short.update({
        where: { id },
        data,
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
    } catch (error: any) {
      this.logger.error(`replaceShortMedia: ${error?.message}`);
      const isR2Error = error?.message?.includes('R2');
      if (isR2Error) {
        throw new ServiceUnavailableException(
          'Storage upload failed. Check R2 credentials.',
        );
      }
      throw new BadRequestException(
        error?.message || 'Failed to replace short media',
      );
    } finally {
      for (const p of cleanupPaths) {
        try {
          await fs.unlink(p);
        } catch {}
      }
    }
  }

  /**
   * Create live short (Agora channel)
   */
  async createLiveShort(userId: string, channelName: string) {
    const limitCheck =
      await this.subscriptionService.checkCanUploadShort(userId);
    if (!limitCheck.allowed) {
      throw new BadRequestException(limitCheck.message);
    }
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
      viewerUserId,
      category,
      search,
      isLive,
      page = 1,
      limit = 20,
      sort,
      nearbyLat,
      nearbyLng,
      radiusKm = UK_DEFAULT_RADIUS_KM,
      viewerRole,
    } = query;
    const skip = (page - 1) * limit;

    const where: any = {
      status: 'ready',
      visibility: 'public',
      OR: [{ publishedAt: null }, { publishedAt: { lte: new Date() } }],
    };

    // When viewer role is "user": show only non-vendor uploads (owner, user, admin). When "vendor" or other: show all.
    const viewerRoleNorm = (viewerRole || 'user').toLowerCase();
    if (viewerRoleNorm === 'user') {
      where.user = { role: { not: 'vendor' } };
    }

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
              role: true,
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
      this.prisma.short.count({ where }),
    ]);

    let resultShorts: any[] = shorts as any[];
    if (viewerUserId && shorts.length > 0) {
      const shortIds = shorts.map((s) => s.id);
      const ownerIds = Array.from(
        new Set(shorts.map((s) => s.userId).filter(Boolean)),
      );
      const [likedRows, subRows] = await Promise.all([
        this.prisma.shortLike.findMany({
          where: { userId: viewerUserId, shortId: { in: shortIds } },
          select: { shortId: true },
        }),
        ownerIds.length
          ? this.prisma.channelSubscription.findMany({
              where: {
                subscriberId: viewerUserId,
                channelUserId: { in: ownerIds },
              },
              select: { channelUserId: true },
            })
          : Promise.resolve([]),
      ]);
      const likedSet = new Set(likedRows.map((r) => r.shortId));
      const subscribedSet = new Set(subRows.map((r) => r.channelUserId));
      resultShorts = shorts.map((s: any) => ({
        ...s,
        isLiked: likedSet.has(s.id),
        user: s.user
          ? { ...s.user, isSubscribed: subscribedSet.has(s.userId) }
          : s.user,
      }));
    }

    return {
      shorts: resultShorts,
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
  async getShortById(id: string, userId?: string, viewerRole?: string) {
    const short = await this.prisma.short.findUnique({
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

    if (!short) throw new NotFoundException('Short not found');
    if (
      short.visibility === 'public' &&
      short.visibility === 'public' &&
      short.publishedAt &&
      new Date(short.publishedAt).getTime() > Date.now()
    ) {
      throw new NotFoundException('Short not found');
    }

    // When viewer has role "user", do not allow viewing vendor-uploaded shorts
    const viewerRoleNorm = (viewerRole || 'user').toLowerCase();
    if (viewerRoleNorm === 'user') {
      const uploaderRole = (short.user?.role || '').toLowerCase();
      if (uploaderRole === 'vendor') {
        throw new NotFoundException('Short not found');
      }
    }

    let isLiked = false;
    if (userId) {
      const like = await this.prisma.shortLike.findUnique({
        where: {
          shortId_userId: { shortId: id, userId },
        },
      });
      isLiked = !!like;
    }

    // Fetch scheduled content for this short if it exists
    let scheduledContent = null;
    try {
      this.logger.log(
        `[DEBUG getShortById] Fetching scheduled content for short ${id}, userId: ${userId}`,
      );

      // Try finding by contentId directly
      const byContentId = await this.prisma.scheduledContent.findMany({
        where: { contentId: id },
      });
      this.logger.log(
        `[DEBUG getShortById] Found by contentId: ${byContentId.length} records`,
      );
      if (byContentId.length > 0) {
        scheduledContent = byContentId[0];
        this.logger.log(
          `[DEBUG getShortById] Using record with platforms: ${JSON.stringify(scheduledContent.platforms)}`,
        );
      }

      // If not found by contentId, try by userId
      if (!scheduledContent && userId) {
        this.logger.log(`[DEBUG getShortById] Falling back to userId search`);
        const scheduledRecords =
          await this.scheduledContentService.findByUserId(userId);
        this.logger.log(
          `[DEBUG getShortById] Found ${Array.isArray(scheduledRecords) ? scheduledRecords.length : 0} records by userId`,
        );

        if (Array.isArray(scheduledRecords) && scheduledRecords.length > 0) {
          this.logger.log(
            `[DEBUG getShortById] All scheduled content:`,
            scheduledRecords.map((sc: any) => ({
              id: sc.id,
              contentId: sc.contentId,
              platforms: sc.platforms,
              scheduledDate: sc.scheduledDate,
              scheduledTime: sc.scheduledTime,
            })),
          );
          scheduledContent = scheduledRecords.find(
            (sc: any) => sc.contentId === id,
          );
        }
      }

      this.logger.log(
        `[DEBUG getShortById] Final scheduledContent: ${scheduledContent ? 'FOUND' : 'NOT FOUND'}`,
      );
    } catch (err) {
      this.logger.error(
        `[DEBUG getShortById] Error: ${err?.message}`,
        err?.stack,
      );
    }

    // Build response with schedule data if available
    const response: any = { ...short, isLiked };

    if (scheduledContent) {
      this.logger.log(`[DEBUG getShortById] Attaching schedule data`);
      response.platforms = scheduledContent.platforms || [];
      response.selectedPlatforms = scheduledContent.platforms || [];

      // Build scheduledPublishAt from scheduledDate and scheduledTime
      if (scheduledContent.scheduledDate && scheduledContent.scheduledTime) {
        const dateStr =
          scheduledContent.scheduledDate instanceof Date
            ? scheduledContent.scheduledDate.toISOString().split('T')[0]
            : String(scheduledContent.scheduledDate).split('T')[0];
        const timeStr = String(scheduledContent.scheduledTime || '00:00');
        const dateTimeStr = `${dateStr}T${timeStr}:00Z`;
        response.scheduledPublishAt = new Date(dateTimeStr).toISOString();
        response.scheduleAt = response.scheduledPublishAt;
        this.logger.log(
          `[DEBUG getShortById] scheduledPublishAt: ${response.scheduledPublishAt}`,
        );
        this.logger.log(
          `[DEBUG getShortById] platforms: ${JSON.stringify(response.platforms)}`,
        );
      }

      // Extract account IDs from metadata
      if (scheduledContent.metadata) {
        if (scheduledContent.metadata.facebookPageId) {
          response.facebookPageId = scheduledContent.metadata.facebookPageId;
        }
        if (scheduledContent.metadata.instagramAccountId) {
          response.instagramAccountId =
            scheduledContent.metadata.instagramAccountId;
        }
        if (scheduledContent.metadata.tiktokAccountId) {
          response.tiktokAccountId = scheduledContent.metadata.tiktokAccountId;
        }
        if (scheduledContent.metadata.youtubeChannelId) {
          response.youtubeChannelId =
            scheduledContent.metadata.youtubeChannelId;
        }
      }
    } else {
      this.logger.warn(
        `[DEBUG getShortById] NO scheduled content found for short ${id}`,
      );
    }

    return response;
  }

  /**
   * Update short
   */
  async updateShort(
    id: string,
    userId: string,
    updateShortDto: UpdateShortDto,
  ) {
    const short = await this.prisma.short.findUnique({ where: { id } });
    if (!short) throw new NotFoundException('Short not found');
    if (short.userId !== userId) {
      throw new BadRequestException('You can only update your own shorts');
    }

    const {
      userId: _bodyUserId,
      mediaUrl,
      scheduledPublishAt,
      publishImmediately,
      madeForKids: _madeForKids,
      ageRestricted: _ageRestricted,
      ...rest
    } = updateShortDto as UpdateShortDto & {
      mediaUrl?: string;
      scheduledPublishAt?: string;
    };

    const data: Prisma.ShortUpdateInput = { ...rest };
    delete (data as { userId?: string }).userId;

    const mediaTrim = mediaUrl != null ? String(mediaUrl).trim() : '';
    if (mediaTrim && data.videoUrl == null) {
      data.videoUrl = mediaTrim;
    }
    if (publishImmediately === true) {
      data.publishedAt = new Date();
    } else if (scheduledPublishAt) {
      data.publishedAt = new Date(scheduledPublishAt);
    }

    delete (data as { mediaUrl?: string }).mediaUrl;
    delete (data as { scheduledPublishAt?: string }).scheduledPublishAt;
    delete (data as { publishImmediately?: boolean }).publishImmediately;

    return this.prisma.short.update({
      where: { id },
      data,
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
      // Like/dislike mutually exclusive: clear dislike before liking
      try {
        const existingDislike = await this.prisma.shortDislike.findUnique({
          where: { shortId_userId: { shortId, userId } },
        });
        if (existingDislike) {
          await this.prisma.shortDislike.delete({
            where: { id: existingDislike.id },
          });
          await this.prisma.short.update({
            where: { id: shortId },
            data: { dislikeCount: { decrement: 1 } },
          });
        }
      } catch (e) {
        this.logger.warn('Short toggleLike: clear dislike', e);
      }
      await this.prisma.shortLike.create({
        data: { shortId, userId },
      });
      await this.prisma.short.update({
        where: { id: shortId },
        data: { likeCount: { increment: 1 } },
      });
      // Notify short owner (don't notify self)
      if (short.userId && short.userId !== userId) {
        try {
          const actor = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { nickname: true, name: true },
          });
          const actorName = actor?.nickname || actor?.name || 'Someone';
          await this.notificationService.createNotification({
            userId: short.userId,
            message: `${actorName} liked your short`,
            type: 'short_like',
            contentId: shortId,
          });
        } catch (e) {
          this.logger.warn('Failed to create short like notification', e);
        }
      }
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
      // Like/dislike mutually exclusive: clear like before disliking
      try {
        const existingLike = await this.prisma.shortLike.findUnique({
          where: { shortId_userId: { shortId, userId } },
        });
        if (existingLike) {
          await this.prisma.shortLike.delete({
            where: { id: existingLike.id },
          });
          await this.prisma.short.update({
            where: { id: shortId },
            data: { likeCount: { decrement: 1 } },
          });
        }
      } catch (e) {
        this.logger.warn('Short toggleDislike: clear like', e);
      }
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

    // Notify short owner (don't notify self)
    if (short.userId && short.userId !== userId) {
      try {
        const actorName =
          comment.user?.nickname || comment.user?.name || 'Someone';
        await this.notificationService.createNotification({
          userId: short.userId,
          message: `${actorName} commented on your short`,
          type: 'short_comment',
          contentId: shortId,
        });
      } catch (e) {
        this.logger.warn('Failed to create short comment notification', e);
      }
    }

    return comment;
  }

  /**
   * Get comments
   */
  async getComments(shortId: string, page = 1, limit = 20, userId?: string) {
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
    if (!comment) throw new NotFoundException('Comment not found');

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
    if (!comment) throw new NotFoundException('Comment not found');

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
              select: { id: true, name: true, nickname: true, role: true },
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
              select: { id: true, name: true, nickname: true, role: true },
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
  async getUserShorts(
    userId: string,
    page = 1,
    limit = 20,
    viewerUserId?: string,
  ) {
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
      }),
      this.prisma.short.count({
        where: {
          userId,
          status: { not: 'deleted' },
        },
      }),
    ]);

    let resultShorts: any[] = shorts as any[];
    if (viewerUserId && shorts.length > 0) {
      const shortIds = shorts.map((s) => s.id);
      const [likedRows, sub] = await Promise.all([
        this.prisma.shortLike.findMany({
          where: { userId: viewerUserId, shortId: { in: shortIds } },
          select: { shortId: true },
        }),
        this.prisma.channelSubscription.findUnique({
          where: {
            subscriberId_channelUserId: {
              subscriberId: viewerUserId,
              channelUserId: userId,
            },
          },
          select: { channelUserId: true },
        }),
      ]);
      const likedSet = new Set(likedRows.map((r) => r.shortId));
      const isSubscribedToOwner = !!sub;
      resultShorts = shorts.map((s: any) => ({
        ...s,
        isLiked: likedSet.has(s.id),
        user: s.user
          ? { ...s.user, isSubscribed: isSubscribedToOwner }
          : s.user,
      }));
    }

    return {
      shorts: resultShorts,
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
