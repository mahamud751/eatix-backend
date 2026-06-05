import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationModule } from '../notification/notification.module';
import { RestaurantBookingController } from './restaurant-booking.controller';
import { RestaurantBookingService } from './restaurant-booking.service';

@Module({
  imports: [PrismaModule, NotificationModule],
  controllers: [RestaurantBookingController],
  providers: [RestaurantBookingService],
  exports: [RestaurantBookingService],
})
export class RestaurantBookingModule {}
