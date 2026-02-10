import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdatePermissionDto {
  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'The name of the permission' })
  name?: string;
}
