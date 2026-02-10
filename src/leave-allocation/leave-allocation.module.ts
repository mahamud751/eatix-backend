import { Module } from '@nestjs/common';
import { LeaveAllocationService } from './leave-allocation.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [LeaveAllocationService],
  exports: [LeaveAllocationService],
})
export class LeaveAllocationModule {}
