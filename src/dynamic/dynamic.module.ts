import { Module } from '@nestjs/common';
import { AuditLogService } from 'src/audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { DynamicController } from './dynamic.controller';
import { DynamicService } from './dynamic.service';

@Module({
  controllers: [DynamicController],
  providers: [DynamicService, PrismaService, AuditLogService],
})
export class DynamicModule {}
