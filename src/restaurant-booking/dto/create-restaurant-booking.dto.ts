import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateRestaurantBookingDto {
  @ApiProperty({ description: 'Restaurant owner user ID' })
  @IsString()
  ownerId: string;

  @ApiProperty({ description: 'Customer name for the booking' })
  @IsString()
  customerName: string;

  @ApiProperty({ description: 'Customer address for the booking' })
  @IsString()
  customerAddress: string;

  @ApiProperty({ description: 'Customer contact phone number' })
  @IsString()
  customerPhone: string;

  @ApiProperty({ description: 'Total persons for booking', minimum: 1 })
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  persons: number;

  @ApiProperty({ description: 'Booking date/time as ISO string' })
  @IsDateString()
  bookingDate: string;

  @ApiPropertyOptional({ description: 'Optional note for the restaurant' })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiPropertyOptional({ description: 'Estimated spend for amount-based booking discounts' })
  @IsOptional()
  @Transform(({ value }) => (value == null ? value : Number(value)))
  bookingAmount?: number;

  @ApiPropertyOptional({ description: 'Applied booking promotion ID' })
  @IsOptional()
  @IsString()
  promotionId?: string;
}
