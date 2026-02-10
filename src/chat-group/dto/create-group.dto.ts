import { IsString, IsOptional, IsEnum } from 'class-validator';

export class CreateGroupDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(['department', 'project', 'custom'])
  type?: string;

  @IsString()
  createdBy: string;
}
