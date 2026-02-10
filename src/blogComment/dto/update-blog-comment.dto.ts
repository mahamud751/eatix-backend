import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEmail, IsEnum } from 'class-validator';

export class UpdateBlogCommentDto {
  @ApiPropertyOptional({ description: 'Name of the user' })
  @IsString()
  @IsOptional()
  userName?: string;

  @ApiPropertyOptional({ description: 'Email of the user' })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ description: 'Content of the comment' })
  @IsString()
  @IsOptional()
  comment?: string;

  @ApiPropertyOptional({
    description: 'The status of the product',
    enum: ['active', 'inActive'],
  })
  @IsEnum(['active', 'inActive'])
  @IsOptional()
  status?: string;
}
