import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ServiceUnavailableException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { R2StorageService } from '../r2-storage/r2-storage.service';
import { CreatePromotionDto } from './dto/create-promotion.dto';
import {
  parseDiscountTiers,
  type DiscountTier,
} from './promotion-discount.util';

@Injectable()
export class PromotionService {
  private readonly logger = new Logger(PromotionService.name);

  constructor(
    private prisma: PrismaService,
    private r2Storage: R2StorageService,
  ) {}

  /**
   * Get promotions by owner userId (public for profile view).
   */
  async getByUserId(
    userId: string,
    page = 1,
    limit = 50,
    offerType?: string,
  ) {
    if (!userId) {
      return {
        promotions: [],
        pagination: { total: 0, page: 1, limit, totalPages: 0 },
      };
    }
    const skip = (page - 1) * limit;
    const where: { userId: string; offerType?: string } = { userId };
    if (
      offerType &&
      ['order', 'amount_discount', 'booking_discount'].includes(offerType)
    ) {
      where.offerType = offerType;
    }
    const [promotions, total] = await Promise.all([
      this.prisma.promotion.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { id: true, name: true, nickname: true },
          },
        },
      }),
      this.prisma.promotion.count({ where }),
    ]);
    return {
      promotions,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Haversine distance in km.
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

  private validateTierPromotion(
    offerType: string,
    tiers: DiscountTier[],
    fulfillmentScopes?: string[],
    tierMetricType?: string,
  ) {
    if (offerType === 'amount_discount' || offerType === 'booking_discount') {
      if (!tiers.length) {
        throw new BadRequestException('At least one discount tier is required.');
      }
      for (const tier of tiers) {
        if (tier.maxValue != null && tier.maxValue < tier.minValue) {
          throw new BadRequestException(
            'Each tier max value must be greater than or equal to min value.',
          );
        }
      }
    }
    if (offerType === 'amount_discount') {
      if (!fulfillmentScopes?.length) {
        throw new BadRequestException(
          'Select at least one fulfillment scope: collection, delivery, or both.',
        );
      }
    }
    if (offerType === 'booking_discount') {
      if (!tierMetricType || !['people', 'amount'].includes(tierMetricType)) {
        throw new BadRequestException(
          'Booking discount requires tierMetricType: people or amount.',
        );
      }
    }
  }

  private buildPromotionData(dto: CreatePromotionDto) {
    const offerType = dto.offerType || 'order';
    const tiers = parseDiscountTiers(dto.discountTiers);
    this.validateTierPromotion(
      offerType,
      tiers,
      dto.fulfillmentScopes,
      dto.tierMetricType,
    );
    const startDate = new Date(dto.startDate);
    const expireDate = new Date(dto.expireDate);
    if (expireDate <= startDate) {
      throw new BadRequestException('Expire date must be after start date.');
    }
    if (offerType === 'order') {
      if (dto.promoAmount == null || !dto.promoCode?.trim()) {
        throw new BadRequestException(
          'Order promotions require promoAmount and promoCode.',
        );
      }
    }
    return {
      userId: dto.userId,
      title: dto.title,
      description: dto.description ?? undefined,
      thumbnailUrl: dto.thumbnailUrl ?? undefined,
      videoUrl: dto.videoUrl ?? undefined,
      mediaType: (dto.mediaType as 'image' | 'video') || 'image',
      duration: dto.duration ?? undefined,
      promoAmount: offerType === 'order' ? Number(dto.promoAmount) : 0,
      promoCode: offerType === 'order' ? dto.promoCode!.trim() : '',
      offerType,
      fulfillmentScopes: Array.isArray(dto.fulfillmentScopes)
        ? dto.fulfillmentScopes
        : [],
      discountTiers: tiers.length ? tiers : undefined,
      tierMetricType:
        offerType === 'booking_discount' ? dto.tierMetricType : undefined,
      startDate,
      expireDate,
      menuItemIds: Array.isArray(dto.menuItemIds) ? dto.menuItemIds : [],
    };
  }

  /**
   * Get promotions from owners or vendors near the given location (active only).
   * creatorRole: 'owner' = show promotions created by owners nearby; 'vendor' = show promotions created by vendors nearby.
   */
  async getNearby(
    latitude: number,
    longitude: number,
    radiusKm = 50,
    page = 1,
    limit = 50,
    creatorRole: 'owner' | 'vendor' = 'owner',
  ) {
    if (
      latitude == null ||
      longitude == null ||
      Number.isNaN(latitude) ||
      Number.isNaN(longitude)
    ) {
      return {
        promotions: [],
        pagination: { total: 0, page: 1, limit, totalPages: 0 },
      };
    }
    const creatorsWithLocation = await this.prisma.user.findMany({
      where: {
        role: creatorRole,
        latitude: { not: null },
        longitude: { not: null },
      },
      select: {
        id: true,
        latitude: true,
        longitude: true,
        deliveryAreaKm: true,
      },
    });
    const nearbyIds = creatorsWithLocation
      .filter((u) => {
        if (u.latitude == null || u.longitude == null) return false;
        const distanceKm = this.haversineKm(
          latitude,
          longitude,
          u.latitude,
          u.longitude,
        );
        const ownerMaxKm =
          u.deliveryAreaKm != null && Number(u.deliveryAreaKm) > 0
            ? Number(u.deliveryAreaKm)
            : null;
        const effectiveRadiusKm =
          ownerMaxKm != null ? Math.min(radiusKm, ownerMaxKm) : radiusKm;
        return distanceKm <= effectiveRadiusKm;
      })
      .map((u) => u.id);
    if (nearbyIds.length === 0) {
      return {
        promotions: [],
        pagination: { total: 0, page, limit, totalPages: 0 },
      };
    }
    const now = new Date();
    const skip = (page - 1) * limit;
    const [promotions, total] = await Promise.all([
      this.prisma.promotion.findMany({
        where: {
          userId: { in: nearbyIds },
          startDate: { lte: now },
          expireDate: { gte: now },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { id: true, name: true, nickname: true, address: true },
          },
        },
      }),
      this.prisma.promotion.count({
        where: {
          userId: { in: nearbyIds },
          startDate: { lte: now },
          expireDate: { gte: now },
        },
      }),
    ]);
    return {
      promotions,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Create promotion (owner or vendor only).
   */
  async create(dto: CreatePromotionDto, requestUserId: string) {
    if (dto.userId !== requestUserId) {
      throw new ForbiddenException(
        'You can only create promotions for yourself.',
      );
    }
    const user = await this.prisma.user.findUnique({
      where: { id: dto.userId },
      select: { id: true, role: true },
    });
    if (!user) {
      throw new NotFoundException('User not found.');
    }
    const role = (user.role || '').toLowerCase();
    if (role !== 'owner' && role !== 'vendor') {
      throw new ForbiddenException(
        'Only users with role "owner" or "vendor" can create promotions.',
      );
    }
    const startDate = new Date(dto.startDate);
    const expireDate = new Date(dto.expireDate);
    if (expireDate <= startDate) {
      throw new BadRequestException('Expire date must be after start date.');
    }
    const promotion = await this.prisma.promotion.create({
      data: this.buildPromotionData(dto),
      include: {
        user: {
          select: { id: true, name: true, nickname: true },
        },
      },
    });
    this.logger.log(`Promotion created: ${promotion.id}`);
    return promotion;
  }

  /**
   * Upload promotion: thumbnail (required) + optional video. Same pattern as post upload.
   * Body: userId, title, promoAmount, promoCode, startDate, expireDate, menuItemIds (JSON array or comma-separated), duration (for video).
   */
  async upload(
    files: Express.Multer.File[],
    body: {
      userId: string;
      title: string;
      description?: string;
      promoAmount: number;
      promoCode: string;
      startDate: string;
      expireDate: string;
      menuItemIds?: string[] | string;
      duration?: number;
      offerType?: string;
      fulfillmentScopes?: string[] | string;
      discountTiers?: string | unknown;
      tierMetricType?: string;
    },
    requestUserId: string,
  ) {
    if (body.userId !== requestUserId) {
      throw new ForbiddenException(
        'You can only create promotions for yourself.',
      );
    }
    const user = await this.prisma.user.findUnique({
      where: { id: body.userId },
      select: { id: true, role: true },
    });
    const role = (user?.role || '').toLowerCase();
    if (!user || (role !== 'owner' && role !== 'vendor')) {
      throw new ForbiddenException(
        'Only users with role "owner" or "vendor" can create promotions.',
      );
    }
    if (!files || files.length < 1) {
      throw new BadRequestException('At least one file is required.');
    }
    const imageFile = files.find((f) => f.mimetype.startsWith('image/'));
    const videoFile = files.find((f) => f.mimetype.startsWith('video/'));
    if (!imageFile && !videoFile) {
      throw new BadRequestException(
        'Invalid files. Please upload an image or a video.',
      );
    }
    if (
      !body.title?.trim() ||
      !body.startDate ||
      !body.expireDate
    ) {
      throw new BadRequestException(
        'title, startDate and expireDate are required.',
      );
    }
    const offerType = body.offerType || 'order';
    if (offerType === 'order') {
      if (body.promoAmount == null || !body.promoCode?.trim()) {
        throw new BadRequestException(
          'Order promotions require promoAmount and promoCode.',
        );
      }
    }
    const startDate = new Date(body.startDate);
    const expireDate = new Date(body.expireDate);
    if (expireDate <= startDate) {
      throw new BadRequestException('Expire date must be after start date.');
    }
    let menuItemIds: string[] = [];
    if (Array.isArray(body.menuItemIds)) {
      menuItemIds = body.menuItemIds.map(String).filter(Boolean);
    } else if (
      typeof body.menuItemIds === 'string' &&
      body.menuItemIds.trim()
    ) {
      try {
        const parsed = JSON.parse(body.menuItemIds);
        menuItemIds = Array.isArray(parsed)
          ? parsed.map(String)
          : body.menuItemIds
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean);
      } catch {
        menuItemIds = body.menuItemIds
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
      }
    }
    let discountTiersRaw: unknown = body.discountTiers;
    if (typeof discountTiersRaw === 'string' && discountTiersRaw.trim()) {
      try {
        discountTiersRaw = JSON.parse(discountTiersRaw);
      } catch {
        discountTiersRaw = [];
      }
    }
    let fulfillmentScopes: string[] = [];
    if (Array.isArray(body.fulfillmentScopes)) {
      fulfillmentScopes = body.fulfillmentScopes.map(String);
    } else if (
      typeof body.fulfillmentScopes === 'string' &&
      body.fulfillmentScopes.trim()
    ) {
      try {
        const parsed = JSON.parse(body.fulfillmentScopes);
        fulfillmentScopes = Array.isArray(parsed)
          ? parsed.map(String)
          : body.fulfillmentScopes.split(',').map((s) => s.trim());
      } catch {
        fulfillmentScopes = body.fulfillmentScopes
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
      }
    }
    const tiers = parseDiscountTiers(discountTiersRaw);
    this.validateTierPromotion(
      offerType,
      tiers,
      fulfillmentScopes,
      body.tierMetricType,
    );
    const duration =
      typeof body.duration === 'number'
        ? body.duration
        : body.duration != null
          ? parseInt(String(body.duration), 10)
          : undefined;
    try {
      let thumbnailUrl: string | undefined;
      let videoUrl: string | undefined;
      let mediaType: 'image' | 'video' = 'image';
      let durationSec: number | undefined = undefined;

      if (imageFile) {
        const res = await this.r2Storage.uploadFile(imageFile, 'promotions');
        thumbnailUrl = res.url;
      }

      if (videoFile) {
        const res = await this.r2Storage.uploadFile(videoFile, 'promotions');
        videoUrl = res.url;
        mediaType = 'video';
        durationSec = duration ?? 0;
      }

      const promotion = await this.prisma.promotion.create({
        data: {
          userId: body.userId,
          title: body.title.trim(),
          description: body.description?.trim() ?? undefined,
          thumbnailUrl: thumbnailUrl ?? undefined,
          videoUrl,
          mediaType,
          duration: mediaType === 'video' ? durationSec : undefined,
          promoAmount:
            offerType === 'order' ? Number(body.promoAmount) : 0,
          promoCode: offerType === 'order' ? body.promoCode.trim() : '',
          offerType,
          fulfillmentScopes,
          discountTiers: tiers.length ? tiers : undefined,
          tierMetricType:
            offerType === 'booking_discount' ? body.tierMetricType : undefined,
          startDate,
          expireDate,
          menuItemIds,
        },
        include: {
          user: {
            select: { id: true, name: true, nickname: true },
          },
        },
      });
      this.logger.log(`Promotion uploaded: ${promotion.id}`);
      return promotion;
    } catch (error: any) {
      this.logger.error(`Error uploading promotion: ${error?.message}`);
      if (error?.message?.includes('R2')) {
        throw new ServiceUnavailableException(
          'Storage upload failed. Check R2 credentials and bucket permissions.',
        );
      }
      throw new BadRequestException(
        error?.message || 'Failed to upload promotion',
      );
    }
  }

  async update(
    promotionId: string,
    userId: string,
    updateData: Partial<CreatePromotionDto>,
    requestUserId: string,
  ) {
    if (userId !== requestUserId) {
      throw new ForbiddenException('You can only update your own promotions.');
    }
    const existing = await this.prisma.promotion.findUnique({
      where: { id: promotionId },
    });
    if (!existing) throw new NotFoundException('Promotion not found.');
    if (existing.userId !== userId) {
      throw new ForbiddenException('You can only update your own promotions.');
    }
    const merged: CreatePromotionDto = {
      userId,
      title: updateData.title ?? existing.title,
      description: updateData.description ?? existing.description ?? undefined,
      thumbnailUrl: updateData.thumbnailUrl ?? existing.thumbnailUrl ?? undefined,
      videoUrl: updateData.videoUrl ?? existing.videoUrl ?? undefined,
      mediaType: updateData.mediaType ?? existing.mediaType,
      duration: updateData.duration ?? existing.duration ?? undefined,
      promoAmount: updateData.promoAmount ?? existing.promoAmount,
      promoCode: updateData.promoCode ?? existing.promoCode,
      offerType: updateData.offerType ?? existing.offerType,
      fulfillmentScopes:
        updateData.fulfillmentScopes ?? existing.fulfillmentScopes,
      discountTiers: updateData.discountTiers ?? existing.discountTiers,
      tierMetricType: updateData.tierMetricType ?? existing.tierMetricType ?? undefined,
      startDate: updateData.startDate ?? existing.startDate.toISOString(),
      expireDate: updateData.expireDate ?? existing.expireDate.toISOString(),
      menuItemIds: updateData.menuItemIds ?? existing.menuItemIds,
    };
    const data = this.buildPromotionData(merged);
    return this.prisma.promotion.update({
      where: { id: promotionId },
      data,
      include: {
        user: { select: { id: true, name: true, nickname: true } },
      },
    });
  }

  async delete(promotionId: string, userId: string, requestUserId: string) {
    if (userId !== requestUserId) {
      throw new ForbiddenException('You can only delete your own promotions.');
    }
    const existing = await this.prisma.promotion.findUnique({
      where: { id: promotionId },
    });
    if (!existing) throw new NotFoundException('Promotion not found.');
    if (existing.userId !== userId) {
      throw new ForbiddenException('You can only delete your own promotions.');
    }
    await this.prisma.promotion.delete({ where: { id: promotionId } });
    return { success: true };
  }
}
