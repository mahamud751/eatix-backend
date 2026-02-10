import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class ReplyDto {
  @ApiPropertyOptional({
    description: 'The body of reply',
  })
  @IsString()
  @IsOptional()
  body?: string;

  @ApiPropertyOptional({
    description: 'The user of reply',
  })
  @IsString()
  @IsOptional()
  replyUser?: string;
}
