import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class SocialLoginDto {
  @ApiProperty({ enum: ['google', 'facebook', 'apple'] })
  @IsNotEmpty()
  @IsString()
  @IsIn(['google', 'facebook', 'apple'])
  provider: 'google' | 'facebook' | 'apple';

  @ApiProperty({
    required: false,
    description: 'Google ID token or Apple identity token',
  })
  @IsOptional()
  @IsString()
  idToken?: string;

  @ApiProperty({
    required: false,
    description: 'Display name from first Apple Sign In only',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({
    required: false,
    description: 'Email from first Apple Sign In only',
  })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiProperty({
    required: false,
    description:
      'Facebook user access token, or Google OAuth access token when idToken is unavailable',
  })
  @IsOptional()
  @IsString()
  accessToken?: string;

  @ApiProperty({
    required: false,
    description: 'User accepted Eatwaze Terms of Use and Community Guidelines',
  })
  @IsOptional()
  @IsBoolean()
  termsAccepted?: boolean;
}
