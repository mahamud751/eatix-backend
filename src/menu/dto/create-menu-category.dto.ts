import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, MinLength } from 'class-validator';

export class CreateMenuCategoryDto {
  @ApiProperty({ description: 'Category name (e.g. Main Course, Breads)' })
  @IsString()
  @MinLength(1)
  name: string;

  @ApiPropertyOptional({ description: 'Sort order (default 0)', default: 0 })
  @IsOptional()
  @IsNumber()
  sortOrder?: number;
}
