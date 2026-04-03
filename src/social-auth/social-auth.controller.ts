import { Controller, Get, Query } from '@nestjs/common';
import { SocialAuthService } from './social-auth.service';

@Controller('social-auth')
export class SocialAuthController {
  constructor(private readonly socialAuthService: SocialAuthService) {}

  @Get('facebook/connect')
  facebookConnect(@Query('userId') userId: string) {
    return this.socialAuthService.getFacebookConnectUrl(userId);
  }

  @Get('facebook/callback')
  facebookCallback(
    @Query('code') code: string,
    @Query('state') state: string,
  ) {
    return this.socialAuthService.handleFacebookCallback(code, state);
  }
}

