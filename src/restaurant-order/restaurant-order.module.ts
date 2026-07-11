import { Module, forwardRef } from '@nestjs/common';
import { RestaurantOrderController } from './restaurant-order.controller';
import { RestaurantOrderService } from './restaurant-order.service';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationModule } from '../notification/notification.module';
import { PaymentsModule } from '../payments/payments.module';

@Module({
  imports: [
    PrismaModule,
    NotificationModule,
    forwardRef(() => PaymentsModule),
  ],
  controllers: [RestaurantOrderController],
  providers: [RestaurantOrderService],
  exports: [RestaurantOrderService],
})
export class RestaurantOrderModule {}
