import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { RestaurantOrderStatus } from '@prisma/client';

export class UpdateRestaurantOrderStatusDto {
  @ApiProperty({
    enum: [
      'pending',
      'confirmed',
      'preparing',
      'rider_assigned',
      'rider_accepted',
      'out_for_delivery',
      'completed',
      'cancelled',
    ],
  })
  @IsEnum(RestaurantOrderStatus)
  status: RestaurantOrderStatus;
}
