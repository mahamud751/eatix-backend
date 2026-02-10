import { PartialType } from '@nestjs/swagger';
import { CreateDepartmentDto } from './create-department.dto';
import { IsOptional, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateDepartmentDto extends PartialType(CreateDepartmentDto) {
  @ApiPropertyOptional({ description: 'Status of the department' })
  @IsOptional()
  @IsEnum(['active', 'deactive', 'blocked', 'pending'])
  status?: string;
}
