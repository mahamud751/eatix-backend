import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
  Request,
  BadRequestException,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { PromotionService } from './promotion.service';
import { CreatePromotionDto } from './dto/create-promotion.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OwnerOrVendorGuard } from '../auth/owner-or-vendor.guard';

@ApiTags('promotions')
@Controller('promotions')
export class PromotionController {
  constructor(private readonly promotionService: PromotionService) {}

  @Get('nearby')
  @ApiOperation({ summary: 'Get promotions from owners or vendors near lat/lng (active only). creatorRole=owner|vendor' })
  @ApiResponse({ status: 200, description: 'Promotions list' })
  async getNearby(
    @Query('latitude') latitude: string,
    @Query('longitude') longitude: string,
    @Query('radiusKm') radiusKm?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('creatorRole') creatorRole?: string,
  ) {
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    const role = (creatorRole === 'vendor' ? 'vendor' : 'owner') as 'owner' | 'vendor';
    return this.promotionService.getNearby(
      lat,
      lng,
      radiusKm != null ? parseFloat(radiusKm) : 50,
      page ? Number(page) : 1,
      limit ? Number(limit) : 50,
      role,
    );
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get promotions by owner user ID (public)' })
  @ApiResponse({ status: 200, description: 'Promotions list' })
  async getByUserId(
    @Param('userId') userId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.promotionService.getByUserId(
      userId,
      page ? Number(page) : 1,
      limit ? Number(limit) : 50,
    );
  }

  @Post()
  @UseGuards(JwtAuthGuard, OwnerOrVendorGuard)
  @ApiOperation({ summary: 'Create promotion (owner or vendor)' })
  @ApiResponse({ status: 201, description: 'Promotion created' })
  @ApiResponse({ status: 403, description: 'Only owner or vendor can create' })
  async create(@Body() dto: CreatePromotionDto, @Request() req: { user: { id: string } }) {
    return this.promotionService.create(dto, req.user.id);
  }

  @Post('upload')
  @UseGuards(JwtAuthGuard, OwnerOrVendorGuard)
  @ApiOperation({ summary: 'Upload promotion with thumbnail and optional video (owner or vendor)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: { type: 'array', items: { type: 'string', format: 'binary' } },
        userId: { type: 'string' },
        title: { type: 'string' },
        description: { type: 'string' },
        promoAmount: { type: 'number' },
        promoCode: { type: 'string' },
        startDate: { type: 'string', format: 'date-time' },
        expireDate: { type: 'string', format: 'date-time' },
        menuItemIds: { type: 'string', description: 'JSON array or comma-separated IDs' },
        duration: { type: 'number', description: 'Video duration in seconds' },
      },
      required: ['userId', 'title', 'promoAmount', 'promoCode', 'startDate', 'expireDate'],
    },
  })
  @ApiResponse({ status: 201, description: 'Promotion uploaded' })
  @ApiResponse({ status: 403, description: 'Only owner or vendor can create' })
  @UseInterceptors(FilesInterceptor('files', 2))
  async upload(
    @UploadedFiles() files: Express.Multer.File[],
    @Body()
    body: {
      userId: string;
      title: string;
      description?: string;
      promoAmount: string | number;
      promoCode: string;
      startDate: string;
      expireDate: string;
      menuItemIds?: string;
      duration?: number;
    },
    @Request() req: { user: { id: string } },
  ) {
    const promoAmount = typeof body.promoAmount === 'number' ? body.promoAmount : parseFloat(String(body.promoAmount));
    if (Number.isNaN(promoAmount)) {
      throw new BadRequestException('promoAmount must be a number');
    }
    let menuItemIds: string[] | undefined;
    if (body.menuItemIds != null && body.menuItemIds !== '') {
      try {
        const parsed = JSON.parse(body.menuItemIds);
        menuItemIds = Array.isArray(parsed) ? parsed : [String(body.menuItemIds)];
      } catch {
        menuItemIds = String(body.menuItemIds).split(',').map((s) => s.trim()).filter(Boolean);
      }
    }
    return this.promotionService.upload(
      files,
      {
        userId: body.userId,
        title: body.title,
        description: body.description,
        promoAmount,
        promoCode: body.promoCode,
        startDate: body.startDate,
        expireDate: body.expireDate,
        menuItemIds,
        duration: body.duration != null ? Number(body.duration) : undefined,
      },
      req.user.id,
    );
  }
}
