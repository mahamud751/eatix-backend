import { Module } from '@nestjs/common';
import { ShortsController } from './shorts.controller';
import { ShortsService } from './shorts.service';
import { PrismaModule } from '../prisma/prisma.module';
import { R2StorageModule } from '../r2-storage/r2-storage.module';
import { SubscriptionModule } from '../subscription/subscription.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [
    PrismaModule,
    R2StorageModule,
    SubscriptionModule,
    NotificationModule,
  ],
  controllers: [ShortsController],
  providers: [ShortsService],
  exports: [ShortsService],
})
export class ShortsModule {}
