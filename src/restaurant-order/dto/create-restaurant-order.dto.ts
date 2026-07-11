import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsArray,
  IsOptional,
  IsNumber,
  Min,
  IsIn,
  ValidateNested,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class CreateRestaurantOrderItemDto {
  @ApiProperty()
  @IsString()
  menuItemId: string;

  @ApiProperty({ default: 1 })
  @Transform(({ value }) => Number(value))
  @IsNumber()
  @Min(1)
  quantity: number;
}

export class CreateRestaurantOrderDto {
  @ApiProperty({ description: 'Restaurant owner user ID (video owner)' })
  @IsString()
  ownerId: string;

  @ApiProperty({ type: [CreateRestaurantOrderItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateRestaurantOrderItemDto)
  items: CreateRestaurantOrderItemDto[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  deliveryAddress?: string;

  @ApiPropertyOptional({
    description: 'Customer contact phone (UK). Required for delivery.',
  })
  @IsOptional()
  @IsString()
  customerPhone?: string;

  @ApiProperty({
    required: false,
    description: 'Applied promotion code, if any',
  })
  @IsOptional()
  @IsString()
  promoCode?: string;

  @ApiPropertyOptional({
    required: false,
    description: 'Applied promotion ID, if any',
  })
  @IsOptional()
  @Transform(({ value }) => (value == null ? value : String(value)))
  @IsString()
  promotionId?: string;

  @ApiPropertyOptional({
    description: 'Customer delivery latitude (for delivery area check)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  customerLatitude?: number;

  @ApiPropertyOptional({
    description: 'Customer delivery longitude (for delivery area check)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  customerLongitude?: number;

  @ApiPropertyOptional({
    enum: ['collection', 'delivery'],
    default: 'delivery',
    description: 'collection = pick up at restaurant; delivery = home delivery with rider (Collection)',
  })
  @IsOptional()
  @IsIn(['collection', 'delivery'])
  fulfillmentType?: 'collection' | 'delivery';

  @ApiPropertyOptional({
    description: 'Stripe PaymentIntent id after successful checkout',
  })
  @IsOptional()
  @IsString()
  paymentIntentId?: string;
}
