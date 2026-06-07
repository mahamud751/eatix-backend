import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';
import { CreatePromotionDto } from './create-promotion.dto';

export class UpdatePromotionDto extends PartialType(CreatePromotionDto) {
  @ApiProperty({ description: 'Owner user ID (must match JWT)' })
  @IsNotEmpty()
  @IsString()
  userId: string;
}
