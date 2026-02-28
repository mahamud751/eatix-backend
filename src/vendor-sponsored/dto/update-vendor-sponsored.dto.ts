import { PartialType } from '@nestjs/swagger';
import { CreateVendorSponsoredDto } from './create-vendor-sponsored.dto';

export class UpdateVendorSponsoredDto extends PartialType(CreateVendorSponsoredDto) {}
