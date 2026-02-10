import { Controller, Get, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

import { OrderCategoryService } from './orderCategory.service';
import { CreateOrderCategoryDto } from './dto/createOrderCategory.dto';

@ApiTags('order-categories')
@Controller('order-categories')
export class OrderCategoryController {
  constructor(private readonly orderCategoryService: OrderCategoryService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new category' })
  @ApiResponse({
    status: 201,
    description: 'The category has been successfully created.',
  })
  @ApiResponse({ status: 400, description: 'Invalid input.' })
  create(@Body() createOrderCategoryDto: CreateOrderCategoryDto) {
    return this.orderCategoryService.create(createOrderCategoryDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all categories' })
  @ApiResponse({ status: 200, description: 'Return all categories.' })
  async findAll() {
    // @Query('perPage') perPage: number = 10, // @Query('page') page: number = 1,
    return this.orderCategoryService.findAll();
  }
}
