import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';

import { BannerService } from './banner.service';
import { CreateBannerDto } from './dto/create-banner.dto';
import { UpdateBannerDto } from './dto/update-banner.dto';

import { AdminRoleGuard } from 'src/auth/AdminRoleGuard';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';

// @UseGuards(JwtAuthGuard)
@ApiTags('banners')
@Controller('banners')
export class BannerController {
  constructor(private readonly bannerService: BannerService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new banner' })
  @ApiResponse({
    status: 201,
    description: 'The banner has been successfully created.',
  })
  @ApiResponse({ status: 400, description: 'Invalid input.' })
  create(@Body() CreateBannerDto: CreateBannerDto) {
    console.log(CreateBannerDto);
    return this.bannerService.create(CreateBannerDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all banners' })
  @ApiResponse({ status: 200, description: 'Return all banners.' })
  async findAll() {
    return this.bannerService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a banner by id' })
  @ApiParam({ name: 'id', description: 'ID of the banner to retrieve' })
  @ApiQuery({
    name: 'subbanner',
    required: false,
    description: 'Subbanner ID to filter',
  })
  @ApiResponse({ status: 200, description: 'Return the banner.' })
  @ApiResponse({ status: 404, description: 'banner not found.' })
  findOne(@Param('id') id: string) {
    return this.bannerService.findOne(id);
  }

  @Get(':id/user')
  @ApiOperation({ summary: 'Get a banner for user by id' })
  @ApiParam({ name: 'id', description: 'ID of the banner to retrieve' })
  @ApiQuery({
    name: 'subbanner',
    required: false,
    description: 'Subbanner ID to filter',
  })
  @ApiResponse({ status: 200, description: 'Return the banner for user.' })
  @ApiResponse({ status: 404, description: 'Banner not found.' })
  findOneForUser(@Param('id') id: string) {
    return this.bannerService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a banner' })
  @ApiParam({ name: 'id', description: 'ID of the banner to update' })
  @ApiBody({ type: UpdateBannerDto })
  @ApiResponse({
    status: 200,
    description: 'The banner has been successfully updated.',
  })
  @ApiResponse({ status: 404, description: 'banner not found.' })
  update(@Param('id') id: string, @Body() UpdateBannerDto: UpdateBannerDto) {
    return this.bannerService.update(id, UpdateBannerDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  @ApiOperation({ summary: 'Delete a banner' })
  @ApiParam({ name: 'id', description: 'ID of the banner to delete' })
  @ApiResponse({
    status: 200,
    description: 'The banner has been successfully deleted.',
  })
  @ApiResponse({ status: 404, description: 'Banner not found.' })
  remove(@Param('id') id: string) {
    return this.bannerService.remove(id);
  }
}
