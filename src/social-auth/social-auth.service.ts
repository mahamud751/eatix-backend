import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { SocialAccountsService } from '../social-accounts/social-accounts.service';

@Injectable()
export class SocialAuthService {
  constructor(
    private readonly config: ConfigService,
    private readonly socialAccountsService: SocialAccountsService,
  ) {}

  getFacebookConnectUrl(userId: string) {
    if (!userId) throw new BadRequestException('userId is required');
    const appId = this.config.get<string>('FACEBOOK_APP_ID');
    const appUrl =
      this.config.get<string>('APP_URL') || 'http://localhost:3000/v1';
    if (!appId) {
      throw new BadRequestException('FACEBOOK_APP_ID is not configured');
    }
    const redirectUri = `${appUrl}/social-auth/facebook/callback`;
    const state = encodeURIComponent(JSON.stringify({ userId }));
    const scopes = encodeURIComponent(
      'public_profile,email,pages_show_list,pages_read_engagement,pages_manage_posts',
    );
    const url =
      `https://www.facebook.com/v18.0/dialog/oauth?client_id=${encodeURIComponent(
        appId,
      )}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&state=${state}` +
      `&response_type=code` +
      `&scope=${scopes}`;
    return { url };
  }

  async handleFacebookCallback(code: string, state: string) {
    if (!code) throw new BadRequestException('code is required');
    const appId = this.config.get<string>('FACEBOOK_APP_ID');
    const appSecret = this.config.get<string>('FACEBOOK_APP_SECRET');
    const appUrl =
      this.config.get<string>('APP_URL') || 'http://localhost:3000/v1';
    if (!appId || !appSecret) {
      throw new BadRequestException(
        'FACEBOOK_APP_ID / FACEBOOK_APP_SECRET not configured',
      );
    }
    const redirectUri = `${appUrl}/social-auth/facebook/callback`;
    let parsedState: { userId?: string } = {};
    try {
      parsedState = JSON.parse(decodeURIComponent(state || '{}'));
    } catch {
      parsedState = {};
    }
    const userId = parsedState.userId;
    if (!userId) throw new BadRequestException('Invalid state/userId');

    const tokenRes = await axios.get(
      'https://graph.facebook.com/v18.0/oauth/access_token',
      {
        params: {
          client_id: appId,
          client_secret: appSecret,
          redirect_uri: redirectUri,
          code,
        },
      },
    );
    const userAccessToken = tokenRes?.data?.access_token;
    if (!userAccessToken) {
      throw new BadRequestException('Could not retrieve Facebook access token');
    }

    const pagesRes = await axios.get('https://graph.facebook.com/v18.0/me/accounts', {
      params: { access_token: userAccessToken },
    });
    const pages = Array.isArray(pagesRes?.data?.data) ? pagesRes.data.data : [];

    const saved: unknown[] = [];
    for (const p of pages) {
      const pageId = String(p?.id || '').trim();
      const pageToken = String(p?.access_token || '').trim();
      if (!pageId || !pageToken) continue;
      const row = await this.socialAccountsService.upsertFacebookPage({
        userId,
        pageId,
        pageName: p?.name,
        pageAccessToken: pageToken,
        metadata: {
          category: p?.category,
          taskCount: Array.isArray(p?.tasks) ? p.tasks.length : 0,
        },
      });
      saved.push(row);
    }

    return {
      message: 'Facebook connected successfully',
      savedCount: saved.length,
      accounts: saved,
    };
  }
}

