import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentPercentController } from './payment-percent.controller';
import { AuditLogService } from 'src/audit/audit.service';
import { PaymentPercentService } from './payment-percent.service';

@Module({
  controllers: [PaymentPercentController],
  providers: [PaymentPercentService, PrismaService, AuditLogService],
})
export class PaymentPercentModule {}
