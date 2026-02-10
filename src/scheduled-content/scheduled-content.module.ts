import { Module } from '@nestjs/common';
import { ScheduledContentService } from './scheduled-content.service';
import { ScheduledContentController } from './scheduled-content.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ScheduledContentController],
  providers: [ScheduledContentService],
  exports: [ScheduledContentService],
})
export class ScheduledContentModule {}
