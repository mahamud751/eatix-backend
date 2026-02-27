import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsDateString, IsOptional, Min } from 'class-validator';

export class CreateSponsoredDto {
  @ApiPropertyOptional({ description: 'Owner user ID (required when creator is admin – sponsored is for this owner)' })
  @IsOptional()
  @IsString()
  ownerId?: string;

  @ApiProperty({ description: 'Video ID to promote' })
  @IsString()
  videoId: string;

  @ApiPropertyOptional({
    description:
      'Area name e.g. Mirpur 10, Dhanmondi. Optional: if not provided, it will use the owner profile address.',
  })
  @IsOptional()
  @IsString()
  areaName?: string;

  @ApiPropertyOptional({
    description:
      'Latitude of sponsored area center. Optional: if not provided, it will use the owner profile latitude.',
  })
  @IsOptional()
  @IsNumber()
  latitude?: number;

  @ApiPropertyOptional({
    description:
      'Longitude of sponsored area center. Optional: if not provided, it will use the owner profile longitude.',
  })
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

  @ApiProperty({ description: 'Amount paid for sponsorship' })
  @IsNumber()
  @Min(0)
  amountPaid: number;

  @ApiPropertyOptional({ description: 'Currency (default BDT)', default: 'BDT' })
  @IsOptional()
  @IsString()
  currency?: string;
}
