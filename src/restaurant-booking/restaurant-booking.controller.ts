import { Body, Controller, Get, Patch, Post, Param, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../users/dto/currentUser';
import { CreateRestaurantBookingDto } from './dto/create-restaurant-booking.dto';
import { RestaurantBookingService } from './restaurant-booking.service';

type RestaurantBookingStatus =
  | 'pending'
  | 'confirmed'
  | 'completed'
  | 'cancelled';

@ApiTags('restaurant-bookings')
@Controller('restaurant-bookings')
export class RestaurantBookingController {
  constructor(private readonly restaurantBookingService: RestaurantBookingService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create a restaurant booking' })
  @ApiResponse({ status: 201, description: 'Booking created' })
  create(
    @CurrentUser() user: { id: string; role: string },
    @Body() dto: CreateRestaurantBookingDto,
  ) {
    return this.restaurantBookingService.create(user.id, dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'List bookings for current user/owner/admin' })
  findAll(
    @CurrentUser() user: { id: string; role: string },
    @Query('status') status?: RestaurantBookingStatus,
    @Query('scope') scope?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.restaurantBookingService.findAll(user.id, user.role, {
      status,
      scope,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update booking status (owner/admin)' })
  updateStatus(
    @Param('id') id: string,
    @CurrentUser() user: { id: string; role: string },
    @Body() dto: { status: RestaurantBookingStatus },
  ) {
    return this.restaurantBookingService.updateStatus(
      id,
      user.id,
      user.role,
      dto.status,
    );
  }
}
