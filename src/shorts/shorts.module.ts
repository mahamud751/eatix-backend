import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ShortsController } from './shorts.controller';
import { ShortsService } from './shorts.service';
import { ShortsTranscodeService } from './shorts-transcode.service';
import { PrismaModule } from '../prisma/prisma.module';
import { R2StorageModule } from '../r2-storage/r2-storage.module';
import { SubscriptionModule } from '../subscription/subscription.module';
import { NotificationModule } from '../notification/notification.module';
import { ScheduledContentModule } from '../scheduled-content/scheduled-content.module';

@Module({
  imports: [
    HttpModule.register({
      timeout: 120_000,
      maxRedirects: 5,
    }),
    PrismaModule,
    R2StorageModule,
    SubscriptionModule,
    NotificationModule,
    ScheduledContentModule,
  ],
  controllers: [ShortsController],
  providers: [ShortsService, ShortsTranscodeService],
  exports: [ShortsService],
})
export class ShortsModule {}
