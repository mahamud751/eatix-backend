import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { VendorService } from './vendor.service';
import { VendorController } from './vendor.controller';

@Module({
  imports: [],
  controllers: [VendorController],
  providers: [VendorService, PrismaService],
})
export class VendorModule {}
