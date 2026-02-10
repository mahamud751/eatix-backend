import { Module } from '@nestjs/common';
import { EmployeeCategoryService } from './employee-category.service';
import { EmployeeCategoryController } from './employee-category.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [EmployeeCategoryController],
  providers: [EmployeeCategoryService],
  exports: [EmployeeCategoryService],
})
export class EmployeeCategoryModule {}
