import {
  IsOptional,
  IsString,
  IsEnum,
  IsNotEmpty,
  IsEmail,
  IsArray,
  IsNumber,
  Min,
  ValidateNested,
} from 'class-validator';
import { UserStatus, Gender } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { PhotoDto } from 'src/dto/photoDto';

export class SocialLinkDto {
  @ApiPropertyOptional({
    description:
      'Social type: instagram | facebook | x | youtube | google_email | website',
  })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional({
    description: 'Full URL (e.g. profile link, website) or mailto: for email',
  })
  @IsOptional()
  @IsString()
  url?: string;
}

export class OpeningHourDto {
  @ApiPropertyOptional({ description: 'Day name, e.g. Sunday' })
  @IsOptional()
  @IsString()
  day?: string;

  @ApiPropertyOptional({ description: 'Opening time, e.g. 12.00PM' })
  @IsOptional()
  @IsString()
  open?: string;

  @ApiPropertyOptional({ description: 'Closing time, e.g. 12.00PM' })
  @IsOptional()
  @IsString()
  close?: string;
}

export class UpdateUserDto {
  @ApiProperty({ description: 'The name of the user', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'The nickname of the user (channel name)' })
  @IsOptional()
  @IsString()
  nickname?: string;

  @ApiPropertyOptional({ description: 'Channel about / description' })
  @IsOptional()
  @IsString()
  channelAbout?: string;

  @ApiPropertyOptional({
    description: 'The gender of the user',
    enum: Gender,
  })
  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @ApiPropertyOptional({ description: 'User food interests', type: [String] })
  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  interests?: string[];

  @ApiPropertyOptional({ description: 'The employee ID' })
  @IsOptional()
  @IsString()
  employeeId?: string;

  @ApiProperty({ description: 'The email of the user', required: false })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ description: 'The address of the user', required: false })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ description: 'Latitude for location (nearby)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  latitude?: number;

  @ApiPropertyOptional({ description: 'Longitude for location (nearby)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  longitude?: number;

  @ApiPropertyOptional({ description: 'UK postcode e.g. WD5 0AB' })
  @IsOptional()
  @IsString()
  postcode?: string;

  @ApiProperty({ description: 'The phone number of the user', required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ description: 'The business name' })
  @IsOptional()
  @IsString()
  businessName?: string;

  @ApiPropertyOptional({ description: 'The business address' })
  @IsOptional()
  @IsString()
  businessAddress?: string;

  @ApiProperty({
    description: 'The role of the user',
    required: false,
  })
  @IsOptional()
  @IsString()
  role?: string;

  @ApiPropertyOptional({ description: 'Role ID' })
  @IsOptional()
  @IsString()
  roleId?: string;

  @ApiProperty({
    description: 'The status of the user',
    enum: UserStatus,
    required: false,
  })
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  @ApiPropertyOptional({
    description: 'Array of photo objects',
    type: [PhotoDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PhotoDto)
  @IsOptional()
  photos?: PhotoDto[];

  @ApiPropertyOptional({
    description: 'Array of permission IDs',
    type: [String],
  })
  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  permissions?: string[];

  @ApiPropertyOptional({ description: 'Department ID' })
  @IsOptional()
  @IsString()
  departmentId?: string;

  @ApiPropertyOptional({ description: 'Employee Category ID' })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional({ description: 'Employee Category ID (alias)' })
  @IsOptional()
  @IsString()
  employeeCategoryId?: string;

  @ApiPropertyOptional({
    description:
      'Social links: array of { type, url }. Types: instagram, facebook, x, youtube, google_email, website',
    type: [SocialLinkDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SocialLinkDto)
  socialLinks?: SocialLinkDto[];

  @ApiPropertyOptional({
    description: 'Owner opening hours: array of { day, open, close } (7 days)',
    type: [OpeningHourDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OpeningHourDto)
  openingHours?: OpeningHourDto[];

  @ApiPropertyOptional({
    description: 'Owner estimated delivery time label e.g. "30-45 minutes"',
  })
  @IsOptional()
  @IsString()
  deliveryTime?: string;

  @ApiPropertyOptional({
    description: 'Owner max delivery radius from restaurant location (km)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  deliveryAreaKm?: number;

  @ApiPropertyOptional({
    description: 'Delivery tax/charge (£) for customers 0-10 km away',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  taxCharge0To10Km?: number;

  @ApiPropertyOptional({
    description: 'Delivery tax/charge (£) for customers 11-20 km away',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  taxCharge11To20Km?: number;

  @ApiPropertyOptional({
    description: 'Delivery tax/charge (£) for customers 21-30 km away',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  taxCharge21To30Km?: number;
}
