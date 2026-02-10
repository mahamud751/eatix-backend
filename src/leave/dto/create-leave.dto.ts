import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsEnum,
  IsDateString,
  IsOptional,
  Min,
} from 'class-validator';

export enum LeaveType {
  ANNUAL = 'annual',
  SICK = 'sick',
  CASUAL = 'casual',
  EMERGENCY = 'emergency',
  UNPAID = 'unpaid',
  MATERNITY = 'maternity',
  PATERNITY = 'paternity',
}

export enum LeaveStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
}

export class CreateLeaveDto {
  @ApiProperty({ description: 'User ID requesting leave' })
  @IsNotEmpty({ message: 'User ID is required' })
  @IsString()
  userId: string;

  @ApiProperty({ description: 'Type of leave', enum: LeaveType })
  @IsNotEmpty({ message: 'Leave type is required' })
  @IsEnum(LeaveType, { message: 'Invalid leave type' })
  leaveType: LeaveType;

  @ApiProperty({ description: 'Start date of leave (ISO 8601 format)' })
  @IsNotEmpty({ message: 'From date is required' })
  @IsDateString(
    {},
    { message: 'From date must be a valid ISO 8601 date string' },
  )
  fromDate: string;

  @ApiProperty({ description: 'End date of leave (ISO 8601 format)' })
  @IsNotEmpty({ message: 'To date is required' })
  @IsDateString({}, { message: 'To date must be a valid ISO 8601 date string' })
  toDate: string;

  @ApiPropertyOptional({ description: 'Reason for leave' })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional({
    description: 'Attachment URL (file uploaded separately)',
  })
  @IsOptional()
  @IsString()
  attachment?: string;
}
