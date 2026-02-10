import { PartialType } from '@nestjs/mapped-types';
import { CreatePaymentPercentDto } from './create-payment-percent.dto';

export class UpdatePaymentPercentDto extends PartialType(
  CreatePaymentPercentDto,
) {}
