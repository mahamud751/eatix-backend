import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsString,
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  ValidateNested,
} from 'class-validator';
import { PhotoDto } from 'src/dto/photoDto';

export class CreateBlogDto {
  @ApiProperty({ description: 'Name of the blog' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Description of the blog' })
  @IsString()
  @IsNotEmpty()
  desc: string;

  @ApiPropertyOptional({
    description: 'Array of photo objects',
    type: [PhotoDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PhotoDto)
  @IsOptional()
  photos?: PhotoDto[];

  @ApiProperty({
    description: 'List of blog comment IDs associated with the blog',
    type: [String],
    required: false,
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  blogComment?: string[];

  @ApiPropertyOptional({
    description: 'The status of the product',
    enum: ['active', 'inActive'],
  })
  @IsEnum(['active', 'inActive'])
  @IsOptional()
  status?: string;
}
