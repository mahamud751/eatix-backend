import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsArray, ValidateNested } from 'class-validator';

export class ClientBusinessDto {
  @ApiProperty({ required: false, description: 'User ID' })
  @IsString()
  @IsOptional()
  userId?: string;

  @ApiProperty({ required: false, description: 'Business name' })
  @IsString()
  @IsOptional()
  businessName?: string;

  @ApiProperty({ required: false, description: 'Industry' })
  @IsString()
  @IsOptional()
  industry?: string;

  @ApiProperty({ required: false, description: 'Website URL' })
  @IsString()
  @IsOptional()
  website?: string;

  @ApiProperty({ required: false, description: 'Brand information' })
  @IsString()
  @IsOptional()
  brand?: string;

  @ApiProperty({ required: false, description: 'Business description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    required: false,
    description: 'Primary brand color in hex format',
  })
  @IsString()
  @IsOptional()
  primaryColor?: string;

  @ApiProperty({
    required: false,
    description: 'Secondary brand color in hex format',
  })
  @IsString()
  @IsOptional()
  secondaryColor?: string;

  @ApiProperty({ required: false, description: 'Facebook URL' })
  @IsString()
  @IsOptional()
  facebookUrl?: string;

  @ApiProperty({ required: false, description: 'LinkedIn URL' })
  @IsString()
  @IsOptional()
  linkedinUrl?: string;

  @ApiProperty({ required: false, description: 'Instagram URL' })
  @IsString()
  @IsOptional()
  instagramUrl?: string;

  @ApiProperty({ required: false, description: 'TikTok URL' })
  @IsString()
  @IsOptional()
  tiktokUrl?: string;

  @ApiProperty({ required: false, description: 'Facebook password' })
  @IsString()
  @IsOptional()
  facebookPassword?: string;

  @ApiProperty({ required: false, description: 'LinkedIn password' })
  @IsString()
  @IsOptional()
  linkedinPassword?: string;

  @ApiProperty({ required: false, description: 'Instagram password' })
  @IsString()
  @IsOptional()
  instagramPassword?: string;

  @ApiProperty({ required: false, description: 'TikTok password' })
  @IsString()
  @IsOptional()
  tiktokPassword?: string;

  @ApiProperty({
    required: false,
    description: 'Business files metadata',
    type: [Object],
  })
  @IsArray()
  @IsOptional()
  files?: any[];
}
