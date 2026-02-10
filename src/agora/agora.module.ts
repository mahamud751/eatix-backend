import { Module, forwardRef } from '@nestjs/common';
import { AgoraController } from './agora.controller';
import { AgoraService } from './agora.service';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [forwardRef(() => NotificationModule)],
  controllers: [AgoraController],
  providers: [AgoraService],
  exports: [AgoraService],
})
export class AgoraModule {}
