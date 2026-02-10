import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from 'src/audit/audit.service';
import { BusinessBannerController } from './business-banner.controller';
import { BusinessBannerService } from './business-banner.service';

@Module({
  controllers: [BusinessBannerController],
  providers: [BusinessBannerService, PrismaService, AuditLogService],
})
export class BusinessBannerModule {}
