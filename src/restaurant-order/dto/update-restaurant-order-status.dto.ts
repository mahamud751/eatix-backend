import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { RestaurantOrderStatus } from '@prisma/client';

export class UpdateRestaurantOrderStatusDto {
  @ApiProperty({ enum: ['pending', 'confirmed', 'preparing', 'completed', 'cancelled'] })
  @IsEnum(RestaurantOrderStatus)
  status: RestaurantOrderStatus;
}
