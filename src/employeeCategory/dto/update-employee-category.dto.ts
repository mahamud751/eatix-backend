import { PartialType } from '@nestjs/swagger';
import { CreateEmployeeCategoryDto } from './create-employee-category.dto';
import { IsOptional, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateEmployeeCategoryDto extends PartialType(
  CreateEmployeeCategoryDto,
) {
  @ApiPropertyOptional({ description: 'Status of the employee category' })
  @IsOptional()
  @IsEnum(['active', 'deactive', 'blocked', 'pending'])
  status?: string;
}
