import { Controller, Get, Delete, Param, Query } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { SubOrderService } from './sub-order-service';

@ApiTags('SubOrders')
@Controller('sub-orders')
export class SubOrderController {
  constructor(private readonly subOrderService: SubOrderService) {}

  // @Post()
  // @ApiOperation({ summary: 'Create a new sub-order' })
  // @ApiResponse({
  //   status: 201,
  //   description: 'The sub-order has been successfully created.',
  // })
  // @ApiResponse({ status: 404, description: 'Main order not found.' })
  // createSubOrder(@Body() createSubOrderDto: CreateSubOrderDto) {
  //   return this.subOrderService.createSubOrder(createSubOrderDto);
  // }

  @Get()
  @ApiOperation({ summary: 'Get all sub-orders' })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
  })
  @ApiQuery({
    name: 'perPage',
    required: false,
    type: Number,
    description: 'Items per page (default: 10)',
  })
  @ApiResponse({
    status: 200,
    description: 'List of all sub-orders with pagination',
  })
  findAll(
    @Query('page') page: number = 1,
    @Query('perPage') perPage: number = 10,
  ) {
    return this.subOrderService.findAll(page, perPage);
  }

  @Get(':orderId')
  @ApiOperation({ summary: 'Get all sub-orders for a specific order ID' })
  @ApiParam({ name: 'orderId', description: 'ID of the main order' })
  @ApiResponse({ status: 200, description: 'List of sub-orders' })
  @ApiResponse({ status: 404, description: 'Main order not found.' })
  findAllByOrderId(@Param('orderId') orderId: string) {
    return this.subOrderService.findAllByOrderId(orderId);
  }

  @Get('single/:id')
  @ApiOperation({ summary: 'Get a sub-order by ID' })
  @ApiParam({ name: 'id', description: 'Sub-order ID' })
  @ApiResponse({ status: 200, description: 'The sub-order details' })
  @ApiResponse({ status: 404, description: 'Sub-order not found.' })
  findOne(@Param('id') id: string) {
    return this.subOrderService.findOne(id);
  }

  // @Patch(':id')
  // @ApiOperation({ summary: 'Update a sub-order' })
  // @ApiParam({ name: 'id', description: 'Sub-order ID' })
  // @ApiResponse({ status: 200, description: 'The updated sub-order details' })
  // @ApiResponse({ status: 404, description: 'Sub-order not found.' })
  // updateSubOrder(
  //   @Param('id') id: string,
  //   @Body() updateSubOrderDto: UpdateSubOrderDto,
  // ) {
  //   return this.subOrderService.updateSubOrder(id, updateSubOrderDto);
  // }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a sub-order' })
  @ApiParam({ name: 'id', description: 'Sub-order ID' })
  @ApiResponse({ status: 200, description: 'Sub-order deleted successfully' })
  @ApiResponse({ status: 404, description: 'Sub-order not found.' })
  deleteSubOrder(@Param('id') id: string) {
    return this.subOrderService.deleteSubOrder(id);
  }
}
