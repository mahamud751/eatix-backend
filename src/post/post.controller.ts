import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  BadRequestException,
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { PostService } from './post.service';
import {
  CreatePostDto,
  UpdatePostDto,
  PostQueryDto,
  PostLikeDto,
  PostDislikeDto,
  PostShareDto,
  PostCommentDto,
  PostCommentLikeDto,
  PostCommentDislikeDto,
  PostCommentDeleteDto,
} from './dto/post.dto';

@ApiTags('posts')
@Controller('posts')
export class PostController {
  constructor(private readonly postService: PostService) {}

  @Post()
  @ApiOperation({ summary: 'Create a post' })
  @ApiResponse({ status: 201, description: 'Post created' })
  async createPost(@Body() dto: CreatePostDto) {
    return this.postService.createPost(dto);
  }

  @Post('upload')
  @ApiOperation({ summary: 'Upload post with thumbnail and optional video' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: { type: 'array', items: { type: 'string', format: 'binary' } },
        userId: { type: 'string' },
        title: { type: 'string' },
        description: { type: 'string' },
        website: { type: 'string' },
        hashtags: { type: 'string', description: 'JSON array or comma-separated' },
        duration: { type: 'number', description: 'Video duration in seconds' },
      },
      required: ['userId', 'title'],
    },
  })
  @ApiResponse({ status: 201, description: 'Post uploaded' })
  @UseInterceptors(FilesInterceptor('files', 2))
  async uploadPost(
    @UploadedFiles() files: Express.Multer.File[],
    @Body()
    body: {
      userId: string;
      title: string;
      description?: string;
      website?: string;
      hashtags?: string;
      duration?: number;
    },
  ) {
    return this.postService.uploadPost(files, body);
  }

  @Get()
  @ApiOperation({ summary: 'Get posts (optional: userId, nearbyLat, nearbyLng)' })
  @ApiResponse({ status: 200, description: 'Posts list' })
  async getPosts(@Query() query: PostQueryDto) {
    return this.postService.getPosts(query);
  }

  @Get('nearby')
  @ApiOperation({ summary: 'Get posts by nearby location (same as Video: by creator location)' })
  @ApiResponse({ status: 200, description: 'Nearby posts' })
  async getNearbyPosts(
    @Query('latitude') latitude: string,
    @Query('longitude') longitude: string,
    @Query('radiusKm') radiusKm?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('viewerRole') viewerRole?: string,
  ) {
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      throw new BadRequestException('latitude and longitude are required and must be numbers');
    }
    return this.postService.getPosts({
      nearbyLat: lat,
      nearbyLng: lng,
      radiusKm: radiusKm != null ? parseFloat(radiusKm) : 50,
      page: page != null ? parseInt(page, 10) : 1,
      limit: limit != null ? parseInt(limit, 10) : 20,
      viewerRole,
    });
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get posts by user ID (own or profile)' })
  @ApiResponse({ status: 200, description: 'User posts' })
  async getUserPosts(
    @Param('userId') userId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.postService.getUserPosts(userId, page || 1, limit || 20);
  }

  @Get(':postId/comments')
  @ApiOperation({ summary: 'Get comments for post' })
  @ApiResponse({ status: 200, description: 'Comments list' })
  async getComments(
    @Param('postId') postId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('userId') userId?: string,
  ) {
    return this.postService.getComments(
      postId,
      page || 1,
      limit || 20,
      userId,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get post by ID' })
  @ApiResponse({ status: 200, description: 'Post detail' })
  @ApiResponse({ status: 404, description: 'Post not found' })
  async getPostById(
    @Param('id') id: string,
    @Query('userId') userId?: string,
  ) {
    return this.postService.getPostById(id, userId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update post' })
  @ApiResponse({ status: 200, description: 'Post updated' })
  async updatePost(
    @Param('id') id: string,
    @Body('userId') userId: string,
    @Body() dto: UpdatePostDto,
  ) {
    if (!userId) throw new BadRequestException('userId is required');
    return this.postService.updatePost(id, userId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete post' })
  @ApiResponse({ status: 200, description: 'Post deleted' })
  async deletePost(@Param('id') id: string, @Body('userId') userId: string) {
    if (!userId) throw new BadRequestException('userId is required');
    return this.postService.deletePost(id, userId);
  }

  @Post('like')
  @ApiOperation({ summary: 'Like/Unlike post' })
  @ApiResponse({ status: 200, description: 'Like toggled' })
  async toggleLike(@Body() dto: PostLikeDto) {
    return this.postService.toggleLike(dto);
  }

  @Post('dislike')
  @ApiOperation({ summary: 'Dislike/Undislike post' })
  @ApiResponse({ status: 200, description: 'Dislike toggled' })
  async toggleDislike(@Body() dto: PostDislikeDto) {
    return this.postService.toggleDislike(dto);
  }

  @Post('share')
  @ApiOperation({ summary: 'Record post share' })
  @ApiResponse({ status: 200, description: 'Share recorded' })
  async recordShare(@Body() dto: PostShareDto) {
    return this.postService.recordShare(dto);
  }

  @Post('comment')
  @ApiOperation({ summary: 'Add comment to post' })
  @ApiResponse({ status: 201, description: 'Comment added' })
  async addComment(@Body() dto: PostCommentDto) {
    return this.postService.addComment(dto);
  }

  @Post('comment/like')
  @ApiOperation({ summary: 'Like/Unlike comment' })
  @ApiResponse({ status: 200, description: 'Comment like toggled' })
  async toggleCommentLike(@Body() dto: PostCommentLikeDto) {
    return this.postService.toggleCommentLike(dto);
  }

  @Post('comment/dislike')
  @ApiOperation({ summary: 'Dislike/Undislike comment' })
  @ApiResponse({ status: 200, description: 'Comment dislike toggled' })
  async toggleCommentDislike(@Body() dto: PostCommentDislikeDto) {
    return this.postService.toggleCommentDislike(dto);
  }

  @Post('comment/delete')
  @ApiOperation({ summary: 'Delete own comment' })
  @ApiResponse({ status: 200, description: 'Comment deleted' })
  async deleteComment(@Body() dto: PostCommentDeleteDto) {
    return this.postService.deleteComment(dto);
  }
}
