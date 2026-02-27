import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsDateString, IsOptional, Min } from 'class-validator';

export class CreateFeaturedDto {
  @ApiPropertyOptional({ description: 'Owner user ID (required when creator is admin)' })
  @IsOptional()
  @IsString()
  ownerId?: string;

  @ApiProperty({ description: 'Video ID to feature' })
  @IsString()
  videoId: string;

  @ApiPropertyOptional({ description: 'Area name; uses owner address if not provided' })
  @IsOptional()
  @IsString()
  areaName?: string;

  @ApiPropertyOptional({ description: 'Latitude; uses owner profile if not provided' })
  @IsOptional()
  @IsNumber()
  latitude?: number;

  @ApiPropertyOptional({ description: 'Longitude; uses owner profile if not provided' })
  @IsOptional()
  @IsNumber()
  longitude?: number;

  @ApiPropertyOptional({ description: 'Radius in km (default 2)', default: 2 })
  @IsOptional()
  @IsNumber()
  @Min(0.1)
  radiusKm?: number;

  @ApiProperty({ description: 'Campaign start date (ISO string)' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ description: 'Campaign end date (ISO string)' })
  @IsDateString()
  endDate: string;

  @ApiProperty({ description: 'Amount (e.g. 0 for free feature)' })
  @IsNumber()
  @Min(0)
  amountPaid: number;

  @ApiPropertyOptional({ description: 'Currency (default BDT)', default: 'BDT' })
  @IsOptional()
  @IsString()
  currency?: string;
}
