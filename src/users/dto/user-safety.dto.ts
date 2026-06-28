import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class BlockUserDto {
  @ApiProperty({ description: 'User id to block' })
  @IsNotEmpty()
  @IsString()
  blockedUserId: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class AcceptTermsDto {
  @ApiProperty()
  @IsBoolean()
  termsAccepted: boolean;
}
