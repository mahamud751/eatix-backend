/* eslint-disable prettier/prettier */
import { Module } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { PriceSettingController } from './pirce.controller';
import { PriceSettingService } from './price.service';

@Module({
  controllers: [PriceSettingController],
  providers: [PriceSettingService, PrismaService],
})
export class PriceSettingModule {}
