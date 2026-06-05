import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class AssignRiderDto {
  @ApiProperty({ description: 'Rider user ID (must belong to order owner)' })
  @IsString()
  riderId: string;
}
