import { Module } from '@nestjs/common';
import { ShippingService } from './shipping.service';
import { ShippingController } from './shipping.controller';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../audit/audit.service';

@Module({
  controllers: [ShippingController],
  providers: [ShippingService, PrismaService, AuditLogService],
  exports: [ShippingService],
})
export class ShippingModule {}
