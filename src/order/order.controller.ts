import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Patch,
  // Put,
} from '@nestjs/common';
import { OrderService } from './order.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { UpdateOrderDto } from './dto/update-order.dto';

@ApiTags('Orders')
@Controller('orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new order' })
  @ApiResponse({
    status: 201,
    description: 'The order has been successfully created.',
  })
  createOrder(@Body() createOrderDto: CreateOrderDto) {
    return this.orderService.createOrder(createOrderDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all orders' })
  @ApiResponse({ status: 200, description: 'List of all orders' })
  async findAll(
    @Query('page') page: number = 1,
    @Query('perPage') perPage: number = 10,
    @Query('email') email?: string,
  ) {
    return this.orderService.findAll(page, perPage, email);
  }

  @Get('/user-orders')
  @ApiOperation({
    summary: 'Get orders and optionally getState for a specific email',
  })
  @ApiResponse({
    status: 200,
    description: 'List of orders or getState items for the provided email',
  })
  async findOrdersByEmail(
    @Query('email') email: string,
    @Query('page') page: number = 1,
    @Query('perPage') perPage: number = 10,

    // @Query('isDeleted') isDeleted: Boolean = false,
  ) {
    return this.orderService.findOrdersByEmail(
      email,
      page,
      perPage,

      // isDeleted,
    );
  }

  // @Get('/totalGrandPrice')
  // @ApiOperation({ summary: 'Get total grand price of all orders' })
  // @ApiResponse({ status: 200, description: 'Total grand price' })
  // getTotalGrandPrice() {
  //   return this.orderService.calculateTotalGrandPrice();
  // }

  @Get('/:id')
  @ApiOperation({ summary: 'Get order by ID' })
  @ApiParam({ name: 'id', description: 'Order ID' })
  @ApiResponse({ status: 200, description: 'The order details' })
  getOrderById(@Param('id') id: string) {
    return this.orderService.getOrderById(id);
  }

  @Patch('/:id')
  @ApiOperation({ summary: 'Update an order' })
  @ApiParam({ name: 'id', description: 'Order ID' })
  @ApiResponse({ status: 200, description: 'The updated order details' })
  updateOrder(@Param('id') id: string, @Body() updateData: any) {
    return this.orderService.updateOrder(id, updateData);
  }

  @Patch(':id/assign')
  @ApiOperation({ summary: 'Assign riders to an order by ID' })
  @ApiParam({ name: 'id', description: 'ID of the order to update' })
  @ApiResponse({ status: 200, description: 'The updated order' })
  @ApiResponse({ status: 404, description: 'order not found' })
  async assignRiderToOrder(
    @Param('id') id: string,
    @Body() updateOrderDto: UpdateOrderDto,
  ) {
    return this.orderService.assignRiderToOrder(id, updateOrderDto);
  }
}
