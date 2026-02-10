import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

import { AuditLogService } from 'src/audit/audit.service';
import { HttpModule } from '@nestjs/axios';

import { OrderCategoryService } from './orderCategory.service';
import { OrderCategoryController } from './orderCategory.controller';

@Module({
  imports: [HttpModule],
  controllers: [OrderCategoryController],
  providers: [OrderCategoryService, PrismaService, AuditLogService],
})
export class OrderCategoryModule {}
