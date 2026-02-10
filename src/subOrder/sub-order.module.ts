import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SubOrderController } from './sub-order-controller';
import { SubOrderService } from './sub-order-service';

@Module({
  imports: [],
  controllers: [SubOrderController],
  providers: [SubOrderService, PrismaService],
})
export class SubOrderModule {}
