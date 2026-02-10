import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogController } from './audit.controller';
import { AuditLogService } from './audit.service';

@Module({
  controllers: [AuditLogController],
  providers: [AuditLogService, PrismaService],
})
export class AuditModule {}
