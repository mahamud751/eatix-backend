import { Module } from '@nestjs/common';
import { PostController } from './post.controller';
import { PostService } from './post.service';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationModule } from '../notification/notification.module';
import { R2StorageModule } from '../r2-storage/r2-storage.module';
import { ScheduledContentModule } from '../scheduled-content/scheduled-content.module';

@Module({
  imports: [
    PrismaModule,
    NotificationModule,
    R2StorageModule,
    ScheduledContentModule,
  ],
  controllers: [PostController],
  providers: [PostService],
  exports: [PostService],
})
export class PostModule {}
