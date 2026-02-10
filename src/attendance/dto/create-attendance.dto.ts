import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsDateString,
  IsEnum,
} from 'class-validator';

export enum AttendanceStatus {
  PENDING = 'pending',
  PRESENT = 'present',
  ABSENT = 'absent',
  LATE = 'late',
  EARLY_DEPARTURE = 'early_departure',
  ON_LEAVE = 'on_leave',
  HOLIDAY = 'holiday',
}

export class CreateAttendanceDto {
  @ApiProperty({ description: 'User/Employee ID' })
  @IsNotEmpty()
  @IsString()
  userId: string;

  @ApiProperty({ description: 'Attendance date' })
  @IsNotEmpty()
  @IsDateString()
  date: string;

  @ApiPropertyOptional({ description: 'Check-in time' })
  @IsOptional()
  @IsDateString()
  checkIn?: string;

  @ApiPropertyOptional({ description: 'Check-out time' })
  @IsOptional()
  @IsDateString()
  checkOut?: string;

  @ApiProperty({
    description: 'Attendance status',
    enum: AttendanceStatus,
    default: AttendanceStatus.PENDING,
  })
  @IsOptional()
  @IsEnum(AttendanceStatus)
  status?: AttendanceStatus;

  @ApiPropertyOptional({ description: 'Notes or remarks' })
  @IsOptional()
  @IsString()
  notes?: string;
}
