import { Injectable, forwardRef, Inject } from '@nestjs/common';
import {
  RtcTokenBuilder,
  RtmTokenBuilder,
  RtcRole,
  RtmRole,
} from 'agora-access-token';
import { NotificationService } from '../notification/notification.service';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const {
  AccessToken,
  priviledges,
} = require('agora-access-token/src/AccessToken');

@Injectable()
export class AgoraService {
  // Get these from environment variables or config
  private readonly appId = process.env.AGORA_APP_ID || 'YOUR_AGORA_APP_ID';
  private readonly appCertificate =
    process.env.AGORA_APP_CERTIFICATE || 'YOUR_AGORA_APP_CERTIFICATE';

  constructor(
    @Inject(forwardRef(() => NotificationService))
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * Generate RTC Token for Video/Audio calls
   * @param channelName - Channel name
   * @param uid - User ID (0 for auto-generated)
   * @param role - User role (1 = Publisher, 2 = Subscriber)
   * @param expirationTimeInSeconds - Token expiration time (default: 24 hours)
   */
  generateRTCToken(
    channelName: string,
    uid: number = 0,
    role: number = RtcRole.PUBLISHER,
    expirationTimeInSeconds: number = 86400,
  ): { token: string; appId: string } {
    try {
      const currentTimestamp = Math.floor(Date.now() / 1000);
      const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

      // Build RTC token
      const token = RtcTokenBuilder.buildTokenWithUid(
        this.appId,
        this.appCertificate,
        channelName,
        uid,
        role,
        privilegeExpiredTs,
      );

      return {
        token,
        appId: this.appId,
      };
    } catch (error) {
      console.error('Error generating RTC token:', error);
      throw error;
    }
  }

  /**
   * Generate RTM Token for Real-Time Messaging
   * Using RTM 1.x token builder which is more stable
   * @param userId - User ID
   * @param expirationTimeInSeconds - Token expiration time (default: 24 hours)
   */
  generateRTMToken(
    userId: string,
    expirationTimeInSeconds: number = 86400,
  ): { token: string; appId: string } {
    try {
      if (
        !this.appId ||
        !this.appCertificate ||
        this.appId === 'YOUR_AGORA_APP_ID' ||
        this.appCertificate === 'YOUR_AGORA_APP_CERTIFICATE'
      ) {
        throw new Error(
          'Agora credentials are not set. Please configure AGORA_APP_ID and AGORA_APP_CERTIFICATE environment variables.',
        );
      }

      const currentTimestamp = Math.floor(Date.now() / 1000);
      const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

      // Generate RTM 2.x compatible token
      // RTM 2.x uses RTC token structure (AccessToken)
      // We use userId as channelName to ensure it's not empty
      // We use userId as uid (account) to match the client's userId
      const key = new AccessToken(
        this.appId,
        this.appCertificate,
        userId, // channelName
        userId, // uid (account)
      );

      // Add RTM login privilege (kRtmLogin = 1000)
      // The library has a typo: priviledges
      key.addPriviledge(priviledges.kRtmLogin, privilegeExpiredTs);

      const token = key.build();

      console.log(`Generated RTM token for user: ${userId}`);

      return {
        token,
        appId: this.appId,
      };
    } catch (error) {
      console.error('Error generating RTM token:', error);
      throw error;
    }
  }

  /**
   * Generate both RTC and RTM tokens
   */
  generateTokens(
    channelName: string,
    userId: string,
    uid: number = 0,
    expirationTimeInSeconds: number = 86400,
  ): {
    rtcToken: { token: string; appId: string };
    rtmToken: { token: string; appId: string };
  } {
    const rtcToken = this.generateRTCToken(
      channelName,
      uid,
      RtcRole.PUBLISHER,
      expirationTimeInSeconds,
    );
    const rtmToken = this.generateRTMToken(userId, expirationTimeInSeconds);

    return {
      rtcToken,
      rtmToken,
    };
  }

  /**
   * Broadcast meeting link to all users or specific group
   */
  async broadcastMeeting(data: {
    channelName: string;
    title: string;
    creatorName: string;
    meetingLink: string;
    companyId?: string;
  }) {
    try {
      await this.notificationService.createNotification({
        message: `${data.creatorName} started a new meeting: ${data.title}. Click to join.`,
        type: 'meeting_started',
        companyId: data.companyId,
        contentId: data.channelName, // Reuse contentId for channelName
      });

      return { success: true };
    } catch (error) {
      console.error('Error broadcasting meeting:', error);
      throw error;
    }
  }
}
