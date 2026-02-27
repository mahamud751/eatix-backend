import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, Min } from 'class-validator';

export class CreateMenuItemDto {
  @ApiPropertyOptional({ description: 'Owner user ID (required when caller is admin)' })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiProperty({ description: 'Menu item name' })
  @IsString()
  itemName: string;

  @ApiProperty({ description: 'Price' })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiPropertyOptional({ description: 'Image URL' })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiPropertyOptional({ description: 'Sort order (default 0)', default: 0 })
  @IsOptional()
  @IsNumber()
  sortOrder?: number;
}
