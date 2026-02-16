import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  IsEnum,
  IsInt,
  IsBoolean,
  IsNumber,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';

export enum ShortVisibility {
  PUBLIC = 'public',
  PRIVATE = 'private',
  UNLISTED = 'unlisted',
}

export enum ShortCommentSetting {
  ALLOW = 'allow',
  HOLD = 'hold',
  DISABLE = 'disable',
}

export class CreateShortDto {
  @ApiProperty({ description: 'User ID who is creating the short' })
  @IsNotEmpty()
  @IsString()
  userId: string;

  @ApiPropertyOptional({ description: 'Short title' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: 'Short description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Duration limit: 15s, 60s, 3m' })
  @IsOptional()
  @IsString()
  durationLimit?: string;

  @ApiPropertyOptional({ description: 'Filter ID applied' })
  @IsOptional()
  @IsString()
  filterId?: string;

  @ApiPropertyOptional({ description: 'Filter name' })
  @IsOptional()
  @IsString()
  filterName?: string;

  @ApiPropertyOptional({ description: 'Sound ID' })
  @IsOptional()
  @IsString()
  soundId?: string;

  @ApiPropertyOptional({ description: 'Sound title' })
  @IsOptional()
  @IsString()
  soundTitle?: string;

  @ApiPropertyOptional({ description: 'Sound artist' })
  @IsOptional()
  @IsString()
  soundArtist?: string;

  @ApiPropertyOptional({ description: 'Sound URL' })
  @IsOptional()
  @IsString()
  soundUrl?: string;

  @ApiPropertyOptional({ description: 'Beauty level 0-100' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  beautyLevel?: number;

  @ApiPropertyOptional({ description: 'Timer countdown seconds (3, 5, 10)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  timerSeconds?: number;

  @ApiPropertyOptional({ description: 'Speed factor (0.5, 1, 2, 3) - like YouTube Shorts' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.25)
  speedFactor?: number;

  @ApiPropertyOptional({ description: 'Camera facing: front | back' })
  @IsOptional()
  @IsString()
  cameraFacing?: string;

  @ApiPropertyOptional({
    description: 'Comment setting',
    enum: ShortCommentSetting,
  })
  @IsOptional()
  @IsEnum(ShortCommentSetting)
  commentSetting?: ShortCommentSetting;

  @ApiPropertyOptional({
    description: 'Visibility',
    enum: ShortVisibility,
  })
  @IsOptional()
  @IsEnum(ShortVisibility)
  visibility?: ShortVisibility;

  @ApiPropertyOptional({ description: 'Is live stream' })
  @IsOptional()
  @IsBoolean()
  isLive?: boolean;

  @ApiPropertyOptional({ description: 'Live channel ID (Agora)' })
  @IsOptional()
  @IsString()
  liveChannelId?: string;

  @ApiPropertyOptional({ description: 'Category' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: 'Tags', type: [String] })
  @IsOptional()
  @Transform(({ value }) => {
    if (!value) return [];
    if (Array.isArray(value)) return value.map((v) => String(v));
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.map((v) => String(v));
    } catch {}
    return [String(value)];
  })
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Duration in seconds' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  duration?: number;

  @ApiPropertyOptional({ description: 'Video width' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  width?: number;

  @ApiPropertyOptional({ description: 'Video height' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  height?: number;
}

export class UpdateShortDto {
  @ApiPropertyOptional({ description: 'Short title' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: 'Short description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Filter ID' })
  @IsOptional()
  @IsString()
  filterId?: string;

  @ApiPropertyOptional({ description: 'Filter name' })
  @IsOptional()
  @IsString()
  filterName?: string;

  @ApiPropertyOptional({ description: 'Sound ID' })
  @IsOptional()
  @IsString()
  soundId?: string;

  @ApiPropertyOptional({ description: 'Sound title' })
  @IsOptional()
  @IsString()
  soundTitle?: string;

  @ApiPropertyOptional({ description: 'Sound artist' })
  @IsOptional()
  @IsString()
  soundArtist?: string;

  @ApiPropertyOptional({ description: 'Sound URL' })
  @IsOptional()
  @IsString()
  soundUrl?: string;

  @ApiPropertyOptional({ description: 'Beauty level' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  beautyLevel?: number;

  @ApiPropertyOptional({ description: 'Comment setting', enum: ShortCommentSetting })
  @IsOptional()
  @IsEnum(ShortCommentSetting)
  commentSetting?: ShortCommentSetting;

  @ApiPropertyOptional({ description: 'Visibility', enum: ShortVisibility })
  @IsOptional()
  @IsEnum(ShortVisibility)
  visibility?: ShortVisibility;

  @ApiPropertyOptional({ description: 'Category' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: 'Tags', type: [String] })
  @IsOptional()
  @Transform(({ value }) => {
    if (!value) return [];
    if (Array.isArray(value)) return value.map((v) => String(v));
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.map((v) => String(v));
    } catch {}
    return [String(value)];
  })
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

export class ShortQueryDto {
  @ApiPropertyOptional({ description: 'User ID filter' })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({ description: 'Category filter' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: 'Search query' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Include live streams only' })
  @IsOptional()
  @Type(() => Boolean)
  @Transform(({ value }) => value === 'true' || value === true)
  isLive?: boolean;

  @ApiPropertyOptional({ description: 'Page', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: 'Limit', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;

  @ApiPropertyOptional({
    description: 'Sort: latest (default), trending (viewCount desc), random',
  })
  @IsOptional()
  @IsString()
  sort?: string;
}

export class ShortLikeDto {
  @ApiProperty({ description: 'Short ID' })
  @IsNotEmpty()
  @IsString()
  shortId: string;

  @ApiProperty({ description: 'User ID' })
  @IsNotEmpty()
  @IsString()
  userId: string;
}

export class ShortDislikeDto {
  @ApiProperty({ description: 'Short ID' })
  @IsNotEmpty()
  @IsString()
  shortId: string;

  @ApiProperty({ description: 'User ID' })
  @IsNotEmpty()
  @IsString()
  userId: string;
}

export class ShortCommentDto {
  @ApiProperty({ description: 'Short ID' })
  @IsNotEmpty()
  @IsString()
  shortId: string;

  @ApiProperty({ description: 'User ID' })
  @IsNotEmpty()
  @IsString()
  userId: string;

  @ApiProperty({ description: 'Comment content' })
  @IsNotEmpty()
  @IsString()
  content: string;

  @ApiPropertyOptional({ description: 'Parent comment ID for replies' })
  @IsOptional()
  @IsString()
  parentId?: string;
}

export class ShortCommentLikeDto {
  @ApiProperty({ description: 'Comment ID' })
  @IsNotEmpty()
  @IsString()
  commentId: string;

  @ApiProperty({ description: 'User ID' })
  @IsNotEmpty()
  @IsString()
  userId: string;
}

export class ShortCommentDislikeDto {
  @ApiProperty({ description: 'Comment ID' })
  @IsNotEmpty()
  @IsString()
  commentId: string;

  @ApiProperty({ description: 'User ID' })
  @IsNotEmpty()
  @IsString()
  userId: string;
}

export class ShortViewDto {
  @ApiProperty({ description: 'Short ID' })
  @IsNotEmpty()
  @IsString()
  shortId: string;

  @ApiPropertyOptional({ description: 'User ID' })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({ description: 'Seconds watched' })
  @IsOptional()
  @IsInt()
  @Min(0)
  watchTime?: number;

  @ApiPropertyOptional({ description: 'Whether video was completed' })
  @IsOptional()
  completed?: boolean;
}
