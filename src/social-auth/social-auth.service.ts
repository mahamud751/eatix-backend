import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { SocialAccountsService } from '../social-accounts/social-accounts.service';

/** Match savasschi-backend social-auth; Graph dialog + token + /me/accounts use same version. */
const FB_GRAPH_VERSION = 'v21.0';

/**
 * Core Facebook Login scopes (Pages). See Pages use case in App Dashboard.
 * Instagram scopes are INVALID until you add the Instagram product and those
 * permissions to the app — see getFacebookLoginScopes().
 */
const FB_LOGIN_SCOPES_CORE =
  'public_profile,business_management,pages_show_list,pages_read_engagement,pages_manage_posts';
/** Default when FACEBOOK_ENABLE_INSTAGRAM_LOGIN=true; override with FACEBOOK_INSTAGRAM_LOGIN_SCOPES. */
const FB_LOGIN_SCOPES_INSTAGRAM_DEFAULT =
  'instagram_basic,instagram_content_publish';

@Injectable()
export class SocialAuthService {
  private readonly logger = new Logger(SocialAuthService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly socialAccountsService: SocialAccountsService,
  ) {}

  /**
   * - FACEBOOK_LOGIN_SCOPES=... — replaces entire scope list if set.
   * - Else Pages core + Instagram only when FACEBOOK_ENABLE_INSTAGRAM_LOGIN=true.
   * - Instagram part: FACEBOOK_INSTAGRAM_LOGIN_SCOPES or default instagram_basic,instagram_content_publish.
   *   Some Meta apps need: instagram_business_basic,instagram_business_content_publish
   *   (match what “Permissions and features” lists for your use case).
   */
  private getFacebookLoginScopes(): string {
    const full = this.config.get<string>('FACEBOOK_LOGIN_SCOPES')?.trim();
    if (full) return full;
    const enableIg =
      String(
        this.config.get<string>('FACEBOOK_ENABLE_INSTAGRAM_LOGIN') ?? '',
      ).toLowerCase() === 'true';
    if (!enableIg) {
      return FB_LOGIN_SCOPES_CORE;
    }
    const igCustom = this.config
      .get<string>('FACEBOOK_INSTAGRAM_LOGIN_SCOPES')
      ?.trim();
    const igPart = igCustom || FB_LOGIN_SCOPES_INSTAGRAM_DEFAULT;
    return `${FB_LOGIN_SCOPES_CORE},${igPart}`;
  }

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
    const scopes = encodeURIComponent(this.getFacebookLoginScopes());
    const url =
      `https://www.facebook.com/${FB_GRAPH_VERSION}/dialog/oauth?client_id=${encodeURIComponent(
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
      `https://graph.facebook.com/${FB_GRAPH_VERSION}/oauth/access_token`,
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

    const pagesRes = await axios.get(
      `https://graph.facebook.com/${FB_GRAPH_VERSION}/me/accounts`,
      {
        params: { access_token: userAccessToken },
      },
    );
    const pages = Array.isArray(pagesRes?.data?.data) ? pagesRes.data.data : [];

    const saved: unknown[] = [];
    let instagramSynced = 0;
    const instagramSyncByPage: Array<{
      pageId: string;
      pageName?: string;
      linked: boolean;
      instagramUsername?: string;
      /** Why `linked` is false — Graph error text or setup hint. */
      detail?: string;
    }> = [];

    for (const p of pages) {
      const pageId = String(p?.id || '').trim();
      const pageToken = String(p?.access_token || '').trim();
      if (!pageId || !pageToken) continue;
      const pageName = p?.name ? String(p.name) : undefined;
      const row = await this.socialAccountsService.upsertFacebookPage({
        userId,
        pageId,
        pageName,
        pageAccessToken: pageToken,
        metadata: {
          category: p?.category,
          taskCount: Array.isArray(p?.tasks) ? p.tasks.length : 0,
        },
      });
      saved.push(row);
      try {
        const igRes = await axios.get(
          `https://graph.facebook.com/${FB_GRAPH_VERSION}/${encodeURIComponent(pageId)}`,
          {
            params: {
              fields: 'instagram_business_account{id,username}',
              access_token: pageToken,
            },
          },
        );
        const ig = igRes.data?.instagram_business_account;
        if (ig?.id) {
          await this.socialAccountsService.upsertInstagramFromPage({
            userId,
            instagramUserId: String(ig.id),
            instagramUsername: ig.username
              ? String(ig.username)
              : undefined,
            pageAccessToken: pageToken,
            linkedPageId: pageId,
          });
          instagramSynced += 1;
          instagramSyncByPage.push({
            pageId,
            pageName,
            linked: true,
            instagramUsername: ig.username
              ? String(ig.username)
              : undefined,
          });
        } else {
          instagramSyncByPage.push({
            pageId,
            pageName,
            linked: false,
            detail:
              'No Instagram Business/Creator linked to this Facebook Page. In Meta Business Suite (or Page Settings → Instagram), connect an Instagram professional account to this Page, then run Verify Facebook again.',
          });
        }
      } catch (e: any) {
        const err = e?.response?.data?.error;
        const msg = err?.message || e?.message || 'Graph API error';
        this.logger.warn(
          `Instagram discovery failed for page ${pageId}: ${msg} (code=${err?.code})`,
        );
        instagramSyncByPage.push({
          pageId,
          pageName,
          linked: false,
          detail: msg,
        });
      }
    }

