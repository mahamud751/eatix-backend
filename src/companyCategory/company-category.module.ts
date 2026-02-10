import { Module } from '@nestjs/common';
import { CompanyCategoryService } from './company-category.service';
import { CompanyCategoryController } from './company-category.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CompanyCategoryController],
  providers: [CompanyCategoryService],
  exports: [CompanyCategoryService],
})
export class CompanyCategoryModule {}
