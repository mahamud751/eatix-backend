import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCompanyCategoryDto {
  @ApiProperty({ description: 'The name of the company category' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Description of the company category' })
  @IsOptional()
  @IsString()
  description?: string;
}
