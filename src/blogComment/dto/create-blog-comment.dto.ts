import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsEmail,
  IsEnum,
  IsOptional,
} from 'class-validator';

export class CreateBlogCommentDto {
  @ApiProperty({ description: 'Name of the user' })
  @IsString()
  @IsNotEmpty()
  userName: string;

  @ApiProperty({ description: 'Email of the user' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ description: 'Content of the comment' })
  @IsString()
  @IsNotEmpty()
  comment: string;

  @ApiProperty({ description: 'ID of the related blog post' })
  @IsString()
  @IsNotEmpty()
  blogId: string;

  @ApiPropertyOptional({
    description: 'The status of the product',
    enum: ['active', 'inActive'],
  })
  @IsEnum(['active', 'inActive'])
  @IsOptional()
  status?: string;
}
