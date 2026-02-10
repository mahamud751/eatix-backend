import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  UseInterceptors,
  UploadedFiles,
  Delete,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { ClientBusinessService } from './client-business.service';
import { ClientBusinessDto } from '../dto/client-business.dto';
import { multerOptions } from '../../middleware/multer.config';

@ApiTags('client-business')
@Controller('client-business')
export class ClientBusinessController {
  constructor(private readonly clientBusinessService: ClientBusinessService) {}

  // ============================================
  // FILE UPLOAD
  // ============================================
  @Post('upload-files')
  @UseInterceptors(FilesInterceptor('files', 10, multerOptions))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload client business files' })
  async uploadFiles(
    @UploadedFiles() files: Express.Multer.File[],
    @Body('fileType') fileType: string,
    @Body('title') title: string,
  ) {
    const uploadedFiles = files.map((file) => ({
      id: `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title: title || file.originalname,
      type: fileType || 'image',
      fileName: file.filename,
      url: `/uploads/${file.filename}`,
      uploadedAt: new Date().toISOString(),
    }));

    return { success: true, files: uploadedFiles };
  }

  // ============================================
  // CLIENT BUSINESS CRUD
  // ============================================
  @Post()
  @ApiOperation({ summary: 'Create or update client business profile' })
  async createOrUpdate(@Body() data: ClientBusinessDto) {
    return this.clientBusinessService.createOrUpdate(data);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get business statistics' })
  async getStats() {
    return this.clientBusinessService.getStats();
  }

  @Get()
  @ApiOperation({ summary: 'Get all client businesses' })
  async findAll() {
    return this.clientBusinessService.findAll();
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get client business by user ID' })
  async findByUserId(@Param('userId') userId: string) {
    return this.clientBusinessService.findByUserId(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get client business by ID' })
  async findOne(@Param('id') id: string) {
    return this.clientBusinessService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update client business' })
  async update(@Param('id') id: string, @Body() data: ClientBusinessDto) {
    return this.clientBusinessService.update(id, data);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete client business' })
  async remove(@Param('id') id: string) {
    return this.clientBusinessService.remove(id);
  }

  // ============================================
  // SOCIAL MEDIA POSTS
  // ============================================
  @Post(':id/social-posts')
  @ApiOperation({ summary: 'Create social media post' })
  async createSocialPost(
    @Param('id') clientBusinessId: string,
    @Body() data: any,
  ) {
    return this.clientBusinessService.createSocialPost(clientBusinessId, data);
  }

  @Get(':id/social-posts')
  @ApiOperation({ summary: 'Get all social media posts for client business' })
  async getSocialPosts(@Param('id') clientBusinessId: string) {
    return this.clientBusinessService.getSocialPosts(clientBusinessId);
  }

  @Patch('social-posts/:postId')
  @ApiOperation({ summary: 'Update social media post' })
  async updateSocialPost(@Param('postId') postId: string, @Body() data: any) {
    return this.clientBusinessService.updateSocialPost(postId, data);
  }

  @Delete('social-posts/:postId')
  @ApiOperation({ summary: 'Delete social media post' })
  async deleteSocialPost(@Param('postId') postId: string) {
    return this.clientBusinessService.deleteSocialPost(postId);
  }
}
