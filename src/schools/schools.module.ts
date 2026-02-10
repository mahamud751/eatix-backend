import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SchoolsController } from './schools.controller';
import { SchoolService } from './schools.service';
import { AuditLogService } from 'src/audit/audit.service';

@Module({
  controllers: [SchoolsController],
  providers: [SchoolService, PrismaService, AuditLogService],
})
export class SchoolsModule {}
