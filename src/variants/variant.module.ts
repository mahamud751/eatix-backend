import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { VariantService } from './variant.service';
import { VariantController } from './variant.controller';
import { AuditLogService } from 'src/audit/audit.service';

@Module({
  controllers: [VariantController],
  providers: [VariantService, PrismaService, AuditLogService],
})
export class VariantModule {}
