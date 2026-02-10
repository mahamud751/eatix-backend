import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  // Define with a type if needed, otherwise remove
  private _priceSetting: any;
  public get priceSetting(): any {
    return this._priceSetting;
  }
  public set priceSetting(value: any) {
    this._priceSetting = value;
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
