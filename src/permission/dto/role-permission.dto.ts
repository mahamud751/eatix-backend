import { IsString, IsNotEmpty, IsEnum, IsArray } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AssignRolePermissionsDto {
  @ApiProperty({
    description: 'The role to assign permissions to',
    enum: [
      'superAdmin',
      'admin',
      'user',
      'manager',
      'vendor',
      'schoolManager',
      'rider',
      'b2bManager',
      'franchise',
      'employee',
      'client',
    ],
  })
  @IsString()
  @IsNotEmpty()
  role: string;

  @ApiProperty({ description: 'Array of permission IDs', type: [String] })
  @IsArray()
  @IsNotEmpty()
  permissionIds: string[];
}

export class GetRolePermissionsDto {
  @ApiProperty({
    description: 'The role to get permissions for',
    enum: [
      'superAdmin',
      'admin',
      'user',
      'manager',
      'vendor',
      'schoolManager',
      'rider',
      'b2bManager',
      'franchise',
      'employee',
      'client',
    ],
  })
  @IsString()
  @IsNotEmpty()
  role: string;
}
