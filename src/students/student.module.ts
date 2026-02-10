import { Module } from '@nestjs/common';
import { StudentService } from './student.service';
import { StudentController } from './student.controller';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../audit/audit.service';

@Module({
  imports: [],
  controllers: [StudentController],
  providers: [StudentService, PrismaService, AuditLogService],
  exports: [StudentService],
})
export class StudentModule {}
