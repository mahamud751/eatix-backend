import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FaqService } from './faq.service';
import { FaqController } from './faq.controller';
import { AuditLogService } from 'src/audit/audit.service';

@Module({
  imports: [],
  controllers: [FaqController],
  providers: [FaqService, PrismaService, AuditLogService],
})
export class FaqModule {}
