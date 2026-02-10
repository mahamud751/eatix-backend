import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BlogCommentService } from './blogComment.service';
import { BlogCommentController } from './blogComment.controller';

@Module({
  imports: [],
  controllers: [BlogCommentController],
  providers: [BlogCommentService, PrismaService],
})
export class BlogCommentModule {}
