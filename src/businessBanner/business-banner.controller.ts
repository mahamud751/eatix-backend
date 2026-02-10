import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';

import { AdminRoleGuard } from 'src/auth/AdminRoleGuard';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { CreateBusinessBannerDto } from './dto/create-business-banner.dto';
import { UpdateBusinessBannerDto } from './dto/update-business-banner.dto';
import { BusinessBannerService } from './business-banner.service';

// @UseGuards(JwtAuthGuard)
@ApiTags('business-banners')
@Controller('business-banners')
export class BusinessBannerController {
  constructor(private readonly businessBannerService: BusinessBannerService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new banner' })
  @ApiResponse({
    status: 201,
    description: 'The banner has been successfully created.',
  })
  @ApiResponse({ status: 400, description: 'Invalid input.' })
  create(@Body() CreateBannerDto: CreateBusinessBannerDto) {
    console.log(CreateBannerDto);
    return this.businessBannerService.create(CreateBannerDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all banners' })
  @ApiResponse({ status: 200, description: 'Return all banners.' })
  async findAll() {
    return this.businessBannerService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a banner by id' })
  @ApiParam({ name: 'id', description: 'ID of the banner to retrieve' })
  @ApiResponse({ status: 200, description: 'Return the banner.' })
  @ApiResponse({ status: 404, description: 'banner not found.' })
  findOne(@Param('id') id: string) {
    return this.businessBannerService.findOne(id);
  }

  @Get(':id/user')
  @ApiOperation({ summary: 'Get a banner for user by id' })
  @ApiParam({ name: 'id', description: 'ID of the banner to retrieve' })
  @ApiResponse({ status: 200, description: 'Return the banner for user.' })
  @ApiResponse({ status: 404, description: 'Banner not found.' })
  findOneForUser(@Param('id') id: string) {
    return this.businessBannerService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a banner' })
  @ApiParam({ name: 'id', description: 'ID of the banner to update' })
  @ApiBody({ type: UpdateBusinessBannerDto })
  @ApiResponse({
    status: 200,
    description: 'The banner has been successfully updated.',
  })
  @ApiResponse({ status: 404, description: 'banner not found.' })
  update(
    @Param('id') id: string,
    @Body() UpdateBusinessBannerDto: UpdateBusinessBannerDto,
  ) {
    return this.businessBannerService.update(id, UpdateBusinessBannerDto);
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
    return this.businessBannerService.remove(id);
  }
}
