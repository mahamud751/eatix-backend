import { Controller, Delete, Get, Param, Query } from '@nestjs/common';
import { SocialAccountsService } from './social-accounts.service';

@Controller('social-accounts')
export class SocialAccountsController {
  constructor(private readonly socialAccountsService: SocialAccountsService) {}

  @Get()
  list(@Query('userId') userId: string) {
    return this.socialAccountsService.listByUser(userId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Query('userId') userId: string) {
    return this.socialAccountsService.deleteById(id, userId);
  }
}

