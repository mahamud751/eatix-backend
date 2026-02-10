import { Module } from '@nestjs/common';
import { RoleController } from './role.controller';
import { RoleService } from './role.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [RoleController],
  providers: [RoleService, PrismaService],
  exports: [RoleService],
})
export class RoleModule {}
