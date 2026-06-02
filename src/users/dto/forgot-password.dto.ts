import {
  IsEmail,
  IsNotEmpty,
  IsString,
  IsOptional,
  IsEnum,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ForgotPasswordDto {
  @ApiProperty({ description: 'The email of the user' })
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiPropertyOptional({
    description: 'Method for OTP delivery: sms or email',
    enum: ['sms', 'email'],
  })
  @IsOptional()
  @IsEnum(['sms', 'email'])
  method?: string;
}

export class VerifyOtpDto {
  @ApiProperty({ description: 'The email of the user' })
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'The OTP code' })
  @IsNotEmpty()
  @IsString()
  otp: string;
}

export class ResetPasswordDto {
  @ApiProperty({ description: 'The email of the user' })
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'The new password' })
  @IsNotEmpty()
  @IsString()
  newPassword: string;

  @ApiProperty({ description: 'Confirm the new password' })
  @IsNotEmpty()
  @IsString()
  confirmPassword: string;

  @ApiProperty({ description: 'Reset token from OTP verification' })
  @IsNotEmpty()
  @IsString()
  resetToken: string;
}

export class ReactivateAccountDto {
  @ApiProperty({ description: 'The email of the user' })
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'Reset token from OTP verification' })
  @IsNotEmpty()
  @IsString()
  resetToken: string;
}
