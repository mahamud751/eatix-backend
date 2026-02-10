import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsEnum } from 'class-validator';

export enum ProjectStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  IN_PROGRESS = 'in_progress',
  MODIFICATION = 'modification',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export class UpdateProjectStatusDto {
  @ApiProperty({
    description: 'Project status',
    enum: ProjectStatus,
    example: ProjectStatus.ACCEPTED,
  })
  @IsNotEmpty()
  @IsEnum(ProjectStatus)
  status: ProjectStatus;
}
