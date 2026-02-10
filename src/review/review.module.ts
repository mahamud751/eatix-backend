import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ReviewService } from './review.service';
import { AuditLogService } from 'src/audit/audit.service';
import { ReviewController } from './review.controller';

@Module({
  controllers: [ReviewController],
  providers: [ReviewService, PrismaService, AuditLogService],
})
export class ReviewModule {}
