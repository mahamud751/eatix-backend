// update-password.dto.ts
import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { PhotoDto } from 'src/dto/photoDto';

export class UpdatePasswordDto {
  @IsNotEmpty()
  @IsString()
  @ApiProperty({ description: 'ID of the user' })
  userId: string;

  @IsOptional()
  @IsString()
  @ApiProperty({ description: 'Current password of the user', required: false })
  currentPassword?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({ description: 'New password for the user', required: false })
  newPassword?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({ description: 'Name of the user', required: false })
  name?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({ description: 'Email of the user', required: false })
  email?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({ description: 'Phone number of the user', required: false })
  phone?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({ description: 'Address of the user', required: false })
  address?: string;

  @ApiPropertyOptional({
    description: 'Array of photo objects',
    type: [PhotoDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PhotoDto)
  @IsOptional()
  photos?: PhotoDto[];
}
