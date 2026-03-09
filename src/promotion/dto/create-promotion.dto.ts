import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsArray,
  IsDateString,
  Min,
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

  @ApiProperty({ description: 'Promo amount (e.g. 10 for 10% or 10 BDT)' })
  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  promoAmount: number;

  @ApiProperty({ description: 'Promo code (e.g. EATIX20)' })
  @IsNotEmpty()
  @IsString()
  promoCode: string;

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
