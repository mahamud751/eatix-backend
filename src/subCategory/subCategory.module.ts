import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SubCategoryService } from './subCategory.service';
import { SubCategoryController } from './subCategory.controller';
import { AuditLogService } from 'src/audit/audit.service';

@Module({
  imports: [],
  controllers: [SubCategoryController],
  providers: [SubCategoryService, PrismaService, AuditLogService],
})
export class SubCategoryModule {}
