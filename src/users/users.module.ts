// users.module.ts
import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { AuditLogService } from 'src/audit/audit.service';

@Module({
  controllers: [UsersController],
  providers: [UsersService, PrismaService, AuditLogService],
})
export class UsersModule {}
