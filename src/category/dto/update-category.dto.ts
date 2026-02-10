import {
  IsOptional,
  IsString,
  IsArray,
  IsUUID,
  IsEnum,
  IsNotEmpty,
  ValidateNested,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { PhotoDto } from 'src/dto/photoDto';

export class UpdateCategoryDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @ApiPropertyOptional({ description: 'The name of the category' })
  name?: string;

  @ApiPropertyOptional({
    description: 'Array of photo objects',
    type: [PhotoDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PhotoDto)
  @IsOptional()
  photos?: PhotoDto[];

  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  @ApiPropertyOptional({
    type: [String],
    description: 'List of subcategory IDs',
  })
  subCategories?: string[];

  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  @ApiPropertyOptional({ type: [String], description: 'List of product IDs' })
  products?: string[];

  @ApiPropertyOptional({
    description: 'The status of the product',
    enum: ['active', 'inActive'],
  })
  @IsEnum(['active', 'inActive'])
  @IsOptional()
  status?: string;
}
