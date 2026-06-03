import { IsNumber, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class SavedLastLocationDto {
  @ApiProperty({ description: 'Latitude' })
  @Type(() => Number)
  @IsNumber()
  lat: number;

  @ApiProperty({ description: 'Longitude' })
  @Type(() => Number)
  @IsNumber()
  lng: number;

  @ApiPropertyOptional({ description: 'Address label (e.g. city or full address)' })
  @IsOptional()
  @IsString()
  addressText?: string;

  @ApiPropertyOptional({ description: 'UK postcode e.g. WD5 0AB' })
  @IsOptional()
  @IsString()
  postcode?: string;

  @ApiPropertyOptional({ description: 'Short area label for UI e.g. Abbots Langley' })
  @IsOptional()
  @IsString()
  areaLabel?: string;
}
