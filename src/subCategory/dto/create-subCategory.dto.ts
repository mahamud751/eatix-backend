import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsString,
  IsOptional,
  IsArray,
  IsEnum,
  IsNotEmpty,
  ValidateNested,
} from 'class-validator';
import { PhotoDto } from 'src/dto/photoDto';

export class CreateSubCategoryDto {
  @ApiProperty({ description: 'Name of the subcategory' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({
    description: 'Array of photo objects',
    type: [PhotoDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PhotoDto)
  @IsOptional()
  photos?: PhotoDto[];

  @ApiProperty({ description: 'ID of the associated category' })
  @IsString()
  categoryId: string;

  @ApiProperty({
    description: 'List of product IDs associated with the subcategory',
    type: [String],
    required: false,
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  product?: string[];

  @ApiPropertyOptional({
    description: 'The status of the product',
    enum: ['active', 'inActive'],
  })
  @IsEnum(['active', 'inActive'])
  @IsOptional()
  status?: string;
}
