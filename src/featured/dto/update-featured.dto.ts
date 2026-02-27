import { PartialType } from '@nestjs/swagger';
import { CreateFeaturedDto } from './create-featured.dto';

export class UpdateFeaturedDto extends PartialType(CreateFeaturedDto) {}
