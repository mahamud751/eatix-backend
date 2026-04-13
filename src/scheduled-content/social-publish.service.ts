import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

const FB_GRAPH = 'https://graph.facebook.com/v21.0';
const TIKTOK_PUBLISH = 'https://open.tiktokapis.com/v2/post/publish/video/init/';
const YT_UPLOAD_INIT =
  'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const isIgTransientError = (msg: string) =>
  /not (?:ready|available)|try again|temporar|processing|container/i.test(
    String(msg || ''),
  );

@Injectable()
export class SocialPublishService {
  private readonly logger = new Logger(SocialPublishService.name);
  constructor(private readonly config: ConfigService) {}

  private async inspectPublicMediaUrl(url: string): Promise<{
    url: string;
    ok: boolean;
    status?: number;
    contentType?: string;
    contentLength?: string;
    reason?: string;
  }> {
    const u = String(url || '').trim();
    if (!/^https?:\/\//i.test(u)) {
      return { url: u, ok: false, reason: 'not-http-url' };
    }
    try {
      const headRes = await axios.head(u, {
        timeout: 10000,
        maxRedirects: 3,
        validateStatus: () => true,
      });
      const status = Number(headRes.status || 0);
      if (status >= 200 && status < 400) {
        return {
          url: u,
          ok: true,
          status,
          contentType: String(headRes.headers['content-type'] || ''),
          contentLength: String(headRes.headers['content-length'] || ''),
        };
      }
      return { url: u, ok: false, status, reason: 'head-non-success' };
    } catch {
      try {
        const getRes = await axios.get(u, {
          timeout: 12000,
          maxRedirects: 3,
          responseType: 'stream',
          validateStatus: () => true,
          headers: { Range: 'bytes=0-0' },
        });
        const status = Number(getRes.status || 0);
        const ok = status >= 200 && status < 400;
        return {
          url: u,
          ok,
          status,
          contentType: String(getRes.headers['content-type'] || ''),
          contentLength: String(getRes.headers['content-length'] || ''),
          ...(ok ? {} : { reason: 'range-get-non-success' }),
        };
      } catch (e: any) {
        return {
          url: u,
          ok: false,
          reason: String(e?.message || 'media-check-failed'),
        };
      }
    }
  }

  /**
   * Page post: image/link uses /feed. Video uses /videos + file_url so Facebook
   * ingests native video (not a link preview to the thumbnail).
   */
  async publishToFacebook(params: {
    pageId: string;
    pageAccessToken: string;
    message: string;
    mediaUrls?: string[];
    primaryMediaIsVideo?: boolean;
  }) {
    const {
      pageId,
      pageAccessToken,
      message,
      mediaUrls = [],
      primaryMediaIsVideo,
    } = params;
    const https = mediaUrls.filter(
      (u) => typeof u === 'string' && /^https?:\/\//i.test(u),
    );
    const videoUrl =
      https.find((u) => /\.(mp4|mov|webm)(\?|$)/i.test(u)) ||
      (primaryMediaIsVideo && https.length >= 2
        ? https[https.length - 1]
        : '');

    if (videoUrl) {
      const res = await axios.post(
        `${FB_GRAPH}/${encodeURIComponent(pageId)}/videos`,
        null,
        {
          params: {
            file_url: videoUrl,
            description: message,
            access_token: pageAccessToken,
          },
        },
      );
      return res.data;
    }

    const link =
      https.find((u) => !/\.(mp4|mov|webm)(\?|$)/i.test(u)) || https[0];
    const res = await axios.post(
      `${FB_GRAPH}/${encodeURIComponent(pageId)}/feed`,
      null,
      {
        params: {
          message,
          ...(link ? { link } : {}),
          access_token: pageAccessToken,
        },
      },
    );
    return res.data;
  }

  /** Instagram Business account id linked to a Facebook Page (same access token can publish). */
  async getInstagramBusinessAccountId(
    pageId: string,
    pageAccessToken: string,
  ): Promise<string | null> {
    const res = await axios.get(`${FB_GRAPH}/${encodeURIComponent(pageId)}`, {
      params: {
        fields: 'instagram_business_account',
        access_token: pageAccessToken,
      },
    });
    const id = res.data?.instagram_business_account?.id;
    return id != null ? String(id) : null;
  }

