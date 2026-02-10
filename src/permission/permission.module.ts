import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PermissionService } from './permission.service';
import { PermissionController } from './permission.controller';
import { AuditLogService } from 'src/audit/audit.service';

@Module({
  controllers: [PermissionController],
  providers: [PermissionService, PrismaService, AuditLogService],
})
export class PermissionModule {}
