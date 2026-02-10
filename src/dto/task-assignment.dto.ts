import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  IsDateString,
  IsEnum,
  IsUUID,
} from 'class-validator';

export enum TaskStatus {
  ASSIGNED = 'assigned',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum TaskPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

export class CreateTaskAssignmentDto {
  @IsUUID()
  @IsNotEmpty()
  companyId: string;

  @IsString()
  @IsNotEmpty()
  companyName: string;

  @IsString()
  @IsNotEmpty()
  taskDescription: string;

  @IsString()
  @IsOptional()
  vision?: string;

  @IsString()
  @IsNotEmpty()
  role: string;

  @IsUUID()
  @IsNotEmpty()
  assignToId: string;

  @IsString()
  @IsNotEmpty()
  assignToName: string;

  @IsString()
  @IsNotEmpty()
  assignToEmail: string;

  @IsDateString()
  @IsNotEmpty()
  dueDate: string;

  @IsArray()
  @IsOptional()
  attachments?: any[];

  @IsEnum(TaskPriority)
  @IsOptional()
  priority?: TaskPriority;

  @IsString()
  @IsOptional()
  createdBy?: string;
}

export class UpdateTaskAssignmentDto {
  @IsString()
  @IsOptional()
  taskDescription?: string;

  @IsString()
  @IsOptional()
  vision?: string;

  @IsString()
  @IsOptional()
  role?: string;

  @IsUUID()
  @IsOptional()
  assignToId?: string;

  @IsString()
  @IsOptional()
  assignToName?: string;

  @IsString()
  @IsOptional()
  assignToEmail?: string;

  @IsDateString()
  @IsOptional()
  dueDate?: string;

  @IsArray()
  @IsOptional()
  attachments?: any[];

  @IsEnum(TaskStatus)
  @IsOptional()
  status?: TaskStatus;

  @IsEnum(TaskPriority)
  @IsOptional()
  priority?: TaskPriority;
}

export class TaskAssignmentResponseDto {
  id: string;
  companyId: string;
  companyName: string;
  taskDescription: string;
  vision?: string;
  role: string;
  assignToId: string;
  assignToName: string;
  assignToEmail: string;
  dueDate: Date;
  attachments: any[];
  status: TaskStatus;
  priority: TaskPriority;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}
