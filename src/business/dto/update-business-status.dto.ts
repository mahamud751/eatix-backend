import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsEnum } from 'class-validator';

export enum BusinessStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  IN_PROGRESS = 'in_progress',
  MODIFICATION = 'modification',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export class UpdateBusinessStatusDto {
  @ApiProperty({
    description: 'Business status',
    enum: BusinessStatus,
    example: BusinessStatus.ACCEPTED,
  })
  @IsNotEmpty()
  @IsEnum(BusinessStatus)
  status: BusinessStatus;
}
