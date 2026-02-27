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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
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
