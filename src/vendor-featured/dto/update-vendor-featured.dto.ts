import { PartialType } from '@nestjs/swagger';
import { CreateVendorFeaturedDto } from './create-vendor-featured.dto';

export class UpdateVendorFeaturedDto extends PartialType(CreateVendorFeaturedDto) {}
