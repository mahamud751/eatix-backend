import { PartialType } from '@nestjs/mapped-types';
import { CreateBusinessBannerDto } from './create-business-banner.dto';

export class UpdateBusinessBannerDto extends PartialType(
  CreateBusinessBannerDto,
) {}
