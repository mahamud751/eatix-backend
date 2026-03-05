import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { RestaurantOrderService } from './restaurant-order.service';
import { CreateRestaurantOrderDto } from './dto/create-restaurant-order.dto';
import { UpdateRestaurantOrderStatusDto } from './dto/update-restaurant-order-status.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../users/dto/currentUser';
import { RestaurantOrderStatus } from '@prisma/client';

@ApiTags('restaurant-orders')
@Controller('restaurant-orders')
export class RestaurantOrderController {
  constructor(private readonly restaurantOrderService: RestaurantOrderService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create a restaurant order (customer)' })
  @ApiResponse({ status: 201, description: 'Order created' })
  create(
    @CurrentUser() user: { id: string; role: string },
    @Body() dto: CreateRestaurantOrderDto,
  ) {
    return this.restaurantOrderService.create(user.id, dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'List orders (user: my orders, owner: my restaurant orders, admin: all)' })
  @ApiResponse({ status: 200, description: 'List of orders' })
  findAll(
    @CurrentUser() user: { id: string; role: string },
    @Query('status') status?: RestaurantOrderStatus,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.restaurantOrderService.findAll(user.id, user.role, {
      status,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('earnings')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Owner earnings (completed orders count, total)' })
  @ApiResponse({ status: 200, description: 'Earnings summary' })
  getEarnings(@CurrentUser() user: { id: string; role: string }) {
    const role = (user.role || '').toLowerCase();
    if (role !== 'owner' && role !== 'admin' && role !== 'superadmin') {
      throw new ForbiddenException('Only owner can view earnings');
    }
    return this.restaurantOrderService.getEarnings(user.id);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get one order by ID' })
  @ApiResponse({ status: 200, description: 'Order details' })
  findOne(
    @Param('id') id: string,
    @CurrentUser() user: { id: string; role: string },
  ) {
    return this.restaurantOrderService.findOne(id, user.id, user.role);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update order status (owner or admin)' })
  @ApiResponse({ status: 200, description: 'Order updated' })
  updateStatus(
    @Param('id') id: string,
    @CurrentUser() user: { id: string; role: string },
    @Body() dto: UpdateRestaurantOrderStatusDto,
  ) {
    return this.restaurantOrderService.updateStatus(id, user.id, user.role, dto.status);
  }
}
