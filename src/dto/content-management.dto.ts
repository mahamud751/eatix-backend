import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsArray,
  IsDateString,
  IsEnum,
} from 'class-validator';

export class CreateContentDto {
  @ApiProperty({ required: true, description: 'User ID (creator)' })
  @IsString()
  userId: string;

  @ApiProperty({
    required: true,
    description: 'Client ID (who this content is for)',
  })
  @IsString()
  clientId: string;

  @ApiProperty({ required: true, description: 'Company ID' })
  @IsString()
  companyId: string;

  @ApiProperty({ required: true, description: 'Company Name' })
  @IsString()
  companyName: string;

  @ApiProperty({ required: true, description: 'Content date' })
  @IsDateString()
  date: string;

  @ApiProperty({ required: false, description: 'Content title' })
  @IsString()
  @IsOptional()
  contentTitle?: string;

  @ApiProperty({ required: false, description: 'Occasion' })
  @IsString()
  @IsOptional()
  occasion?: string;

  @ApiProperty({ required: true, description: 'Caption' })
  @IsString()
  caption: string;

  @ApiProperty({
    required: false,
    description: 'Tags array',
    type: [String],
  })
  @IsArray()
  @IsOptional()
  tags?: string[];

  @ApiProperty({
    required: false,
    description: 'Files array (file metadata)',
    type: [Object],
  })
  @IsArray()
  @IsOptional()
  files?: any[];

  @ApiProperty({
    required: false,
    description: 'Employee comment (optional)',
  })
  @IsString()
  @IsOptional()
  employeeComment?: string;

  @ApiProperty({
    required: false,
    description: 'Role assignment',
    enum: ['pending', 'designer', 'videographer', 'contentWriter', 'creator'],
  })
  @IsEnum(['pending', 'designer', 'videographer', 'contentWriter', 'creator'])
  @IsOptional()
  role?: string;

  @ApiProperty({
    required: false,
    description: 'Assign ID (optional)',
  })
  @IsString()
  @IsOptional()
  assignId?: string;

  @ApiProperty({
    required: false,
    description: 'Vision (optional)',
  })
  @IsString()
  @IsOptional()
  vision?: string;

  @ApiProperty({
    required: false,
    description: 'Due date (optional)',
  })
  @IsDateString()
  @IsOptional()
  dueDate?: string;

  @ApiProperty({
    required: false,
    description: 'Inspare URLs array (optional)',
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  inspareUrl?: string[];

  @ApiProperty({
    required: false,
    description: 'Inspare files array (optional)',
    type: [Object],
  })
  @IsArray()
  @IsOptional()
  inspareFiles?: any[];

  @ApiProperty({
    required: false,
    description: 'Reason (optional)',
  })
  @IsString()
  @IsOptional()
  reason?: string;

  @ApiProperty({ required: false, description: 'Internal comments' })
  @IsString()
  @IsOptional()
  internalComments?: string;

  @ApiProperty({
    required: false,
    description: 'Content status',
    enum: [
      'pending',
      'send',
      'modified',
      'approved',
      'rejected',
      'published',
      'submit',
    ],
  })
  @IsEnum([
    'pending',
    'send',
    'modified',
    'approved',
    'rejected',
    'published',
    'submit',
  ])
  @IsOptional()
  status?: string;
}

export class UpdateContentDto {
  @ApiProperty({ required: false, description: 'User ID (creator)' })
  @IsString()
  @IsOptional()
  userId?: string;

  @ApiProperty({
    required: false,
    description: 'Client ID (who this content is for)',
  })
  @IsString()
  @IsOptional()
  clientId?: string;

  @ApiProperty({ required: false, description: 'Company ID' })
  @IsString()
  @IsOptional()
  companyId?: string;

  @ApiProperty({ required: false, description: 'Company Name' })
  @IsString()
  @IsOptional()
  companyName?: string;

  @ApiProperty({ required: false, description: 'Content date' })
  @IsDateString()
  @IsOptional()
  date?: string;

  @ApiProperty({ required: false, description: 'Content title' })
  @IsString()
  @IsOptional()
  contentTitle?: string;

  @ApiProperty({ required: false, description: 'Occasion' })
  @IsString()
  @IsOptional()
  occasion?: string;

  @ApiProperty({ required: false, description: 'Caption' })
  @IsString()
  @IsOptional()
  caption?: string;

  @ApiProperty({
    required: false,
    description: 'Tags array',
    type: [String],
  })
  @IsArray()
  @IsOptional()
  tags?: string[];

  @ApiProperty({
    required: false,
    description: 'Files array (file metadata)',
    type: [Object],
  })
  @IsArray()
  @IsOptional()
  files?: any[];

  @ApiProperty({
    required: false,
    description: 'Employee comment (optional)',
  })
  @IsString()
  @IsOptional()
  employeeComment?: string;

  @ApiProperty({
    required: false,
    description: 'Role assignment',
    enum: ['pending', 'designer', 'videographer', 'contentWriter', 'creator'],
  })
  @IsEnum(['pending', 'designer', 'videographer', 'contentWriter', 'creator'])
  @IsOptional()
  role?: string;

  @ApiProperty({
    required: false,
    description: 'Assign ID (optional)',
  })
  @IsString()
  @IsOptional()
  assignId?: string;

  @ApiProperty({
    required: false,
    description: 'Vision (optional)',
  })
  @IsString()
  @IsOptional()
  vision?: string;

  @ApiProperty({
    required: false,
    description: 'Due date (optional)',
  })
  @IsDateString()
  @IsOptional()
  dueDate?: string;

  @ApiProperty({
    required: false,
    description: 'Inspare URLs array (optional)',
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  inspareUrl?: string[];

  @ApiProperty({
    required: false,
    description: 'Inspare files array (optional)',
    type: [Object],
  })
  @IsArray()
  @IsOptional()
  inspareFiles?: any[];

  @ApiProperty({
    required: false,
    description: 'Reason (optional)',
  })
  @IsString()
  @IsOptional()
  reason?: string;

  @ApiProperty({ required: false, description: 'Internal comments' })
  @IsString()
  @IsOptional()
  internalComments?: string;

  @ApiProperty({
    required: false,
    description: 'Content status',
    enum: [
      'pending',
      'send',
      'modified',
      'approved',
      'rejected',
      'published',
      'submit',
    ],
  })
  @IsEnum([
    'pending',
    'send',
    'modified',
    'approved',
    'rejected',
    'published',
    'submit',
  ])
  @IsOptional()
  status?: string;
}
