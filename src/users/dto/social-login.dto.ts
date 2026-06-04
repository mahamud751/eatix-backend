import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class SocialLoginDto {
  @ApiProperty({ enum: ['google', 'facebook'] })
  @IsNotEmpty()
  @IsString()
  @IsIn(['google', 'facebook'])
  provider: 'google' | 'facebook';

  @ApiProperty({ required: false, description: 'Google ID token' })
  @IsOptional()
  @IsString()
  idToken?: string;

  @ApiProperty({
    required: false,
    description:
      'Facebook user access token, or Google OAuth access token when idToken is unavailable',
  })
  @IsOptional()
  @IsString()
  accessToken?: string;
}
