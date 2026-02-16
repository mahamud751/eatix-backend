import { Controller, Get, Post, Delete, Body, Query, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PlaylistService } from './playlist.service';

@ApiTags('playlists')
@Controller('playlists')
export class PlaylistController {
  constructor(private readonly playlistService: PlaylistService) {}

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
    return this.playlistService.setPlaylist(userId, playlistType, contentType, contentId, add);
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
}
