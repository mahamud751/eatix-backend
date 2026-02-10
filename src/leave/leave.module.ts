import { Module } from '@nestjs/common';
import { LeaveService } from './leave.service';
import { LeaveController } from './leave.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { LeaveAllocationModule } from '../leave-allocation/leave-allocation.module';

@Module({
  imports: [PrismaModule, LeaveAllocationModule],
  controllers: [LeaveController],
  providers: [LeaveService],
  exports: [LeaveService],
})
export class LeaveModule {}