  /**
   * Publish single image or video to Instagram (Graph API).
   * Image: image_url + caption. Video: video_url + REELS + poll until FINISHED, then media_publish.
   */
  async publishToInstagram(params: {
    igUserId: string;
    accessToken: string;
    caption: string;
    mediaUrls: string[];
    isVideo: boolean;
  }) {
    const { igUserId, accessToken, caption, mediaUrls, isVideo } = params;
    const https = mediaUrls.filter(
      (u) => typeof u === 'string' && /^https?:\/\//i.test(u),
    );
    const videoUrl =
      https.find((u) => /\.(mp4|mov|webm)(\?|$)/i.test(u)) ||
      (isVideo ? https[https.length - 1] : undefined);
    const imageUrl =
      https.find((u) => !/\.(mp4|mov|webm)(\?|$)/i.test(u)) || https[0];

    if (videoUrl) {
      const info = await this.inspectPublicMediaUrl(videoUrl);
      if (!info.ok) {
        this.logger.warn(
          `Instagram video URL not reachable: ${info.url} reason=${info.reason || ''} status=${info.status || ''}`,
        );
      } else {
        this.logger.log(
          `Instagram video URL check ok: status=${info.status} type=${info.contentType || ''} len=${info.contentLength || ''}`,
        );
      }
    }
    if (imageUrl) {
      const info = await this.inspectPublicMediaUrl(imageUrl);
      if (!info.ok) {
        this.logger.warn(
          `Instagram image URL not reachable: ${info.url} reason=${info.reason || ''} status=${info.status || ''}`,
        );
      }
    }

    if (videoUrl && (isVideo || /\.(mp4|mov|webm)(\?|$)/i.test(videoUrl))) {
      try {
        const create = await axios.post(
          `${FB_GRAPH}/${encodeURIComponent(igUserId)}/media`,
          null,
          {
            params: {
              video_url: videoUrl,
              caption,
              media_type: 'REELS',
              access_token: accessToken,
            },
          },
        );
        const creationId = create.data?.id;
        if (!creationId) {
          throw new Error(
            create.data?.error?.message || 'Instagram video container failed',
          );
        }

        let lastCode = 'IN_PROGRESS';
        // Videos can take longer to process; wait up to ~6 minutes.
        for (let i = 0; i < 180; i++) {
          await sleep(2000);
          const st = await axios.get(
            `${FB_GRAPH}/${encodeURIComponent(creationId)}`,
            {
              params: {
                fields: 'status_code,status',
                access_token: accessToken,
              },
            },
          );
          const code = String(st.data?.status_code || '').toUpperCase();
          lastCode = code || lastCode;
          if (code === 'FINISHED') break;
          if (code === 'ERROR' || code === 'EXPIRED') {
            throw new Error(
              st.data?.status ||
                'Instagram rejected or failed processing video',
            );
          }
        }
        if (lastCode !== 'FINISHED') {
          throw new Error(
            'Instagram video still processing (timeout). Try a shorter/smaller video or re-run schedule.',
          );
        }

        let publishErr = '';
        for (let i = 0; i < 3; i++) {
          try {
            const pub = await axios.post(
              `${FB_GRAPH}/${encodeURIComponent(igUserId)}/media_publish`,
              null,
              {
                params: {
                  creation_id: creationId,
                  access_token: accessToken,
                },
              },
            );
            return pub.data;
          } catch (e: any) {
            const msg =
              e?.response?.data?.error?.message ||
              e?.response?.data?.message ||
              e?.message ||
              'Instagram media_publish failed';
            publishErr = String(msg);
            if (i < 2 && isIgTransientError(publishErr)) {
              await sleep(3000);
              continue;
            }
            throw new Error(publishErr);
          }
        }
        throw new Error(publishErr || 'Instagram media_publish failed');
      } catch (videoErr: any) {
        const videoMsg = String(videoErr?.message || 'Instagram video failed');
        this.logger.warn(`Instagram video publish failed: ${videoMsg}`);
        if (imageUrl) {
          this.logger.warn(
            'Instagram fallback: trying image publish from thumbnail URL',
          );
          try {
            const createImage = await axios.post(
              `${FB_GRAPH}/${encodeURIComponent(igUserId)}/media`,
              null,
              {
                params: {
                  image_url: imageUrl,
                  caption,
                  access_token: accessToken,
                },
              },
            );
            const imageCreationId = createImage.data?.id;
            if (!imageCreationId) {
              throw new Error(
                createImage.data?.error?.message ||
                  `Instagram video failed (${videoMsg}) and image fallback container failed`,
              );
            }
            const pubImage = await axios.post(
              `${FB_GRAPH}/${encodeURIComponent(igUserId)}/media_publish`,
              null,
              {
                params: {
                  creation_id: imageCreationId,
                  access_token: accessToken,
                },
              },
            );
            return {
              ...(pubImage.data || {}),
              fallback: 'image',
              fallbackReason: videoMsg,
            };
          } catch (imageErr: any) {
            const imageMsg = String(
              imageErr?.response?.data?.error?.message ||
                imageErr?.message ||
                'Instagram image fallback failed',
            );
            throw new Error(
              `Instagram video failed (${videoMsg}); image fallback failed (${imageMsg})`,
            );
          }
        }
        throw videoErr;
      }
    }

    if (!imageUrl) {
      throw new Error('Instagram needs a public https image or video URL');
    }
    const create = await axios.post(
      `${FB_GRAPH}/${encodeURIComponent(igUserId)}/media`,
      null,
      {
        params: {
          image_url: imageUrl,
          caption,
          access_token: accessToken,
        },
      },
    );
    const creationId = create.data?.id;
    if (!creationId) {
      throw new Error(
        create.data?.error?.message || 'Instagram image container failed',
      );
    }
    const pub = await axios.post(
      `${FB_GRAPH}/${encodeURIComponent(igUserId)}/media_publish`,
      null,
      {
        params: {
          creation_id: creationId,
          access_token: accessToken,
        },
      },
    );
    return pub.data;
  }

