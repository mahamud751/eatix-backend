import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsString,
  IsNotEmpty,
  IsInt,
  IsOptional,
  IsArray,
  IsUUID,
  ValidateNested,
  IsObject,
  IsEnum,
} from 'class-validator';
import { PhotoDto } from 'src/dto/photoDto';
import { ReplyDto } from './reply.dts';

export class CreateReviewDto {
  @ApiProperty({ description: 'Name of the user creating the review' })
  @IsNotEmpty()
  @IsString()
  userName: string;

  @ApiProperty({ description: 'The comment text for the review' })
  @IsNotEmpty()
  @IsString()
  comment: string;

  @ApiProperty({ description: 'Rating given by the user, must be an integer' })
  @IsNotEmpty()
  @IsInt()
  rating: number;

  @ApiProperty({
    description: 'Optional category of the review',
    required: false,
  })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({
    description: 'Array of photo objects',
    type: [PhotoDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PhotoDto)
  @IsOptional()
  photos?: PhotoDto[];

  @ApiPropertyOptional({
    description: 'User information related to the product',
    type: ReplyDto,
  })
  @IsObject()
  @IsOptional()
  userInfo?: ReplyDto;

  @ApiProperty({ description: 'ID of the associated product, must be a UUID' })
  @IsNotEmpty()
  @IsUUID()
  productId: string;

  @ApiPropertyOptional({
    description: 'The status of the product',
    enum: ['active', 'inActive'],
  })
  @IsEnum(['active', 'inActive'])
  @IsOptional()
  status?: string;
}
