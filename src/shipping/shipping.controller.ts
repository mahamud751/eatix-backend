import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';

import { ShippingService } from './shipping.service';
import { CreateShippingDto } from './dto/create-shipping-dto';
import { UpdateShippingDto } from './dto/update-shipping-dto';

@ApiTags('shipping')
@Controller('shipping')
export class ShippingController {
  constructor(private readonly shippingService: ShippingService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new shipping option' })
  @ApiResponse({
    status: 201,
    description: 'The shipping option has been successfully created.',
  })
  @ApiResponse({ status: 400, description: 'Invalid input.' })
  create(@Body() createShippingDto: CreateShippingDto) {
    return this.shippingService.create(createShippingDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all shipping options' })
  @ApiResponse({ status: 200, description: 'Return all shipping options.' })
  async findAll() {
    return this.shippingService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a shipping option by ID' })
  @ApiParam({
    name: 'id',
    description: 'ID of the shipping option to retrieve',
  })
  @ApiResponse({ status: 200, description: 'Return the shipping option.' })
  @ApiResponse({ status: 404, description: 'Shipping option not found.' })
  findOne(@Param('id') id: string) {
    return this.shippingService.findOne(id);
  }

  @Get(':id/user')
  @ApiOperation({ summary: 'Get a shipping option for user by ID' })
  @ApiParam({
    name: 'id',
    description: 'ID of the shipping option to retrieve',
  })
  @ApiResponse({
    status: 200,
    description: 'Return the shipping option for user.',
  })
  @ApiResponse({ status: 404, description: 'Shipping option not found.' })
  findOneForUser(@Param('id') id: string) {
    return this.shippingService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a shipping option' })
  @ApiParam({ name: 'id', description: 'ID of the shipping option to update' })
  @ApiBody({ type: UpdateShippingDto })
  @ApiResponse({
    status: 200,
    description: 'The shipping option has been successfully updated.',
  })
  @ApiResponse({ status: 404, description: 'Shipping option not found.' })
  update(
    @Param('id') id: string,
    @Body() updateShippingDto: UpdateShippingDto,
  ) {
    return this.shippingService.update(id, updateShippingDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a shipping option' })
  @ApiParam({ name: 'id', description: 'ID of the shipping option to delete' })
  @ApiResponse({
    status: 200,
    description: 'The shipping option has been successfully deleted.',
  })
  @ApiResponse({ status: 404, description: 'Shipping option not found.' })
  remove(@Param('id') id: string) {
    return this.shippingService.remove(id);
  }
}
