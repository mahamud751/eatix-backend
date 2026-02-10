import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional, IsArray } from 'class-validator';

export class CreateBusinessDto {
  @ApiProperty({ description: 'User ID who owns the business (client)' })
  @IsNotEmpty()
  @IsString()
  userId: string;

  @ApiProperty({
    description: 'User ID who created the business (admin/creator)',
  })
  @IsNotEmpty()
  @IsString()
  createdBy: string;

  @ApiProperty({ description: 'Business name' })
  @IsNotEmpty()
  @IsString()
  businessName: string;

  @ApiPropertyOptional({ description: 'Industry type' })
  @IsOptional()
  @IsString()
  industry?: string;

  @ApiProperty({ description: 'Task title' })
  @IsNotEmpty()
  @IsString()
  taskTitle: string;

  @ApiPropertyOptional({ description: 'Description of the business task' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Array of attachment URLs' })
  @IsOptional()
  @IsArray()
  attachments?: string[];
}
