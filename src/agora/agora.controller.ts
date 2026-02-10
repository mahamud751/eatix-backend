import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { AgoraService } from './agora.service';

@Controller('agora')
export class AgoraController {
  constructor(private readonly agoraService: AgoraService) {}

  /**
   * Generate RTC token for video/audio calls (POST version for mobile apps)
   * POST /agora/generate-rtc-token
   * Body: { channelName: "meeting123", uid: 12345 }
   */
  @Post('generate-rtc-token')
  generateRTCTokenPost(
    @Body('channelName') channelName: string,
    @Body('uid') uid?: number,
    @Body('expirationTime') expirationTime?: number,
  ) {
    try {
      if (!channelName) {
        throw new HttpException(
          'Channel name is required',
          HttpStatus.BAD_REQUEST,
        );
      }

      const uidNumber = uid ? Number(uid) : 0;
      const expiration = expirationTime ? Number(expirationTime) : 86400;

      const result = this.agoraService.generateRTCToken(
        channelName,
        uidNumber,
        undefined,
        expiration,
      );

      return result; // Return directly for easier frontend consumption
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to generate RTC token',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Generate RTC token for video/audio calls
   * GET /agora/rtc-token?channelName=meeting123&uid=12345
   */
  @Get('rtc-token')
  generateRTCToken(
    @Query('channelName') channelName: string,
    @Query('uid') uid?: number,
    @Query('expirationTime') expirationTime?: number,
  ) {
    try {
      if (!channelName) {
        throw new HttpException(
          'Channel name is required',
          HttpStatus.BAD_REQUEST,
        );
      }

      const uidNumber = uid ? Number(uid) : 0;
      const expiration = expirationTime ? Number(expirationTime) : 86400;

      const result = this.agoraService.generateRTCToken(
        channelName,
        uidNumber,
        undefined,
        expiration,
      );

      return {
        success: true,
        data: result,
        message: 'RTC token generated successfully',
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to generate RTC token',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Generate RTM token for real-time messaging (POST version for mobile apps)
   * POST /agora/generate-rtm-token
   * Body: { userId: "user123" }
   */
  @Post('generate-rtm-token')
  generateRTMTokenPost(
    @Body('userId') userId: string,
    @Body('expirationTime') expirationTime?: number,
  ) {
    try {
      // Validate env are set to avoid generating invalid tokens
      if (
        !process.env.AGORA_APP_ID ||
        !process.env.AGORA_APP_CERTIFICATE ||
        process.env.AGORA_APP_ID === 'YOUR_AGORA_APP_ID' ||
        process.env.AGORA_APP_CERTIFICATE === 'YOUR_AGORA_APP_CERTIFICATE'
      ) {
        throw new HttpException(
          'Agora credentials not configured on server',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      if (!userId) {
        throw new HttpException('User ID is required', HttpStatus.BAD_REQUEST);
      }

      const expiration = expirationTime ? Number(expirationTime) : 86400;

      const result = this.agoraService.generateRTMToken(userId, expiration);

      return result; // Return directly for easier frontend consumption
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to generate RTM token',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Generate RTM token for real-time messaging
   * GET /agora/rtm-token?userId=user123
   */
  @Get('rtm-token')
  generateRTMToken(
    @Query('userId') userId: string,
    @Query('expirationTime') expirationTime?: number,
  ) {
    try {
      // Validate env are set to avoid generating invalid tokens
      if (
        !process.env.AGORA_APP_ID ||
        !process.env.AGORA_APP_CERTIFICATE ||
        process.env.AGORA_APP_ID === 'YOUR_AGORA_APP_ID' ||
        process.env.AGORA_APP_CERTIFICATE === 'YOUR_AGORA_APP_CERTIFICATE'
      ) {
        throw new HttpException(
          'Agora credentials not configured on server',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      if (!userId) {
        throw new HttpException('User ID is required', HttpStatus.BAD_REQUEST);
      }

      const expiration = expirationTime ? Number(expirationTime) : 86400;

      const result = this.agoraService.generateRTMToken(userId, expiration);

      return {
        success: true,
        data: result,
        message: 'RTM token generated successfully',
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to generate RTM token',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Generate both RTC and RTM tokens
   * POST /agora/generate-tokens
   * Body: { channelName: "meeting123", userId: "user123", uid: 12345 }
   */
  @Post('generate-tokens')
  generateTokensPost(
    @Body('channelName') channelName: string,
    @Body('userId') userId: string,
    @Body('uid') uid?: number,
    @Body('expirationTime') expirationTime?: number,
  ) {
    try {
      if (!channelName || !userId) {
        throw new HttpException(
          'Channel name and user ID are required',
          HttpStatus.BAD_REQUEST,
        );
      }

      const uidNumber = uid ? Number(uid) : 0;
      const expiration = expirationTime ? Number(expirationTime) : 86400;

      const result = this.agoraService.generateTokens(
        channelName,
        userId,
        uidNumber,
        expiration,
      );

      return result; // Return directly for easier frontend consumption
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to generate tokens',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Generate both RTC and RTM tokens (Legacy endpoint)
   * POST /agora/tokens
   * Body: { channelName: "meeting123", userId: "user123", uid: 12345 }
   */
  @Post('tokens')
  generateTokens(
    @Body('channelName') channelName: string,
    @Body('userId') userId: string,
    @Body('uid') uid?: number,
    @Body('expirationTime') expirationTime?: number,
  ) {
    try {
      if (!channelName || !userId) {
        throw new HttpException(
          'Channel name and user ID are required',
          HttpStatus.BAD_REQUEST,
        );
      }

      const uidNumber = uid ? Number(uid) : 0;
      const expiration = expirationTime ? Number(expirationTime) : 86400;

      const result = this.agoraService.generateTokens(
        channelName,
        userId,
        uidNumber,
        expiration,
      );

      return {
        success: true,
        data: result,
        message: 'Tokens generated successfully',
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to generate tokens',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Broadcast meeting link to all users or specific group
   * POST /agora/broadcast-meeting
   */
  @Post('broadcast-meeting')
  async broadcastMeeting(@Body() data: any) {
    try {
      return await this.agoraService.broadcastMeeting(data);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to broadcast meeting',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
