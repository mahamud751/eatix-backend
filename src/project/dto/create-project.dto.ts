import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsArray,
  IsUUID,
} from 'class-validator';

export class CreateProjectDto {
  @ApiProperty({ description: 'User ID who creates the project' })
  @IsNotEmpty({ message: 'User ID is required' })
  @IsUUID('4', { message: 'User ID must be a valid UUID' })
  userId: string;

  @ApiPropertyOptional({ description: 'Business ID (optional)' })
  @IsOptional()
  @IsUUID()
  businessId?: string;

  @ApiPropertyOptional({ description: 'Client/Business name (optional)' })
  @IsOptional()
  @IsString()
  clientName?: string;

  @ApiProperty({ description: 'Project name' })
  @IsNotEmpty({ message: 'Project name is required' })
  @IsString()
  projectName: string;

  @ApiProperty({ description: 'Task title' })
  @IsNotEmpty()
  @IsString()
  taskTitle: string;

  @ApiPropertyOptional({ description: 'Description of the project' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Array of attachment URLs' })
  @IsOptional()
  @IsArray()
  attachments?: string[];
}
