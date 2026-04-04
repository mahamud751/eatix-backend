import { Injectable } from '@nestjs/common';
import axios from 'axios';

const FB_GRAPH = 'https://graph.facebook.com/v21.0';
const TIKTOK_PUBLISH = 'https://open.tiktokapis.com/v2/post/publish/video/init/';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

@Injectable()
export class SocialPublishService {

  async publishToFacebook(params: {
    pageId: string;
    pageAccessToken: string;
    message: string;
    mediaUrls?: string[];
  }) {
    const { pageId, pageAccessToken, message, mediaUrls = [] } = params;
    const link = mediaUrls.find(Boolean);
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
    const imageUrl = https[0];

    if (videoUrl && (isVideo || /\.(mp4|mov|webm)(\?|$)/i.test(videoUrl))) {
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
      for (let i = 0; i < 36; i++) {
        await sleep(2000);
        const st = await axios.get(
          `${FB_GRAPH}/${encodeURIComponent(creationId)}`,
          {
            params: {
              fields: 'status_code',
              access_token: accessToken,
            },
          },
        );
        const code = st.data?.status_code;
        if (code === 'FINISHED') break;
        if (code === 'ERROR') {
          throw new Error(
            st.data?.status || 'Instagram rejected or failed processing video',
          );
        }
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
}
