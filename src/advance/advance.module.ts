import { Module } from '@nestjs/common';
import { AdvanceService } from './advance.service';
import { AdvanceController } from './advance.controller';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../audit/audit.service';
import { MulterModule } from '@nestjs/platform-express';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    MulterModule.register({
      dest: '/public/uploads',
    }),
  ],
  controllers: [AdvanceController],
  providers: [AdvanceService, PrismaService, AuditLogService],
})
export class AdvanceModule {}
