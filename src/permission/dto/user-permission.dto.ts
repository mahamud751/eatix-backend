import { IsString, IsNotEmpty, IsArray } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AssignUserPermissionsDto {
  @ApiProperty({ description: 'The user ID to assign permissions to' })
  @IsString()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({ description: 'Array of permission IDs', type: [String] })
  @IsArray()
  @IsNotEmpty()
  permissionIds: string[];
}
