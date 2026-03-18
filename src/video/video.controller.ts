import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Headers,
  UseInterceptors,
  UploadedFiles,
  BadRequestException,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
} from '@nestjs/swagger';
import { VideoService } from './video.service';
import {
  CreateVideoDto,
  UpdateVideoDto,
  VideoQueryDto,
  VideoLikeDto,
  VideoDislikeDto,
  VideoShareDto,
  VideoCommentDto,
  VideoCommentLikeDto,
  VideoCommentDislikeDto,
  VideoCommentDeleteDto,
  VideoViewDto,
} from './dto/video.dto';

@ApiTags('videos')
@Controller('videos')
export class VideoController {
  constructor(private readonly videoService: VideoService) {}

  @Post('upload')
  @ApiOperation({ summary: 'Upload video with thumbnail' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 201, description: 'Video uploaded successfully' })
  @UseInterceptors(FilesInterceptor('files', 2))
  async uploadVideo(
    @UploadedFiles() files: Express.Multer.File[],
    @Body() createVideoDto: CreateVideoDto,
  ) {
    if (!files || files.length < 2) {
      throw new BadRequestException(
        'Both video and thumbnail files are required',
      );
    }

    // Identify video and thumbnail files
    const videoFile = files.find((file) => file.mimetype.startsWith('video/'));
    const thumbnailFile = files.find((file) =>
      file.mimetype.startsWith('image/'),
    );

    if (!videoFile || !thumbnailFile) {
      throw new BadRequestException(
        'Invalid files. Please upload a video file and an image thumbnail',
      );
    }

    return this.videoService.uploadVideo(
      videoFile,
      thumbnailFile,
      createVideoDto,
    );
  }

  @Get()
  @ApiOperation({ summary: 'Get all videos with filters' })
  @ApiResponse({ status: 200, description: 'Videos retrieved successfully' })
  async getVideos(@Query() query: VideoQueryDto) {
    return this.videoService.getVideos(query);
  }

  @Get('history')
  @ApiOperation({ summary: 'Get user watch history (videos)' })
  @ApiResponse({ status: 200, description: 'Watch history retrieved successfully' })
  async getUserVideoHistory(
    @Query('userId') userId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    if (!userId) {
      throw new BadRequestException('userId is required');
    }
    return this.videoService.getUserVideoHistory(userId, page || 1, limit || 50);
  }

  @Get('liked')
  @ApiOperation({ summary: 'Get user liked videos' })
  @ApiResponse({ status: 200, description: 'Liked videos retrieved successfully' })
  async getUserLikedVideos(
    @Query('userId') userId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    if (!userId) {
      throw new BadRequestException('userId is required');
    }
    return this.videoService.getUserLikedVideos(userId, page || 1, limit || 50);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get video by ID' })
  @ApiResponse({ status: 200, description: 'Video retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Video not found' })
  async getVideoById(
    @Param('id') id: string,
    @Query('userId') userId?: string,
    @Query('viewerRole') viewerRole?: string,
  ) {
    return this.videoService.getVideoById(id, userId, viewerRole);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update video details' })
  @ApiResponse({ status: 200, description: 'Video updated successfully' })
  @ApiResponse({ status: 404, description: 'Video not found' })
  async updateVideo(
    @Param('id') id: string,
    @Body('userId') userId: string,
    @Body() updateVideoDto: UpdateVideoDto,
  ) {
    return this.videoService.updateVideo(id, userId, updateVideoDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete video' })
  @ApiResponse({ status: 200, description: 'Video deleted successfully' })
  @ApiResponse({ status: 404, description: 'Video not found' })
  async deleteVideo(@Param('id') id: string, @Body('userId') userId: string) {
    return this.videoService.deleteVideo(id, userId);
  }

  @Post('like')
  @ApiOperation({ summary: 'Like/Unlike video' })
  @ApiResponse({ status: 200, description: 'Video like toggled successfully' })
  async toggleLike(@Body() videoLikeDto: VideoLikeDto) {
    return this.videoService.toggleLike(videoLikeDto);
  }

  @Post('dislike')
  @ApiOperation({ summary: 'Dislike/Undislike video' })
  @ApiResponse({ status: 200, description: 'Video dislike toggled successfully' })
  async toggleDislike(@Body() videoDislikeDto: VideoDislikeDto) {
    return this.videoService.toggleDislike(videoDislikeDto);
  }

  @Post('share')
  @ApiOperation({ summary: 'Record video share' })
  @ApiResponse({ status: 200, description: 'Share recorded successfully' })
  async recordShare(@Body() videoShareDto: VideoShareDto) {
    return this.videoService.recordShare(videoShareDto);
  }

  @Post('comment')
  @ApiOperation({ summary: 'Add comment to video' })
  @ApiResponse({ status: 201, description: 'Comment added successfully' })
  async addComment(@Body() videoCommentDto: VideoCommentDto) {
    return this.videoService.addComment(videoCommentDto);
  }

  @Get(':id/comments')
  @ApiOperation({ summary: 'Get comments for video' })
  @ApiResponse({ status: 200, description: 'Comments retrieved successfully' })
  async getComments(
    @Param('id') videoId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('userId') userId?: string,
  ) {
    return this.videoService.getComments(videoId, page, limit, userId);
  }

  @Post('comment/like')
  @ApiOperation({ summary: 'Like/Unlike comment' })
  @ApiResponse({ status: 200, description: 'Comment like toggled' })
  async toggleCommentLike(@Body() dto: VideoCommentLikeDto) {
    return this.videoService.toggleCommentLike(dto);
  }

  @Post('comment/dislike')
  @ApiOperation({ summary: 'Dislike/Undislike comment' })
  @ApiResponse({ status: 200, description: 'Comment dislike toggled' })
  async toggleCommentDislike(@Body() dto: VideoCommentDislikeDto) {
    return this.videoService.toggleCommentDislike(dto);
  }

  @Post('comment/delete')
  @ApiOperation({ summary: 'Delete own comment or reply' })
  @ApiResponse({ status: 200, description: 'Comment deleted' })
  async deleteComment(@Body() dto: VideoCommentDeleteDto) {
    return this.videoService.deleteComment(dto);
  }

  @Post('view')
  @ApiOperation({ summary: 'Record video view' })
  @ApiResponse({ status: 201, description: 'View recorded successfully' })
  async recordView(@Body() videoViewDto: VideoViewDto) {
    return this.videoService.recordView(videoViewDto);
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get user uploaded videos' })
  @ApiResponse({
    status: 200,
    description: 'User videos retrieved successfully',
  })
  async getUserVideos(
    @Param('userId') userId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Headers('authorization') authorization?: string,
  ) {
    return this.videoService.getUserVideos(
      userId,
      page || 1,
      limit || 20,
      authorization,
    );
  }
}
