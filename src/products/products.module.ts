import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ProductService } from './products.service';
import { ProductController } from './products.controller';
import { AuditLogService } from 'src/audit/audit.service';
import { UsersService } from 'src/users/users.service';

@Module({
  imports: [PrismaModule],
  controllers: [ProductController],
  providers: [ProductService, UsersService, AuditLogService],
})
export class ProductModule {}
