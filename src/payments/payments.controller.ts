import {
  Body,
  Controller,
  Get,
  Headers,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../users/dto/currentUser';
import { CreateRestaurantOrderDto } from '../restaurant-order/dto/create-restaurant-order.dto';
import { RestaurantOrderService } from '../restaurant-order/restaurant-order.service';
import { PaymentsService } from './payments.service';

type RawBodyRequest = Request & { rawBody?: Buffer };

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly restaurantOrderService: RestaurantOrderService,
  ) {}

  @Get('config')
  @ApiOperation({ summary: 'Public Stripe config for mobile checkout' })
  getConfig() {
    return this.paymentsService.getPublicConfig();
  }

  @Post('create-intent')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create Stripe PaymentIntent for restaurant checkout' })
  async createIntent(
    @CurrentUser() user: { id: string },
    @Body() dto: CreateRestaurantOrderDto,
  ) {
    const prepared = await this.restaurantOrderService.prepareCreateOrder(
      user.id,
      dto,
    );

    if (prepared.totalAmount <= 0) {
      return {
        requiresPayment: false,
        totalAmount: prepared.totalAmount,
        currency: prepared.currency,
      };
    }

    const intent = await this.paymentsService.createPaymentIntent({
      userId: user.id,
      ownerId: prepared.ownerId,
      totalAmount: prepared.totalAmount,
      currency: prepared.currency,
      description: `Order from ${prepared.ownerName}`,
    });

    return {
      requiresPayment: true,
      totalAmount: prepared.totalAmount,
      currency: prepared.currency,
      ...intent,
    };
  }

  @Post('webhook')
  @ApiOperation({ summary: 'Stripe webhook (raw body)' })
  async webhook(
    @Req() req: RawBodyRequest,
    @Headers('stripe-signature') signature: string,
  ) {
    const rawBody = req.rawBody || Buffer.from('');
    return this.paymentsService.handleWebhook(rawBody, signature);
  }
}
