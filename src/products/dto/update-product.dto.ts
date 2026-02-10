import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsUUID,
  IsOptional,
  IsString,
  IsArray,
  IsNumber,
  IsEnum,
  IsJSON,
} from 'class-validator';
import { CreateProductDto } from './create-product.dto';

export class UpdateProductDto extends PartialType(CreateProductDto) {
  @ApiPropertyOptional({
    description: 'The category ID the product belongs to',
  })
  @IsUUID()
  @IsOptional()
  categoryId?: string;

  @ApiPropertyOptional({
    description: 'The subcategory ID the product belongs to',
  })
  @IsUUID()
  @IsOptional()
  subcategoryId?: string;

  @ApiPropertyOptional({
    description: 'The branch ID the product is associated with',
  })
  @IsUUID()
  @IsOptional()
  branchId?: string;

  @ApiPropertyOptional({
    description: 'The review ID associated with the product',
  })
  @IsUUID()
  @IsOptional()
  reviewId?: string;

  @ApiPropertyOptional({
    description: 'The name of the product',
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({
    description: 'The available sizes for the product',
    type: [String],
  })
  @IsArray()
  @IsOptional()
  sizes?: string[];

  @ApiPropertyOptional({
    description: 'The available colors for the product',
    type: [String],
  })
  @IsArray()
  @IsOptional()
  colors?: string[];

  @ApiPropertyOptional({
    description: 'The discount price of the product',
  })
  @IsString()
  @IsOptional()
  discountPrice?: string;

  @ApiPropertyOptional({
    description: 'Is the product latest?',
    enum: ['yes', 'no'],
  })
  @IsEnum(['yes', 'no'])
  @IsOptional()
  latest?: string;

  @ApiPropertyOptional({
    description: 'Is the product in stock?',
    enum: ['yes', 'no'],
  })
  @IsEnum(['yes', 'no'])
  @IsOptional()
  stock?: string;

  @ApiPropertyOptional({
    description: 'Is the product on flash sale?',
    enum: ['yes', 'no'],
  })
  @IsEnum(['yes', 'no'])
  @IsOptional()
  flashsale?: string;

  @ApiPropertyOptional({
    description: 'The type of discount applied to the product',
    enum: ['winter', 'summer', 'regular', 'no'],
  })
  @IsEnum(['winter', 'summer', 'regular', 'no'])
  @IsOptional()
  discountType?: string;

  @ApiPropertyOptional({
    description: 'The number of views for the product',
  })
  @IsNumber()
  @IsOptional()
  views?: number;

  @ApiPropertyOptional({
    description: 'A short description of the product',
  })
  @IsString()
  @IsOptional()
  desc?: string;

  @ApiPropertyOptional({
    description: 'A full description of the product',
  })
  @IsString()
  @IsOptional()
  fulldesc?: string;

  @ApiPropertyOptional({
    description: 'The price of the product',
  })
  @IsString()
  @IsOptional()
  price?: string;

  @ApiPropertyOptional({
    description: 'The b2bPrice of the product',
  })
  @IsString()
  @IsOptional()
  b2bPrice?: string;

  @ApiPropertyOptional({
    description: 'A list of URLs to photos of the product',
    type: [String],
  })
  @IsArray()
  @IsOptional()
  photos?: string[];

  @ApiPropertyOptional({
    description: 'User information related to the product',
  })
  @IsJSON()
  @IsOptional()
  userInfo?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'The status of the product',
    enum: ['active', 'inActive'],
  })
  @IsEnum(['active', 'inActive'])
  @IsOptional()
  status?: string;
}
