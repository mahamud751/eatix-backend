import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BannerService } from './banner.service';
import { BannerController } from './banner.controller';
import { AuditLogService } from 'src/audit/audit.service';

@Module({
  controllers: [BannerController],
  providers: [BannerService, PrismaService, AuditLogService],
})
export class BannerModule {}
