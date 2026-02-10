import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsArray, IsOptional, IsEnum } from 'class-validator';

export class CreatePriceSettingDto {
  @ApiProperty({ description: 'Base price', example: '100.00' })
  @IsString()
  base: string;

  @ApiProperty({ description: 'Currency code', example: 'USD' })
  @IsString()
  currency: string;

  @ApiProperty({ description: 'Currency rate', example: '1.0' })
  @IsString()
  currecyRate: string;

  @ApiProperty({ description: 'Currency rate increment', example: '0.1' })
  @IsString()
  currecyRateInc: string;

  @ApiProperty({ description: 'Additional price', example: '10.00' })
  @IsString()
  addintional: string;

  @ApiProperty({
    description: 'Status of the price setting',
    example: 'active',
    enum: ['active', 'inactive'],
  })
  @IsEnum(['active', 'inactive'])
  @IsOptional()
  status?: string;
}
