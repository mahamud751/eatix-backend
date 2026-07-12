import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class PhoneLoginDto {
  @ApiProperty({ description: 'Firebase ID token after phone OTP verification' })
  @IsString()
  @IsNotEmpty()
  idToken: string;

  @ApiProperty({ example: '+447700900077' })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  termsAccepted?: boolean;
}
