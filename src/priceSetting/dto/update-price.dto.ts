import { PartialType } from '@nestjs/mapped-types';
import { CreatePriceSettingDto } from './create-price.dto';

export class UpdatePriceSettingDto extends PartialType(CreatePriceSettingDto) {}
