import { Module } from '@nestjs/common';
import { VendorFeaturedController } from './vendor-featured.controller';
import { VendorFeaturedService } from './vendor-featured.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [VendorFeaturedController],
  providers: [VendorFeaturedService],
  exports: [VendorFeaturedService],
})
export class VendorFeaturedModule {}
