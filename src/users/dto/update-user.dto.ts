import {
  IsOptional,
  IsString,
  IsEnum,
  IsNotEmpty,
  IsEmail,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { UserStatus } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { PhotoDto } from 'src/dto/photoDto';

export class UpdateUserDto {
  @ApiProperty({ description: 'The name of the user', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'The employee ID' })
  @IsOptional()
  @IsString()
  employeeId?: string;

  @ApiProperty({ description: 'The email of the user', required: false })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ description: 'The address of the user', required: false })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({ description: 'The phone number of the user', required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ description: 'The business name' })
  @IsOptional()
  @IsString()
  businessName?: string;

  @ApiPropertyOptional({ description: 'The business address' })
  @IsOptional()
  @IsString()
  businessAddress?: string;

  @ApiProperty({
    description: 'The role of the user',
    required: false,
  })
  @IsOptional()
  @IsString()
  role?: string;

  @ApiPropertyOptional({ description: 'Role ID' })
  @IsOptional()
  @IsString()
  roleId?: string;

  @ApiProperty({
    description: 'The status of the user',
    enum: UserStatus,
    required: false,
  })
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  @ApiPropertyOptional({
    description: 'Array of photo objects',
    type: [PhotoDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PhotoDto)
  @IsOptional()
  photos?: PhotoDto[];

  @ApiPropertyOptional({
    description: 'Array of permission IDs',
    type: [String],
  })
  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  permissions?: string[];

  @ApiPropertyOptional({ description: 'Department ID' })
  @IsOptional()
  @IsString()
  departmentId?: string;

  @ApiPropertyOptional({ description: 'Employee Category ID' })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional({ description: 'Employee Category ID (alias)' })
  @IsOptional()
  @IsString()
  employeeCategoryId?: string;
}
