import { forwardRef, Module } from '@nestjs/common';
import { OrderService } from './order.service';
import { OrderController } from './order.controller';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from 'src/notification/notification.service';
import { AuditLogService } from 'src/audit/audit.service';
import { NotificationModule } from 'src/notification/notification.module';
import { NotificationGateway } from 'src/notification/notification.gateway';

@Module({
  imports: [forwardRef(() => NotificationModule)],
  controllers: [OrderController],
  providers: [
    OrderService,
    PrismaService,
    AuditLogService,
    NotificationService,
    NotificationGateway,
  ],
})
export class OrderModule {}
