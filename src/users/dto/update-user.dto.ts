import {
  IsOptional,
  IsString,
  IsEnum,
  IsNotEmpty,
  IsEmail,
  IsArray,
  IsNumber,
  ValidateNested,
} from 'class-validator';
import { UserStatus, Gender } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { PhotoDto } from 'src/dto/photoDto';

export class SocialLinkDto {
  @ApiPropertyOptional({ description: 'Social type: facebook, linkedin, instagram, x, website, others' })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional({ description: 'Full URL to profile or page' })
  @IsOptional()
  @IsString()
  url?: string;
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
    description: 'Social links: array of { type, url }. Types: facebook, linkedin, instagram, x, website, others',
    type: [SocialLinkDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SocialLinkDto)
  socialLinks?: SocialLinkDto[];
}
