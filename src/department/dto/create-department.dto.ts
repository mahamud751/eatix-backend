import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateDepartmentDto {
  @ApiProperty({ description: 'The name of the department' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'The head of the department' })
  @IsOptional()
  @IsString()
  head?: string;

  @ApiPropertyOptional({ description: 'Description of the department' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Company Category ID' })
  @IsOptional()
  @IsString()
  categoryId?: string;
}
