import { PartialType } from '@nestjs/swagger';
import { CreateOrderCategoryDto } from './createOrderCategory.dto';

export class UpdateOrderCategoryDto extends PartialType(
  CreateOrderCategoryDto,
) {}
