import { Module } from '@nestjs/common';
import { RestaurantOrderController } from './restaurant-order.controller';
import { RestaurantOrderService } from './restaurant-order.service';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [PrismaModule, NotificationModule],
  controllers: [RestaurantOrderController],
  providers: [RestaurantOrderService],
  exports: [RestaurantOrderService],
})
export class RestaurantOrderModule {}
