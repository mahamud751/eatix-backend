import { Module } from '@nestjs/common';
import { ClientBusinessController } from './client-business.controller';
import { ClientBusinessService } from './client-business.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ClientBusinessController],
  providers: [ClientBusinessService],
  exports: [ClientBusinessService],
})
export class ClientBusinessModule {}
