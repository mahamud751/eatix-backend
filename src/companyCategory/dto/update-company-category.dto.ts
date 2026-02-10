import { PartialType } from '@nestjs/swagger';
import { CreateCompanyCategoryDto } from './create-company-category.dto';
import { IsOptional, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateCompanyCategoryDto extends PartialType(
  CreateCompanyCategoryDto,
) {
  @ApiPropertyOptional({ description: 'Status of the company category' })
  @IsOptional()
  @IsEnum(['active', 'deactive', 'blocked', 'pending'])
  status?: string;
}
