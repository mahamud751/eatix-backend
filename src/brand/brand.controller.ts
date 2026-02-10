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

import { AdminRoleGuard } from 'src/auth/AdminRoleGuard';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { CreateBrandDto } from './dto/create-brand.dto';
import { BrandService } from './brand.service';
import { UpdateBrandDto } from './dto/update-brand.dto';

// @UseGuards(JwtAuthGuard)
@ApiTags('brands')
@Controller('brands')
export class BrandController {
  constructor(private readonly brandService: BrandService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new brand' })
  @ApiResponse({
    status: 201,
    description: 'The banner has been successfully created.',
  })
  @ApiResponse({ status: 400, description: 'Invalid input.' })
  create(@Body() CreateBrand: CreateBrandDto) {
    console.log(CreateBrand);
    return this.brandService.create(CreateBrand);
  }

  @Get()
  @ApiOperation({ summary: 'Get all banners' })
  @ApiResponse({ status: 200, description: 'Return all banners.' })
  async findAll(
    @Query('page') page: number = 1,
    @Query('perPage') perPage: number = 10,
  ) {
    return this.brandService.findAll(page, perPage);
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
    return this.brandService.findOne(id);
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
    return this.brandService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a banner' })
  @ApiParam({ name: 'id', description: 'ID of the banner to update' })
  @ApiBody({ type: UpdateBrandDto })
  @ApiResponse({
    status: 200,
    description: 'The banner has been successfully updated.',
  })
  @ApiResponse({ status: 404, description: 'banner not found.' })
  update(@Param('id') id: string, @Body() UpdateBrandDto: UpdateBrandDto) {
    return this.brandService.update(id, UpdateBrandDto);
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
    return this.brandService.remove(id);
  }
}