  /**
   * TikTok Direct Post — PULL_FROM_URL. Requires user token with video.publish;
   * video URL domain may need verification in TikTok Developer Portal.
   */
  async publishToTikTokPullFromUrl(params: {
    accessToken: string;
    videoUrl: string;
    title: string;
  }) {
    const body = {
      post_info: {
        title: params.title.slice(0, 2200),
        privacy_level: 'SELF_ONLY',
        disable_duet: false,
        disable_stitch: false,
        disable_comment: false,
        brand_content_toggle: false,
        brand_organic_toggle: false,
      },
      source_info: {
        source: 'PULL_FROM_URL',
        video_url: params.videoUrl,
      },
    };
    const res = await axios.post(TIKTOK_PUBLISH, body, {
      headers: {
        Authorization: `Bearer ${params.accessToken}`,
        'Content-Type': 'application/json; charset=UTF-8',
      },
    });
    const err = res.data?.error;
    if (err?.code && err.code !== 'ok') {
      throw new Error(err.message || String(err.code));
    }
    return res.data?.data ?? res.data;
  }

  /**
   * Prefer refresh_token when Google client credentials are configured.
   */
  async getValidYouTubeAccessToken(account: {
    accessToken: string;
    refreshToken?: string | null;
  }): Promise<string> {
    const rt = String(account.refreshToken || '').trim();
    const clientId = this.config.get<string>('GOOGLE_CLIENT_ID')?.trim();
    const clientSecret = this.config.get<string>('GOOGLE_CLIENT_SECRET')?.trim();
    this.logger.log(
      `YouTube token refresh: hasRefresh=${!!rt} hasClientId=${!!clientId} hasClientSecret=${!!clientSecret}`,
    );
    if (rt && clientId && clientSecret) {
      try {
        const r = await axios.post(
          'https://oauth2.googleapis.com/token',
          new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            refresh_token: rt,
            grant_type: 'refresh_token',
          }).toString(),
          {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          },
        );
        const at = r.data?.access_token;
        if (at) {
          this.logger.log('YouTube token refresh succeeded');
          return String(at);
        }
        this.logger.warn('YouTube token refresh returned no access_token');
      } catch (e: any) {
        const errData = e?.response?.data;
        this.logger.error(
          `YouTube token refresh failed: ${JSON.stringify(errData) || e?.message}`,
        );
        /* fall back to stored access token */
      }
    }
    this.logger.log('Using stored YouTube access token (may be expired)');
    return String(account.accessToken || '');
  }

  /**
   * Resumable upload: download public video URL then videos.insert.
   */
  async publishToYouTubeVideo(params: {
    accessToken: string;
    title: string;
    description: string;
    videoUrl: string;
  }) {
    const videoResp = await axios.get(params.videoUrl, {
      responseType: 'arraybuffer',
      maxContentLength: 512 * 1024 * 1024,
      maxBodyLength: 512 * 1024 * 1024,
      timeout: 300_000,
      validateStatus: (s) => s >= 200 && s < 400,
    });
    if (videoResp.status >= 400) {
      throw new Error(
        `Could not download video for YouTube (${videoResp.status})`,
      );
    }
    const buf = Buffer.from(videoResp.data as ArrayBuffer);
    if (!buf.length) {
      throw new Error('Empty video buffer for YouTube upload');
    }
    const meta = {
      snippet: {
        title: String(params.title || 'Post').slice(0, 100),
        description: String(params.description || '').slice(0, 5000),
        categoryId: '22',
      },
      status: {
        privacyStatus: 'public',
        selfDeclaredMadeForKids: false,
      },
    };
    const init = await axios.post(YT_UPLOAD_INIT, meta, {
      headers: {
        Authorization: `Bearer ${params.accessToken}`,
        'Content-Type': 'application/json; charset=UTF-8',
        'X-Upload-Content-Length': String(buf.length),
        'X-Upload-Content-Type': 'video/mp4',
      },
      maxRedirects: 0,
      validateStatus: (s) => s === 200 || s === 308,
    });
    const uploadUrl =
      (init.headers['location'] as string | undefined) ||
      (init.headers['Location'] as string | undefined);
    if (!uploadUrl) {
      const err = (init.data as any)?.error?.message;
      throw new Error(
        err || `YouTube resumable init failed (HTTP ${init.status})`,
      );
    }
    const put = await axios.put(uploadUrl, buf, {
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Length': buf.length,
      },
      maxBodyLength: buf.length + 1024,
      maxContentLength: buf.length + 1024,
      timeout: 600_000,
    });
    return put.data;
  }
}
