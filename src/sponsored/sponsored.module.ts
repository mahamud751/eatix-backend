import { Module } from '@nestjs/common';
import { SponsoredController } from './sponsored.controller';
import { SponsoredService } from './sponsored.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [SponsoredController],
  providers: [SponsoredService],
  exports: [SponsoredService],
})
export class SponsoredModule {}
