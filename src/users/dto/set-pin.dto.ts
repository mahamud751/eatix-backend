import {
  IsEmail,
  IsNotEmpty,
  IsString,
  IsOptional,
  IsBoolean,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SetPinDto {
  @ApiProperty({ description: 'User ID' })
  @IsNotEmpty()
  @IsString()
  userId: string;

  @ApiProperty({ description: '5-digit PIN' })
  @IsNotEmpty()
  @IsString()
  pin: string;
}

export class VerifyPinDto {
  @ApiProperty({ description: 'User ID' })
  @IsNotEmpty()
  @IsString()
  userId: string;

  @ApiProperty({ description: 'User password for verification' })
  @IsNotEmpty()
  @IsString()
  password: string;
}

export class SetFingerprintDto {
  @ApiProperty({ description: 'User ID' })
  @IsNotEmpty()
  @IsString()
  userId: string;

  @ApiProperty({ description: 'Whether fingerprint is enabled' })
  @IsNotEmpty()
  @IsBoolean()
  fingerprintEnabled: boolean;
}

export class UpdateRememberMeDto {
  @ApiProperty({ description: 'User ID' })
  @IsNotEmpty()
  @IsString()
  userId: string;

  @ApiProperty({ description: 'Remember me preference' })
  @IsNotEmpty()
  @IsBoolean()
  rememberMe: boolean;
}
