import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseInterceptors,
  UploadedFiles,
  BadRequestException,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { multerShortsOptions } from '../../middleware/multer-shorts.config';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { ShortsService } from './shorts.service';
import {
  CreateShortDto,
  UpdateShortDto,
  ShortQueryDto,
  ShortLikeDto,
  ShortCommentDto,
  ShortViewDto,
} from './dto/shorts.dto';

@ApiTags('shorts')
@Controller('shorts')
export class ShortsController {
  constructor(private readonly shortsService: ShortsService) {}

  @Post('upload')
  @ApiOperation({ summary: 'Upload short video with thumbnail' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 201, description: 'Short uploaded successfully' })
  @UseInterceptors(FilesInterceptor('files', 2, multerShortsOptions))
  async uploadShort(
    @UploadedFiles() files: Express.Multer.File[],
    @Body() createShortDto: CreateShortDto,
  ) {
    if (!files || files.length < 1) {
      throw new BadRequestException('Video file is required');
    }

    const videoFile = files.find((f) => f.mimetype.startsWith('video/'));
    const thumbnailFile = files.find((f) => f.mimetype.startsWith('image/'));

    if (!videoFile) {
      throw new BadRequestException('Video file is required');
    }

    return this.shortsService.uploadShort(
      videoFile,
      thumbnailFile || null,
      createShortDto,
    );
  }

  @Post('live')
  @ApiOperation({ summary: 'Create live short (Agora)' })
  @ApiResponse({ status: 201, description: 'Live short created' })
  async createLiveShort(
    @Body('userId') userId: string,
    @Body('channelName') channelName: string,
  ) {
    if (!userId || !channelName) {
      throw new BadRequestException('userId and channelName are required');
    }
    return this.shortsService.createLiveShort(userId, channelName);
  }

  @Get()
  @ApiOperation({ summary: 'Get all shorts with filters' })
  @ApiResponse({ status: 200, description: 'Shorts retrieved successfully' })
  async getShorts(@Query() query: ShortQueryDto) {
    return this.shortsService.getShorts(query);
  }

  @Get('sounds')
  @ApiOperation({ summary: 'Get sounds library for shorts' })
  async getSounds(
    @Query('search') search?: string,
    @Query('trending') trending?: string,
  ) {
    return this.shortsService.getSounds(search, trending === 'true');
  }

  @Get('filters')
  @ApiOperation({ summary: 'Get filters library for shorts' })
  async getFilters(@Query('trending') trending?: string) {
    return this.shortsService.getFilters(trending === 'true');
  }

  @Get('history')
  @ApiOperation({ summary: 'Get user watch history (shorts)' })
  @ApiResponse({ status: 200, description: 'Shorts watch history retrieved successfully' })
  async getUserShortHistory(
    @Query('userId') userId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    if (!userId) {
      throw new BadRequestException('userId is required');
    }
    return this.shortsService.getUserShortHistory(userId, page || 1, limit || 50);
  }

  @Get('liked')
  @ApiOperation({ summary: 'Get user liked shorts' })
  @ApiResponse({ status: 200, description: 'Liked shorts retrieved successfully' })
  async getUserLikedShorts(
    @Query('userId') userId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    if (!userId) {
      throw new BadRequestException('userId is required');
    }
    return this.shortsService.getUserLikedShorts(userId, page || 1, limit || 50);
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get user shorts' })
  @ApiResponse({ status: 200, description: 'User shorts retrieved successfully' })
  async getUserShorts(
    @Param('userId') userId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.shortsService.getUserShorts(userId, page, limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get short by ID' })
  @ApiResponse({ status: 200, description: 'Short retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Short not found' })
  async getShortById(
    @Param('id') id: string,
    @Query('userId') userId?: string,
  ) {
    return this.shortsService.getShortById(id, userId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update short details' })
  @ApiResponse({ status: 200, description: 'Short updated successfully' })
  async updateShort(
    @Param('id') id: string,
    @Body('userId') userId: string,
    @Body() updateShortDto: UpdateShortDto,
  ) {
    return this.shortsService.updateShort(id, userId, updateShortDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete short' })
  @ApiResponse({ status: 200, description: 'Short deleted successfully' })
  async deleteShort(@Param('id') id: string, @Body('userId') userId: string) {
    return this.shortsService.deleteShort(id, userId);
  }

  @Post('like')
  @ApiOperation({ summary: 'Like/Unlike short' })
  @ApiResponse({ status: 200, description: 'Short like toggled successfully' })
  async toggleLike(@Body() shortLikeDto: ShortLikeDto) {
    return this.shortsService.toggleLike(shortLikeDto);
  }

  @Post('comment')
  @ApiOperation({ summary: 'Add comment to short' })
  @ApiResponse({ status: 201, description: 'Comment added successfully' })
  async addComment(@Body() shortCommentDto: ShortCommentDto) {
    return this.shortsService.addComment(shortCommentDto);
  }

  @Get(':id/comments')
  @ApiOperation({ summary: 'Get comments for short' })
  @ApiResponse({ status: 200, description: 'Comments retrieved successfully' })
  async getComments(
    @Param('id') shortId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.shortsService.getComments(shortId, page, limit);
  }

  @Post('view')
  @ApiOperation({ summary: 'Record short view' })
  @ApiResponse({ status: 201, description: 'View recorded successfully' })
  async recordView(@Body() shortViewDto: ShortViewDto) {
    return this.shortsService.recordView(shortViewDto);
  }
}
