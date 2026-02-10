import { PartialType } from '@nestjs/swagger';
import { CreateLeaveDto, LeaveStatus } from './create-leave.dto';
import { IsEnum, IsOptional, IsString, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateLeaveDto extends PartialType(CreateLeaveDto) {
  @ApiPropertyOptional({ description: 'Leave status', enum: LeaveStatus })
  @IsOptional()
  @IsEnum(LeaveStatus, { message: 'Invalid leave status' })
  status?: LeaveStatus;

  @ApiPropertyOptional({ description: 'ID of user who approved the leave' })
  @IsOptional()
  @IsString()
  approvedBy?: string;

  @ApiPropertyOptional({ description: 'Approval timestamp' })
  @IsOptional()
  @IsDateString()
  approvedAt?: string;

  @ApiPropertyOptional({ description: 'ID of user who rejected the leave' })
  @IsOptional()
  @IsString()
  rejectedBy?: string;

  @ApiPropertyOptional({ description: 'Rejection timestamp' })
  @IsOptional()
  @IsDateString()
  rejectedAt?: string;

  @ApiPropertyOptional({ description: 'Reason for rejection' })
  @IsOptional()
  @IsString()
  rejectionReason?: string;
}
