import { PartialType } from '@nestjs/mapped-types';
import { CreateSubOrderDto } from './sub-order.dto';

export class UpdateSubOrderDto extends PartialType(CreateSubOrderDto) {}
