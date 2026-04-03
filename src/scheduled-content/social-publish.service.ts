import { Injectable } from '@nestjs/common';
import axios from 'axios';

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
      `https://graph.facebook.com/v18.0/${encodeURIComponent(pageId)}/feed`,
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
}

