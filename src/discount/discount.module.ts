import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DiscountService } from './discount.service';
import { DiscountController } from './discount.controller';
import { AuditLogService } from 'src/audit/audit.service';

@Module({
  imports: [],
  controllers: [DiscountController],
  providers: [DiscountService, PrismaService, AuditLogService],
})
export class DiscountModule {}
