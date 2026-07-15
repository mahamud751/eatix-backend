import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Query,
  Param,
  Headers,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import * as jwt from 'jsonwebtoken';
import { PlaylistService } from './playlist.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../users/dto/currentUser';

@ApiTags('playlists')
@Controller('playlists')
export class PlaylistController {
  constructor(private readonly playlistService: PlaylistService) {}

  private optionalViewerId(auth?: string): string | undefined {
    if (!auth?.startsWith('Bearer ')) return undefined;
    const secret = process.env.JWT_SECRET;
    if (!secret) return undefined;
    try {
      const p = jwt.verify(auth.slice(7), secret) as { sub?: string };
      return p?.sub;
    } catch {
      return undefined;
    }
  }

  @Get('status')
  @ApiOperation({ summary: 'Get playlist status for a video/short' })
  @ApiResponse({ status: 200, description: 'Status retrieved' })
  async getStatus(
    @Query('userId') userId: string,
    @Query('contentType') contentType: 'video' | 'short',
    @Query('contentId') contentId: string,
  ) {
    if (!userId || !contentType || !contentId) {
      throw new BadRequestException('userId, contentType, and contentId are required');
    }
    return this.playlistService.getStatus(userId, contentType, contentId);
  }

  @Get('save-membership')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Watch later + favorites + custom playlist ids for Save modal',
  })
  async saveMembership(
    @CurrentUser() user: { id: string },
    @Query('contentType') contentType: 'video' | 'short',
    @Query('contentId') contentId: string,
  ) {
    if (!contentType || !contentId) {
      throw new BadRequestException('contentType and contentId required');
    }
    return this.playlistService.getSaveMembership(
      user.id,
      contentType,
      contentId,
    );
  }

  @Post('set')
  @ApiOperation({ summary: 'Add or remove from playlist' })
  @ApiResponse({ status: 200, description: 'Playlist updated' })
  async setPlaylist(
    @Body('userId') userId: string,
    @Body('playlistType') playlistType: 'watch_later' | 'favorites',
    @Body('contentType') contentType: 'video' | 'short',
    @Body('contentId') contentId: string,
    @Body('add') add: boolean,
  ) {
    return this.playlistService.setPlaylist(
      userId,
      playlistType,
      contentType,
      contentId,
      add,
    );
  }

  @Get('watch-later')
  @ApiOperation({ summary: 'Get watch later list (videos + shorts)' })
  @ApiResponse({ status: 200, description: 'Watch later items' })
  async getWatchLater(
    @Query('userId') userId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.playlistService.getWatchLater(userId, page || 1, limit || 50);
  }

  @Get('favorites')
  @ApiOperation({ summary: 'Get favorites list (videos + shorts)' })
  @ApiResponse({ status: 200, description: 'Favorite items' })
  async getFavorites(
    @Query('userId') userId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.playlistService.getFavorites(userId, page || 1, limit || 50);
  }

  @Get('summary')
  @ApiOperation({ summary: 'Playlist counts for Library tab' })
  @ApiResponse({ status: 200, description: 'Watch later, liked, favorites counts' })
  async getSummary(@Query('userId') userId: string) {
    return this.playlistService.getPlaylistSummary(userId);
  }

  @Get('custom/user/:userId')
  @ApiOperation({ summary: 'List channel custom playlists (Library / profile)' })
  async listCustomByUser(@Param('userId') userId: string) {
    return this.playlistService.listUserPlaylists(userId);
  }

  @Post('custom')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create custom playlist' })
  async createCustom(
    @CurrentUser() user: { id: string },
    @Body('name') name: string,
  ) {
    return this.playlistService.createUserPlaylist(user.id, name);
  }

  @Delete('custom/:playlistId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete custom playlist' })
  async deleteCustom(
    @CurrentUser() user: { id: string },
    @Param('playlistId') playlistId: string,
  ) {
    return this.playlistService.deleteUserPlaylist(user.id, playlistId);
  }

  @Patch('custom/:playlistId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Rename custom playlist' })
  async renameCustom(
    @CurrentUser() user: { id: string },
    @Param('playlistId') playlistId: string,
    @Body('name') name: string,
  ) {
    return this.playlistService.renameUserPlaylist(user.id, playlistId, name);
  }

  @Get('custom/:playlistId/items')
  @ApiOperation({ summary: 'Videos/shorts in a custom playlist' })
  async customItems(
    @Param('playlistId') playlistId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Headers('authorization') authorization?: string,
  ) {
    const viewerId = this.optionalViewerId(authorization);
    return this.playlistService.getPlaylistItems(
      playlistId,
      Math.max(1, parseInt(page || '1', 10) || 1),
      Math.min(100, Math.max(1, parseInt(limit || '50', 10) || 50)),
      viewerId,
    );
  }

  @Post('custom/:playlistId/item')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add or remove item from custom playlist' })
  async setCustomItem(
    @CurrentUser() user: { id: string },
    @Param('playlistId') playlistId: string,
    @Body('contentType') contentType: 'video' | 'short',
    @Body('contentId') contentId: string,
    @Body('add') add: boolean,
  ) {
    return this.playlistService.setUserPlaylistItem(
      user.id,
      playlistId,
      contentType,
      contentId,
      Boolean(add),
    );
  }
}
