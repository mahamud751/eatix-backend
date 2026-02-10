import { Module } from '@nestjs/common';
import { TaskAssignmentService } from './task-assignment.service';
import { TaskAssignmentController } from './task-assignment.controller';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [TaskAssignmentController],
  providers: [TaskAssignmentService],
  exports: [TaskAssignmentService],
})
export class TaskAssignmentModule {}
