import { IsString, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateDynamicDto {
  @ApiProperty({ description: 'The name of the dynamic page' })
  @IsString()
  name: string;

  @ApiPropertyOptional({
    description: 'page description',
  })
  @IsString()
  desc: string;

  @ApiPropertyOptional({
    description: 'The status of the dynamic',
    enum: ['active', 'inActive'],
  })
  @IsEnum(['active', 'inActive'])
  @IsOptional()
  status?: string;
}
