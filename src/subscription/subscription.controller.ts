import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SubscriptionService } from './subscription.service';

@ApiTags('subscription')
@Controller('subscription')
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @Get('packages')
  @ApiOperation({ summary: 'Get all subscription packages' })
  @ApiResponse({ status: 200, description: 'Packages retrieved successfully' })
  async getPackages() {
    return this.subscriptionService.getPackages();
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get user subscription status and limits' })
  @ApiResponse({ status: 200, description: 'User subscription retrieved' })
  async getUserSubscription(@Param('userId') userId: string) {
    return this.subscriptionService.getUserSubscription(userId);
  }

  @Post('purchase')
  @ApiOperation({ summary: 'Purchase/upgrade subscription package' })
  @ApiResponse({ status: 200, description: 'Package purchased successfully' })
  async purchasePackage(
    @Body('userId') userId: string,
    @Body('packageId') packageId: string,
  ) {
    return this.subscriptionService.purchasePackage(userId, packageId);
  }
}
