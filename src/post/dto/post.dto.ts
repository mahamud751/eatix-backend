import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  IsInt,
  Min,
  IsDateString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';

export class CreatePostDto {
  @ApiProperty({ description: 'User ID who creates the post' })
  @IsNotEmpty()
  @IsString()
  userId: string;

  @ApiProperty({ description: 'Post title' })
  @IsNotEmpty()
  @IsString()
  title: string;

  @ApiPropertyOptional({ description: 'Post description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Media URL (image or video)' })
  @IsOptional()
  @IsString()
  mediaUrl?: string;

  @ApiPropertyOptional({ description: 'Thumbnail URL' })
  @IsOptional()
  @IsString()
  thumbnailUrl?: string;

  @ApiPropertyOptional({ description: 'Media type: image | video', default: 'image' })
  @IsOptional()
  @IsString()
  mediaType?: string;

  @ApiPropertyOptional({ description: 'Duration in seconds (when mediaType is video)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  duration?: number;

  @ApiPropertyOptional({ description: 'Website link' })
  @IsOptional()
  @IsString()
  website?: string;

  @ApiPropertyOptional({ description: 'Hashtags', type: [String] })
  @IsOptional()
  @Transform(({ value }) => {
    if (!value) return [];
    if (Array.isArray(value)) return value.map((v) => String(v));
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.map((v) => String(v)) : [String(value)];
    } catch {
      return [String(value)];
    }
  })
  @IsArray()
  @IsString({ each: true })
  hashtags?: string[];

  @ApiPropertyOptional({
    description:
      'When the post becomes visible in the app and matches social schedule (ISO 8601). Omit or past = publish now.',
  })
  @IsOptional()
  @IsDateString()
  publishedAt?: string;
}

export class UpdatePostDto {
  @ApiPropertyOptional({ description: 'Post title' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: 'Post description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Website link' })
  @IsOptional()
  @IsString()
  website?: string;

  @ApiPropertyOptional({ description: 'Hashtags', type: [String] })
  @IsOptional()
  @Transform(({ value }) => {
    if (!value) return [];
    if (Array.isArray(value)) return value.map((v) => String(v));
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.map((v) => String(v)) : [String(value)];
    } catch {
      return [String(value)];
    }
  })
  @IsArray()
  @IsString({ each: true })
  hashtags?: string[];
}

export class PostQueryDto {
  @ApiPropertyOptional({ description: 'Filter by user ID (own posts)' })
  @IsOptional()
  @IsString()
  userId?: string;

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

  @ApiPropertyOptional({ description: 'Sort: latest (default)' })
  @IsOptional()
  @IsString()
  sort?: string;

  @ApiPropertyOptional({ description: 'Nearby: latitude' })
  @IsOptional()
  @Type(() => Number)
  nearbyLat?: number;

  @ApiPropertyOptional({ description: 'Nearby: longitude' })
  @IsOptional()
  @Type(() => Number)
  nearbyLng?: number;

  @ApiPropertyOptional({ description: 'Nearby: radius in km', default: 50 })
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  radiusKm?: number;

  @ApiPropertyOptional({ description: 'Viewer role (user, vendor, owner)' })
  @IsOptional()
  @IsString()
  viewerRole?: string;

  @ApiPropertyOptional({
    description:
      'Logged-in user id: when set with userId filter, owner sees scheduled (future) posts too.',
  })
  @IsOptional()
  @IsString()
  viewerUserId?: string;
}

export class PostLikeDto {
  @ApiProperty() @IsNotEmpty() @IsString() postId: string;
  @ApiProperty() @IsNotEmpty() @IsString() userId: string;
}

export class PostDislikeDto {
  @ApiProperty() @IsNotEmpty() @IsString() postId: string;
  @ApiProperty() @IsNotEmpty() @IsString() userId: string;
}

export class PostShareDto {
  @ApiProperty() @IsNotEmpty() @IsString() postId: string;
}

export class PostCommentDto {
  @ApiProperty() @IsNotEmpty() @IsString() postId: string;
  @ApiProperty() @IsNotEmpty() @IsString() userId: string;
  @ApiProperty() @IsNotEmpty() @IsString() content: string;
  @ApiPropertyOptional() @IsOptional() @IsString() parentId?: string;
}

export class PostCommentLikeDto {
  @ApiProperty() @IsNotEmpty() @IsString() commentId: string;
  @ApiProperty() @IsNotEmpty() @IsString() userId: string;
}

export class PostCommentDislikeDto {
  @ApiProperty() @IsNotEmpty() @IsString() commentId: string;
  @ApiProperty() @IsNotEmpty() @IsString() userId: string;
}

export class PostCommentDeleteDto {
  @ApiProperty() @IsNotEmpty() @IsString() commentId: string;
  @ApiProperty() @IsNotEmpty() @IsString() userId: string;
}
