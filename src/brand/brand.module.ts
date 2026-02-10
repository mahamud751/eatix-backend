import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from 'src/audit/audit.service';
import { BrandController } from './brand.controller';
import { BrandService } from './brand.service';

@Module({
  controllers: [BrandController],
  providers: [BrandService, PrismaService, AuditLogService],
})
export class BrandMoudle {}
