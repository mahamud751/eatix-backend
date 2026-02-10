import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateEmployeeCategoryDto {
  @ApiProperty({ description: 'The name of the employee category' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Description of the employee category' })
  @IsOptional()
  @IsString()
  description?: string;
}
