import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  IsEnum,
  IsInt,
  Min,
  IsBoolean,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';

export enum VideoVisibility {
  PUBLIC = 'public',
  PRIVATE = 'private',
  UNLISTED = 'unlisted',
}

export class CreateVideoDto {
  @ApiProperty({ description: 'User ID who is uploading the video' })
  @IsNotEmpty()
  @IsString()
  userId: string;

  @ApiProperty({ description: 'Video title' })
  @IsNotEmpty()
  @IsString()
  title: string;

  @ApiPropertyOptional({ description: 'Video description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Video category' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: 'Video tags', type: [String] })
  @IsOptional()
  @Transform(({ value }) => {
    if (!value) return [];
    // If already an array (e.g. multiple form fields), keep as-is
    if (Array.isArray(value)) {
      return value.map((v) => String(v));
    }
    // If JSON string from FormData, try to parse
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.map((v) => String(v));
      }
    } catch {
      // fall through
    }
    // Fallback: single string value
    return [String(value)];
  })
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({
    description: 'Video visibility',
    enum: VideoVisibility,
    default: VideoVisibility.PUBLIC,
  })
  @IsOptional()
  @IsEnum(VideoVisibility)
  visibility?: VideoVisibility;

  @ApiPropertyOptional({ description: 'Video duration in seconds' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  duration?: number;

  @ApiPropertyOptional({ description: 'Video width in pixels' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  width?: number;

  @ApiPropertyOptional({ description: 'Video height in pixels' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  height?: number;

  @ApiPropertyOptional({
    description:
      'ISO datetime — video visible in public feeds only after this time. Omit for immediate.',
  })
  @IsOptional()
  @IsString()
  scheduledPublishAt?: string;

  @ApiPropertyOptional({ description: 'Add uploaded video to this custom playlist (owner only)' })
  @IsOptional()
  @IsString()
  customPlaylistId?: string;
}

export class UpdateVideoDto {
  @ApiPropertyOptional({ description: 'Video title' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: 'Video description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Video category' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: 'Video tags', type: [String] })
  @IsOptional()
  @Transform(({ value }) => {
    if (!value) return [];
    if (Array.isArray(value)) {
      return value.map((v) => String(v));
    }
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.map((v) => String(v));
      }
    } catch {
      // ignore parse error
    }
    return [String(value)];
  })
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({
    description: 'Video visibility',
    enum: VideoVisibility,
  })
  @IsOptional()
  @IsEnum(VideoVisibility)
  visibility?: VideoVisibility;
}

export class VideoQueryDto {
  @ApiPropertyOptional({ description: 'User ID to filter videos' })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({ description: 'Category to filter' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: 'Search query' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page', default: 20 })
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

  @ApiPropertyOptional({ description: 'Nearby: latitude for center' })
  @IsOptional()
  @Type(() => Number)
  nearbyLat?: number;

  @ApiPropertyOptional({ description: 'Nearby: longitude for center' })
  @IsOptional()
  @Type(() => Number)
  nearbyLng?: number;

  @ApiPropertyOptional({ description: 'Nearby: radius in km', default: 50 })
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  radiusKm?: number;

  @ApiPropertyOptional({
    description:
      'If true, exclude videos that are currently in an active sponsored campaign',
    default: false,
  })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  excludeSponsored?: boolean;

  @ApiPropertyOptional({
    description:
      'If true, exclude videos that are currently in an active featured campaign',
    default: false,
  })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  excludeFeatured?: boolean;

  @ApiPropertyOptional({
    description:
      'Viewer role (e.g. user, vendor, owner, admin). When "user", vendor-uploaded videos are excluded.',
  })
  @IsOptional()
  @IsString()
  viewerRole?: string;
}

export class VideoLikeDto {
  @ApiProperty({ description: 'Video ID' })
  @IsNotEmpty()
  @IsString()
  videoId: string;

  @ApiProperty({ description: 'User ID' })
  @IsNotEmpty()
  @IsString()
  userId: string;
}

export class VideoDislikeDto {
  @ApiProperty({ description: 'Video ID' })
  @IsNotEmpty()
  @IsString()
  videoId: string;

  @ApiProperty({ description: 'User ID' })
  @IsNotEmpty()
  @IsString()
  userId: string;
}

export class VideoShareDto {
  @ApiProperty({ description: 'Video ID' })
  @IsNotEmpty()
  @IsString()
  videoId: string;
}

export class VideoCommentDto {
  @ApiProperty({ description: 'Video ID' })
  @IsNotEmpty()
  @IsString()
  videoId: string;

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

export class VideoCommentLikeDto {
  @ApiProperty({ description: 'Comment ID' })
  @IsNotEmpty()
  @IsString()
  commentId: string;

  @ApiProperty({ description: 'User ID' })
  @IsNotEmpty()
  @IsString()
  userId: string;
}

export class VideoCommentDeleteDto {
  @ApiProperty({ description: 'Comment ID' })
  @IsNotEmpty()
  @IsString()
  commentId: string;

  @ApiProperty({ description: 'User ID (must be comment owner)' })
  @IsNotEmpty()
  @IsString()
  userId: string;
}

export class VideoCommentDislikeDto {
  @ApiProperty({ description: 'Comment ID' })
  @IsNotEmpty()
  @IsString()
  commentId: string;

  @ApiProperty({ description: 'User ID' })
  @IsNotEmpty()
  @IsString()
  userId: string;
}

export class VideoViewDto {
  @ApiProperty({ description: 'Video ID' })
  @IsNotEmpty()
  @IsString()
  videoId: string;

  @ApiPropertyOptional({
    description: 'User ID (optional for anonymous views)',
  })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({ description: 'Seconds watched' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  watchTime?: number;

  @ApiPropertyOptional({ description: 'Whether video was completed' })
  @IsOptional()
  completed?: boolean;
}
