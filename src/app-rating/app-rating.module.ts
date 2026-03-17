import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AppRatingController } from './app-rating.controller';
import { AppRatingService } from './app-rating.service';

@Module({
  imports: [PrismaModule],
  controllers: [AppRatingController],
  providers: [AppRatingService],
})
export class AppRatingModule {}
