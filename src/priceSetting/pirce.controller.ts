/* eslint-disable prettier/prettier */
import { Controller, Get, Post, Put, Param, Body } from '@nestjs/common';

import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CreatePriceSettingDto } from './dto/create-price.dto';
import { UpdatePriceSettingDto } from './dto/update-price.dto';
import { PriceSettingService } from './price.service';

@ApiTags('price-settings')
@Controller('price-settings')
export class PriceSettingController {
  constructor(private readonly priceSettingService: PriceSettingService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new price setting' })
  @ApiResponse({
    status: 201,
    description: 'Price setting created successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  async create(@Body() createPriceSettingDto: CreatePriceSettingDto) {
    return this.priceSettingService.create(createPriceSettingDto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update an existing price setting' })
  @ApiResponse({
    status: 200,
    description: 'Price setting updated successfully',
  })
  @ApiResponse({ status: 404, description: 'Price setting not found' })
  async update(
    @Param('id') id: string,
    @Body() updatePriceSettingDto: UpdatePriceSettingDto,
  ) {
    return this.priceSettingService.update(id, updatePriceSettingDto);
  }

  @Get()
  @ApiOperation({ summary: 'List all price settings' })
  @ApiResponse({ status: 200, description: 'List of price settings' })
  async findAll() {
    return this.priceSettingService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a price setting by ID' })
  @ApiResponse({ status: 200, description: 'Price setting details' })
  @ApiResponse({ status: 404, description: 'Price setting not found' })
  async findOne(@Param('id') id: string) {
    return this.priceSettingService.findOne(id);
  }
}
