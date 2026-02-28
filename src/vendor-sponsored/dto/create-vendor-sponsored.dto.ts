import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsDateString, IsOptional, Min } from 'class-validator';

export class CreateVendorSponsoredDto {
  @ApiProperty({ description: 'User ID (user with role "vendor")' })
  @IsString()
  userId: string;

  @ApiProperty({ description: 'Video ID to promote' })
  @IsString()
  videoId: string;

  @ApiProperty({ description: 'Area name' })
  @IsString()
  areaName: string;

  @ApiProperty({ description: 'Latitude' })
  @IsNumber()
  latitude: number;

  @ApiProperty({ description: 'Longitude' })
  @IsNumber()
  longitude: number;

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

  @ApiProperty({ description: 'Amount paid' })
  @IsNumber()
  @Min(0)
  amountPaid: number;

  @ApiPropertyOptional({ description: 'Currency (default BDT)', default: 'BDT' })
  @IsOptional()
  @IsString()
  currency?: string;
}
