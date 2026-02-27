import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsArray, IsOptional, IsNumber, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateRestaurantOrderItemDto {
  @ApiProperty()
  @IsString()
  menuItemId: string;

  @ApiProperty({ default: 1 })
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
}
