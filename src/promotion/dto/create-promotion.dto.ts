import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsArray,
  IsDateString,
  Min,
  IsIn,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreatePromotionDto {
  @ApiProperty({ description: 'Owner user ID (must match JWT; role owner)' })
  @IsNotEmpty()
  @IsString()
  userId: string;

  @ApiProperty({ description: 'Promotion title' })
  @IsNotEmpty()
  @IsString()
  title: string;

  @ApiPropertyOptional({ description: 'Description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Thumbnail URL (if not using upload)' })
  @IsOptional()
  @IsString()
  thumbnailUrl?: string;

  @ApiPropertyOptional({ description: 'Video URL (optional)' })
  @IsOptional()
  @IsString()
  videoUrl?: string;

  @ApiPropertyOptional({ description: 'Media type: image | video', default: 'image' })
  @IsOptional()
  @IsString()
  mediaType?: string;

  @ApiPropertyOptional({ description: 'Duration in seconds when video' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  duration?: number;

  @ApiPropertyOptional({
    description: 'Promo amount % for order promos (e.g. 10 = 10%)',
  })
  @ValidateIf((o) => (o.offerType || 'order') === 'order')
  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  promoAmount?: number;

  @ApiPropertyOptional({ description: 'Promo code (e.g. EATIX20)' })
  @ValidateIf((o) => (o.offerType || 'order') === 'order')
  @IsNotEmpty()
  @IsString()
  promoCode?: string;

  @ApiPropertyOptional({
    description: 'Offer type: order | amount_discount | booking_discount',
    default: 'order',
  })
  @IsOptional()
  @IsIn(['order', 'amount_discount', 'booking_discount'])
  offerType?: string;

  @ApiPropertyOptional({
    description: 'Fulfillment scopes for amount discounts',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  fulfillmentScopes?: string[];

  @ApiPropertyOptional({
    description: 'Tier rows: [{ minValue, maxValue?, percent, metricType? }]',
  })
  @IsOptional()
  discountTiers?: unknown;

  @ApiPropertyOptional({
    description: 'Default metric for booking tiers: people | amount',
  })
  @IsOptional()
  @IsIn(['people', 'amount'])
  tierMetricType?: string;

  @ApiProperty({ description: 'Start date (ISO string)' })
  @IsNotEmpty()
  @IsDateString()
  startDate: string;

  @ApiProperty({ description: 'Expire date (ISO string)' })
  @IsNotEmpty()
  @IsDateString()
  expireDate: string;

  @ApiPropertyOptional({ description: 'Menu item IDs included in this offer', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  menuItemIds?: string[];
}
