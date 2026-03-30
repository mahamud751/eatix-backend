import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsOptional,
  Min,
  IsIn,
  IsBoolean,
  IsArray,
} from 'class-validator';

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

  @ApiPropertyOptional({ description: 'Menu category ID (owner must create category first)' })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional({ description: 'Item description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Allergen keys (e.g. gluten, nuts, milk)',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allergens?: string[];

  @ApiPropertyOptional({
    description: 'Custom uploaded allergen icon URLs',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allergenIconUrls?: string[];

  @ApiPropertyOptional({
    description: 'Veg / Egg / Non-veg for menu filters',
    enum: ['veg', 'egg', 'non_veg'],
  })
  @IsOptional()
  @IsIn(['veg', 'egg', 'non_veg'])
  dietaryType?: string;

  @ApiPropertyOptional({ description: 'Set to true to clear (null) the dietaryType field' })
  @IsOptional()
  @IsBoolean()
  clearDietary?: boolean;
}
