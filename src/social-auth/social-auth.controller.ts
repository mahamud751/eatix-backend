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

  @Get('tiktok/connect')
  tiktokConnect(@Query('userId') userId: string) {
    return this.socialAuthService.getTikTokConnectUrl(userId);
  }

  @Get('tiktok/callback')
  tiktokCallback(
    @Query('code') code: string,
    @Query('state') state: string,
  ) {
    return this.socialAuthService.handleTikTokCallback(code, state);
  }

  @Get('youtube/connect')
  youtubeConnect(@Query('userId') userId: string) {
    return this.socialAuthService.getYouTubeConnectUrl(userId);
  }

  @Get('youtube/callback')
  youtubeCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') error: string,
    @Query('error_description') errorDescription: string,
  ) {
    if (error) {
      return {
        success: false,
        error: error,
        message: errorDescription || 'YouTube authorization was denied or failed',
      };
    }
    if (!code) {
      return {
        success: false,
        error: 'no_code',
        message: 'YouTube did not return an authorization code. This usually means the redirect URI is not whitelisted in Google Cloud Console. Add: https://eatixapi.pino7.com/v1/social-auth/youtube/callback',
      };
    }
    return this.socialAuthService.handleYouTubeCallback(code, state);
  }
}

