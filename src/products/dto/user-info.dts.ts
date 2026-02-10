import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class UserInfoDto {
  @ApiPropertyOptional({
    description: 'The email of the user',
  })
  @IsString()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({
    description: 'The name of the user',
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({
    description: 'The role of the user',
  })
  @IsString()
  @IsOptional()
  role?: string;

  @ApiPropertyOptional({
    description: 'The phone number of the user',
  })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({
    description: 'The branch of the user',
  })
  @IsString()
  @IsOptional()
  branch?: string;

  @ApiPropertyOptional({
    description: 'The address of the user',
  })
  @IsString()
  @IsOptional()
  address?: string;
}
