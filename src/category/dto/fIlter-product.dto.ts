import {
  IsOptional,
  IsArray,
  IsNumber,
  IsEnum,
  IsString,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class FilterProductDto {
  @ApiPropertyOptional({
    description: 'Page number for pagination',
    example: 1,
  })
  @IsOptional()
  @IsNumber()
  page?: number;

  @ApiPropertyOptional({
    description: 'Number of products per page',
    example: 10,
  })
  @IsOptional()
  @IsNumber()
  perPage?: number;

  @ApiPropertyOptional({
    description: 'Price range filter',
    example: [10, 100],
    type: [Number],
  })
  @IsOptional()
  @IsArray()
  priceRange?: number[];

  @ApiPropertyOptional({
    description: 'Size filter',
    example: ['S', 'M', 'L'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  sizes?: string[];

  @ApiPropertyOptional({
    description: 'Color filter',
    example: ['red', 'blue'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  colors?: string[];

  @ApiPropertyOptional({
    description: 'Sorting by price',
    enum: ['asc', 'desc'],
  })
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortPrice?: 'asc' | 'desc';
}
