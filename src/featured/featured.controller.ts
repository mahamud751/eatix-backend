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
import { FeaturedService } from './featured.service';
import { CreateFeaturedDto } from './dto/create-featured.dto';
import { UpdateFeaturedDto } from './dto/update-featured.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminOrOwnerGuard } from '../auth/admin-or-owner.guard';
import { CurrentUser } from '../users/dto/currentUser';

@ApiTags('featured')
@Controller('featured')
export class FeaturedController {
  constructor(private readonly featuredService: FeaturedService) {}

  @Get('by-location')
  @ApiOperation({ summary: 'Get featured video for latitude/longitude' })
  @ApiResponse({ status: 200, description: 'Returns active featured for this area or null' })
  async getByLocation(
    @Query('latitude') latitude: string,
    @Query('longitude') longitude: string,
  ) {
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      return { featured: null };
    }
    return this.featuredService.getByLocation(lat, lng);
  }

  @Get()
  @ApiOperation({ summary: 'List featured campaigns' })
  async findAll() {
    return this.featuredService.findAllPublic();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get one featured campaign' })
  async findOne(@Param('id') id: string) {
    return this.featuredService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, AdminOrOwnerGuard)
  @ApiOperation({ summary: 'Create featured campaign' })
  @ApiResponse({ status: 201, description: 'Featured campaign created' })
  async create(
    @CurrentUser() user: { id: string; role: string },
    @Body() dto: CreateFeaturedDto,
  ) {
    return this.featuredService.create(user.id, user.role, dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, AdminOrOwnerGuard)
  @ApiOperation({ summary: 'Update featured campaign' })
  async update(
    @Param('id') id: string,
    @CurrentUser() user: { id: string; role: string },
    @Body() dto: UpdateFeaturedDto,
  ) {
    return this.featuredService.update(id, user.id, user.role, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, AdminOrOwnerGuard)
  @ApiOperation({ summary: 'Cancel featured campaign' })
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: { id: string; role: string },
  ) {
    return this.featuredService.remove(id, user.id, user.role);
  }
}
