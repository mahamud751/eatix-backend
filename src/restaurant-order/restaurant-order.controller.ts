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
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { RestaurantOrderService } from './restaurant-order.service';
import { CreateRestaurantOrderDto } from './dto/create-restaurant-order.dto';
import { UpdateRestaurantOrderStatusDto } from './dto/update-restaurant-order-status.dto';
import { AssignRiderDto } from './dto/assign-rider.dto';
import { UpsertRestaurantOrderReviewDto } from './dto/upsert-restaurant-order-review.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminRoleGuard } from '../auth/AdminRoleGuard';
import { CurrentUser } from '../users/dto/currentUser';
import { RestaurantOrderStatus } from '@prisma/client';

@ApiTags('restaurant-orders')
@Controller('restaurant-orders')
export class RestaurantOrderController {
  constructor(
    private readonly restaurantOrderService: RestaurantOrderService,
  ) {}

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
  @ApiOperation({
    summary:
      'List orders (user: my orders, owner: my restaurant orders, admin: all)',
  })
  @ApiResponse({ status: 200, description: 'List of orders' })
  findAll(
    @CurrentUser() user: { id: string; role: string },
    @Query('status') status?: RestaurantOrderStatus,
    @Query('scope') scope?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.restaurantOrderService.findAll(user.id, user.role, {
      status,
      scope,
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

  @Get('counts')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Order counts for badge / rider dashboard' })
  @ApiResponse({ status: 200, description: 'Pending, completed, rejected counts' })
  getCounts(@CurrentUser() user: { id: string; role: string }) {
    return this.restaurantOrderService.getOrderCounts(user.id, user.role);
  }

  @Get('subscribers-who-ordered')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'List my subscribers who ordered from a restaurant owner',
  })
  @ApiResponse({ status: 200, description: 'Subscriber users list' })
  listSubscribersWhoOrdered(
    @CurrentUser() user: { id: string; role: string },
    @Query('ownerId') ownerId?: string,
  ) {
    return this.restaurantOrderService.listMySubscribersWhoOrderedFromOwner(
      user.id,
      ownerId || '',
    );
  }

  @Get('top-restaurants')
  @ApiOperation({ summary: 'Top restaurants by order count (public)' })
  @ApiResponse({ status: 200, description: 'Top restaurants list' })
  getTopRestaurants(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('nearbyLat') nearbyLat?: string,
    @Query('nearbyLng') nearbyLng?: string,
    @Query('radiusKm') radiusKm?: string,
  ) {
    const lat = nearbyLat != null ? parseFloat(nearbyLat) : undefined;
    const lng = nearbyLng != null ? parseFloat(nearbyLng) : undefined;
    const radius =
      radiusKm != null ? parseFloat(radiusKm) : undefined;
    return this.restaurantOrderService.getTopRestaurantsByOrders(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
      {
        nearbyLat: Number.isFinite(lat!) ? lat : undefined,
        nearbyLng: Number.isFinite(lng!) ? lng : undefined,
        radiusKm: Number.isFinite(radius!) ? radius : undefined,
      },
    );
  }

  // Reviews
  @Get('reviews')
  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  @ApiOperation({ summary: 'List all order reviews (admin)' })
  @ApiResponse({ status: 200, description: 'List of reviews' })
  listReviews(
    @CurrentUser() user: { id: string; role: string },
    @Query('page') page?: string,
    @Query('perPage') perPage?: string,
  ) {
    return this.restaurantOrderService.listReviews(user.id, user.role, {
      page: page ? parseInt(page, 10) : undefined,
      perPage: perPage ? parseInt(perPage, 10) : undefined,
    });
  }

  @Get(':id/review')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get a review for an order' })
  @ApiResponse({ status: 200, description: 'Review (or null)' })
  getReview(
    @Param('id') id: string,
    @CurrentUser() user: { id: string; role: string },
  ) {
    return this.restaurantOrderService.getReview(id, user.id, user.role);
  }

  @Patch(':id/review')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create/update my review for an order (customer)' })
  @ApiResponse({ status: 200, description: 'Upserted review' })
  upsertReview(
    @Param('id') id: string,
    @CurrentUser() user: { id: string; role: string },
    @Body() dto: UpsertRestaurantOrderReviewDto,
  ) {
    return this.restaurantOrderService.upsertReview(id, user.id, user.role, dto);
  }

  @Delete(':id/review')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Delete my review for an order (customer) / admin delete' })
  @ApiResponse({ status: 200, description: 'Deleted' })
  deleteReview(
    @Param('id') id: string,
    @CurrentUser() user: { id: string; role: string },
  ) {
    return this.restaurantOrderService.deleteReview(id, user.id, user.role);
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

  @Patch(':id/assign-rider')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Assign a delivery rider (restaurant owner)' })
  @ApiResponse({ status: 200, description: 'Order updated with rider' })
  assignRider(
    @Param('id') id: string,
    @CurrentUser() user: { id: string; role: string },
    @Body() dto: AssignRiderDto,
  ) {
    return this.restaurantOrderService.assignRider(
      id,
      user.id,
      user.role,
      dto.riderId,
    );
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
    return this.restaurantOrderService.updateStatus(
      id,
      user.id,
      user.role,
      dto.status,
    );
  }
}
