import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BlogService } from './blog.service';
import { BlogController } from './blog.controller';
import { AuditLogService } from 'src/audit/audit.service';

@Module({
  imports: [],
  controllers: [BlogController],
  providers: [BlogService, PrismaService, AuditLogService],
})
export class BlogModule {}
