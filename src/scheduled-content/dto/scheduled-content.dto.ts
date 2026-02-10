import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsDateString,
  IsArray,
  IsEnum,
} from 'class-validator';

export class CreateScheduledContentDto {
  @ApiProperty({ description: 'User ID (creator)' })
  @IsString()
  userId: string;

  @ApiProperty({ description: 'Company/Business ID' })
  @IsString()
  companyId: string;

  @ApiProperty({ description: 'Company name for display' })
  @IsString()
  companyName: string;

  @ApiProperty({
    required: false,
    description: 'Content ID reference (optional)',
  })
  @IsString()
  @IsOptional()
  contentId?: string;

  @ApiProperty({ required: false, description: 'Content title/description' })
  @IsString()
  @IsOptional()
  contentTitle?: string;

  @ApiProperty({ description: 'Scheduled date (YYYY-MM-DD)' })
  @IsDateString()
  scheduledDate: string;

  @ApiProperty({
    required: false,
    description: 'Scheduled time (HH:MM format)',
  })
  @IsString()
  @IsOptional()
  scheduledTime?: string;

  @ApiProperty({
    description: 'Platforms array',
    type: [String],
    example: ['facebook', 'instagram', 'linkedin', 'tiktok'],
  })
  @IsArray()
  @IsString({ each: true })
  platforms: string[];

  @ApiProperty({
    required: false,
    description: 'Status',
    enum: ['scheduled', 'posted', 'failed', 'cancelled'],
    default: 'scheduled',
  })
  @IsEnum(['scheduled', 'posted', 'failed', 'cancelled'])
  @IsOptional()
  status?: string;

  @ApiProperty({
    required: false,
    description: 'Additional metadata (optional)',
  })
  @IsOptional()
  metadata?: any;
}

export class UpdateScheduledContentDto {
  @ApiProperty({ required: false, description: 'Company/Business ID' })
  @IsString()
  @IsOptional()
  companyId?: string;

  @ApiProperty({ required: false, description: 'Company name' })
  @IsString()
  @IsOptional()
  companyName?: string;

  @ApiProperty({ required: false, description: 'Content ID reference' })
  @IsString()
  @IsOptional()
  contentId?: string;

  @ApiProperty({ required: false, description: 'Content title' })
  @IsString()
  @IsOptional()
  contentTitle?: string;

  @ApiProperty({ required: false, description: 'Scheduled date' })
  @IsDateString()
  @IsOptional()
  scheduledDate?: string;

  @ApiProperty({ required: false, description: 'Scheduled time (HH:MM)' })
  @IsString()
  @IsOptional()
  scheduledTime?: string;

  @ApiProperty({
    required: false,
    description: 'Platforms array',
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  platforms?: string[];

  @ApiProperty({
    required: false,
    description: 'Status',
    enum: ['scheduled', 'posted', 'failed', 'cancelled'],
  })
  @IsEnum(['scheduled', 'posted', 'failed', 'cancelled'])
  @IsOptional()
  status?: string;

  @ApiProperty({
    required: false,
    description: 'Posted timestamp (ISO format)',
  })
  @IsDateString()
  @IsOptional()
  postedAt?: string;

  @ApiProperty({ required: false, description: 'Metadata' })
  @IsOptional()
  metadata?: any;
}
