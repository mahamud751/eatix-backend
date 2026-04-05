import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduledContentService } from './scheduled-content.service';
import { ScheduledContentController } from './scheduled-content.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { SocialPublishService } from './social-publish.service';
import { ScheduledContentCronService } from './scheduled-content-cron.service';
import { SocialAccountsModule } from '../social-accounts/social-accounts.module';

@Module({
  imports: [ConfigModule, PrismaModule, SocialAccountsModule],
  controllers: [ScheduledContentController],
  providers: [
    ScheduledContentService,
    SocialPublishService,
    ScheduledContentCronService,
  ],
  exports: [ScheduledContentService],
})
export class ScheduledContentModule {}
