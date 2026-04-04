import {
  Controller,
  Delete,
  Get,
  Param,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { SocialAccountsService } from './social-accounts.service';

@Controller('social-accounts')
export class SocialAccountsController {
  constructor(private readonly socialAccountsService: SocialAccountsService) {}

  @Get()
  list(@Query('userId') userId: string) {
    return this.socialAccountsService.listByUser(userId);
  }

  /** Instagram Business link per Facebook Page + stored instagram social rows (after verify). */
  @Get('instagram-status')
  instagramStatus(@Query('userId') userId: string) {
    if (!userId?.trim()) {
      throw new BadRequestException('userId is required');
    }
    return this.socialAccountsService.instagramLinkStatus(userId.trim());
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Query('userId') userId: string) {
    return this.socialAccountsService.deleteById(id, userId);
  }
}

