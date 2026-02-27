import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { MenuService } from './menu.service';
import { CreateMenuItemDto } from './dto/create-menu-item.dto';
import { UpdateMenuItemDto } from './dto/update-menu-item.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminOrOwnerGuard } from '../auth/admin-or-owner.guard';
import { CurrentUser } from '../users/dto/currentUser';

@ApiTags('menu')
@Controller('menu')
export class MenuController {
  constructor(private readonly menuService: MenuService) {}

  /** Upload menu item image (file). Returns { imageUrl }. Auth required. */
  @Post('upload-image')
  @UseGuards(JwtAuthGuard, AdminOrOwnerGuard)
  @UseInterceptors(FileInterceptor('image'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { image: { type: 'string', format: 'binary' } } } })
  @ApiOperation({ summary: 'Upload menu item image' })
  @ApiResponse({ status: 201, description: 'Returns { imageUrl }' })
  async uploadImage(@UploadedFile() file: Express.Multer.File) {
    if (!file || !file.buffer) {
      throw new BadRequestException('No image file provided');
    }
    return this.menuService.uploadImage(file);
  }

  /** Upload menu file (PDF or image). First step before adding menu items. Auth required. */
  @Post('upload-file')
  @UseGuards(JwtAuthGuard, AdminOrOwnerGuard)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
  @ApiOperation({ summary: 'Upload menu file (PDF or image)' })
  @ApiResponse({ status: 201, description: 'Returns { fileUrl, fileType, id }' })
  async uploadMenuFile(
    @CurrentUser() user: { id: string; role: string },
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file || !file.buffer) {
      throw new BadRequestException('No file provided');
    }
    return this.menuService.uploadMenuFile(user.id, file);
  }

  /** List menu files (owner: own, admin: by userId). */
  @Get('files')
  @UseGuards(JwtAuthGuard, AdminOrOwnerGuard)
  @ApiOperation({ summary: 'List menu files (PDF/image uploads)' })
  async getMenuFiles(
    @CurrentUser() user: { id: string; role: string },
    @Query('userId') userId?: string,
  ) {
    return this.menuService.findMenuFiles(userId || user.id, user.id, user.role);
  }

  /** Public: get menu items for a user (e.g. video owner). Used by ProductDetailModal. */
  @Get('by-user/:userId')
  @ApiOperation({ summary: 'Get menu items by user ID (video owner)' })
  @ApiResponse({ status: 200, description: 'Returns menu items for that user' })
  async getByUserId(@Param('userId') userId: string) {
    return this.menuService.getByUserId(userId);
  }

  /** Owner: my menu. Admin: list by userId query. */
  @Get('items')
  @UseGuards(JwtAuthGuard, AdminOrOwnerGuard)
  @ApiOperation({ summary: 'List menu items (owner: own, admin: by userId)' })
  async findItems(
    @CurrentUser() user: { id: string; role: string },
    @Query('userId') userId?: string,
  ) {
    return this.menuService.findItems(user.id, user.role, userId);
  }

  @Post('items')
  @UseGuards(JwtAuthGuard, AdminOrOwnerGuard)
  @ApiOperation({ summary: 'Add menu item (owner: own, admin: for any userId)' })
  @ApiResponse({ status: 201, description: 'Menu item created' })
  async createItem(
    @CurrentUser() user: { id: string; role: string },
    @Body() dto: CreateMenuItemDto,
  ) {
    return this.menuService.createItem(user.id, user.role, dto);
  }

  @Patch('items/:id')
  @UseGuards(JwtAuthGuard, AdminOrOwnerGuard)
  @ApiOperation({ summary: 'Update menu item' })
  async updateItem(
    @Param('id') id: string,
    @CurrentUser() user: { id: string; role: string },
    @Body() dto: UpdateMenuItemDto,
  ) {
    return this.menuService.updateItem(id, user.id, user.role, dto);
  }

  @Delete('items/:id')
  @UseGuards(JwtAuthGuard, AdminOrOwnerGuard)
  @ApiOperation({ summary: 'Delete menu item' })
  async removeItem(
    @Param('id') id: string,
    @CurrentUser() user: { id: string; role: string },
  ) {
    return this.menuService.removeItem(id, user.id, user.role);
  }
}
