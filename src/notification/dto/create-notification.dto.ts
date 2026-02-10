import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsEmail,
  IsEnum,
} from 'class-validator';

export class CreateNotificationDto {
  @ApiPropertyOptional({
    description: 'ID of the order related to the notification',
  })
  @IsString()
  @IsOptional()
  orderId?: string;

  @ApiPropertyOptional({
    description: 'ID of the content related to the notification',
  })
  @IsString()
  @IsOptional()
  contentId?: string;

  @ApiPropertyOptional({
    description: 'Email of the user to send notification',
  })
  @IsEmail()
  @IsOptional()
  userEmail?: string;

  @ApiPropertyOptional({ description: 'User ID of the recipient' })
  @IsString()
  @IsOptional()
  userId?: string;

  @ApiPropertyOptional({ description: 'Client ID of the recipient' })
  @IsString()
  @IsOptional()
  clientId?: string;

  @ApiPropertyOptional({
    description: 'Company ID for client-wise notifications',
  })
  @IsString()
  @IsOptional()
  companyId?: string;

  @ApiPropertyOptional({
    description: 'Assign ID for employee-wise notifications',
  })
  @IsString()
  @IsOptional()
  assignId?: string;

  @ApiProperty({ description: 'Custom message for the notification' })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiPropertyOptional({ description: 'Type of notification' })
  @IsString()
  @IsOptional()
  type?: string;

  @ApiPropertyOptional({
    description: 'Status of the notification',
    enum: ['read', 'unread'],
  })
  @IsEnum(['read', 'unread'])
  @IsOptional()
  status?: string;
}

export class UpdateNotificationStatusDto {
  @ApiProperty({
    description: 'Status of the notification, either "unread" or "read"',
  })
  @IsString()
  @IsNotEmpty()
  status: string;
}
