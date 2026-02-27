import { Module } from '@nestjs/common';
import { FeaturedController } from './featured.controller';
import { FeaturedService } from './featured.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [FeaturedController],
  providers: [FeaturedService],
  exports: [FeaturedService],
})
export class FeaturedModule {}
