import { PartialType } from '@nestjs/swagger';
import { CreateSponsoredDto } from './create-sponsored.dto';

export class UpdateSponsoredDto extends PartialType(CreateSponsoredDto) {}