    return {
      message: 'Facebook connected successfully',
      savedCount: saved.length,
      instagramBusinessAccountsSynced: instagramSynced,
      instagramSyncByPage,
      accounts: saved,
    };
  }

  getTikTokConnectUrl(userId: string) {
    if (!userId) throw new BadRequestException('userId is required');
    const clientKey = this.config.get<string>('TIKTOK_CLIENT_KEY');
    const appUrl =
      this.config.get<string>('APP_URL') || 'http://localhost:3000/v1';
    if (!clientKey) {
      throw new BadRequestException('TIKTOK_CLIENT_KEY is not configured');
    }
    const redirectUri = `${appUrl}/social-auth/tiktok/callback`;
    const state = encodeURIComponent(JSON.stringify({ userId }));
    const scope = encodeURIComponent(
      'user.info.basic,user.info.profile,video.publish',
    );
    const url =
      `https://www.tiktok.com/v2/auth/authorize/?client_key=${encodeURIComponent(clientKey)}` +
      `&response_type=code&scope=${scope}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&state=${state}`;
    return { url };
  }

  async handleTikTokCallback(code: string, state: string) {
    if (!code) throw new BadRequestException('code is required');
    const clientKey = this.config.get<string>('TIKTOK_CLIENT_KEY');
    const clientSecret = this.config.get<string>('TIKTOK_CLIENT_SECRET');
    const appUrl =
      this.config.get<string>('APP_URL') || 'http://localhost:3000/v1';
    if (!clientKey || !clientSecret) {
      throw new BadRequestException(
        'TIKTOK_CLIENT_KEY / TIKTOK_CLIENT_SECRET not configured',
      );
    }
    const redirectUri = `${appUrl}/social-auth/tiktok/callback`;
    let parsedState: { userId?: string } = {};
    try {
      parsedState = JSON.parse(decodeURIComponent(state || '{}'));
    } catch {
      parsedState = {};
    }
    const userId = parsedState.userId;
    if (!userId) throw new BadRequestException('Invalid state/userId');

    const body = new URLSearchParams({
      client_key: clientKey,
      client_secret: clientSecret,
      code,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
    });
    let tokenRes: { data?: Record<string, unknown> };
    try {
      tokenRes = await axios.post(
        'https://open.tiktokapis.com/v2/oauth/token/',
        body.toString(),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        },
      );
    } catch (e: any) {
      const d = e?.response?.data;
      throw new BadRequestException(
        String(
          d?.error_description ||
            d?.error ||
            d?.message ||
            e?.message ||
            'TikTok token exchange failed',
        ),
      );
    }
    const raw = tokenRes.data || {};
    const td = (raw as any).data ?? raw;
    const accessToken = (td as any)?.access_token;
    const refreshToken = (td as any)?.refresh_token;
    const openId = (td as any)?.open_id;
    if (!accessToken || !openId) {
      throw new BadRequestException(
        String(
          (raw as any).error_description ||
            (raw as any).error ||
            (raw as any).message ||
            'Could not retrieve TikTok tokens',
        ),
      );
    }

    let displayName: string | undefined;
    try {
      const userRes = await axios.post(
        'https://open.tiktokapis.com/v2/user/info/',
        { fields: ['open_id', 'display_name', 'avatar_url'] },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        },
      );
      const u = userRes.data?.data?.user ?? userRes.data?.user;
      if (u?.display_name) displayName = String(u.display_name);
    } catch {
      /* optional */
    }

    const row = await this.socialAccountsService.upsertTikTokAccount({
      userId,
      openId: String(openId),
      displayName,
      accessToken: String(accessToken),
      refreshToken: refreshToken ? String(refreshToken) : undefined,
      metadata: { scope: td?.scope },
    });

    return {
      message: 'TikTok connected successfully',
      account: row,
    };
  }

  private getYouTubeOAuthScopes(): string {
    const custom = this.config.get<string>('GOOGLE_YOUTUBE_SCOPES')?.trim();
    if (custom) return custom;
    return [
      'https://www.googleapis.com/auth/youtube.readonly',
      'https://www.googleapis.com/auth/youtube.upload',
    ].join(' ');
  }

  getYouTubeConnectUrl(userId: string) {
    if (!userId) throw new BadRequestException('userId is required');
    const clientId = this.config.get<string>('GOOGLE_CLIENT_ID');
    const appUrl =
      this.config.get<string>('APP_URL') || 'http://localhost:3000/v1';
    if (!clientId) {
      throw new BadRequestException('GOOGLE_CLIENT_ID is not configured');
    }
    const redirectUri = `${appUrl}/social-auth/youtube/callback`;
    const state = encodeURIComponent(JSON.stringify({ userId }));
    const scope = encodeURIComponent(this.getYouTubeOAuthScopes());
    const url =
      `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(
        clientId,
      )}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&response_type=code` +
      `&scope=${scope}` +
      `&state=${state}` +
      `&access_type=offline` +
      `&prompt=consent`;
    return { url };
  }

  async handleYouTubeCallback(code: string, state: string) {
    if (!code) throw new BadRequestException('code is required');
    const clientId = this.config.get<string>('GOOGLE_CLIENT_ID');
    const clientSecret = this.config.get<string>('GOOGLE_CLIENT_SECRET');
    const appUrl =
      this.config.get<string>('APP_URL') || 'http://localhost:3000/v1';
    if (!clientId || !clientSecret) {
      throw new BadRequestException(
        'GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET not configured',
      );
    }
    const redirectUri = `${appUrl}/social-auth/youtube/callback`;
    let parsedState: { userId?: string } = {};
    try {
      parsedState = JSON.parse(decodeURIComponent(state || '{}'));
    } catch {
      parsedState = {};
    }
    const userId = parsedState.userId;
    if (!userId) throw new BadRequestException('Invalid state/userId');

    let tokenRes: { data?: Record<string, unknown> };
    try {
      tokenRes = await axios.post(
        'https://oauth2.googleapis.com/token',
        new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          code,
          grant_type: 'authorization_code',
          redirect_uri: redirectUri,
        }).toString(),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
      );
    } catch (e: any) {
      const d = e?.response?.data;
      throw new BadRequestException(
        String(
          d?.error_description ||
            d?.error ||
            e?.message ||
            'Google token exchange failed',
        ),
      );
    }
    const accessToken = String(tokenRes.data?.access_token || '');
    const refreshToken = tokenRes.data?.refresh_token
      ? String(tokenRes.data.refresh_token)
      : '';
    if (!accessToken) {
      throw new BadRequestException('Could not retrieve Google access token');
    }

    let channelsRes: { data?: { items?: Array<{ id?: string; snippet?: { title?: string } }> } };
    try {
      channelsRes = await axios.get(
        'https://www.googleapis.com/youtube/v3/channels',
        {
          params: { part: 'snippet', mine: true },
          headers: { Authorization: `Bearer ${accessToken}` },
        },
      );
    } catch (e: any) {
      const err = e?.response?.data?.error;
      throw new BadRequestException(
        String(err?.message || e?.message || 'YouTube channels.list failed'),
      );
    }
    const items = Array.isArray(channelsRes.data?.items)
      ? channelsRes.data!.items!
      : [];
    if (items.length === 0) {
      throw new BadRequestException(
        'No YouTube channel found for this Google account. Create a channel first.',
      );
    }

    const saved: unknown[] = [];
    for (const ch of items) {
      const channelId = String(ch?.id || '').trim();
      if (!channelId) continue;
      const title = ch?.snippet?.title
        ? String(ch.snippet.title)
        : undefined;
      const row = await this.socialAccountsService.upsertYouTubeChannel({
        userId,
        channelId,
        channelTitle: title,
        accessToken,
        refreshToken: refreshToken || undefined,
        metadata: {
          scope: tokenRes.data?.scope,
          tokenType: tokenRes.data?.token_type,
        },
      });
      saved.push(row);
    }

    return {
      message: 'YouTube connected successfully',
      savedCount: saved.length,
      accounts: saved,
    };
  }
}

