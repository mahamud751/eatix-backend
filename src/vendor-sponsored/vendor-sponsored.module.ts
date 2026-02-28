import { Module } from '@nestjs/common';
import { VendorSponsoredController } from './vendor-sponsored.controller';
import { VendorSponsoredService } from './vendor-sponsored.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [VendorSponsoredController],
  providers: [VendorSponsoredService],
  exports: [VendorSponsoredService],
})
export class VendorSponsoredModule {}
