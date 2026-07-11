import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { PrismaService } from '../prisma/prisma.service';

export type VerifiedPayment = {
  paymentIntentId: string;
  paymentMethod: string | null;
  amountPaid: number;
};

@Injectable()
export class PaymentsService {
  private readonly stripe: Stripe | null;
  private readonly webhookSecret: string | null;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const secretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    this.webhookSecret =
      this.configService.get<string>('STRIPE_WEBHOOK_SECRET') || null;
    this.stripe = secretKey ? new Stripe(secretKey) : null;
  }

  isEnabled(): boolean {
    return !!this.stripe;
  }

  getPublicConfig() {
    const publishableKey =
      this.configService.get<string>('STRIPE_PUBLISHABLE_KEY') || '';
    const secretKey = this.configService.get<string>('STRIPE_SECRET_KEY') || '';
    const publishableMode = publishableKey.startsWith('pk_live_')
      ? 'live'
      : publishableKey.startsWith('pk_test_')
        ? 'test'
        : 'unknown';
    const secretMode = secretKey.startsWith('sk_live_')
      ? 'live'
      : secretKey.startsWith('sk_test_')
        ? 'test'
        : 'unknown';

    return {
      enabled: this.isEnabled(),
      publishableKey,
      currency: 'gbp',
      merchantCountryCode: 'GB',
      stripeMode: publishableMode,
      keysMatch:
        publishableMode !== 'unknown' &&
        secretMode !== 'unknown' &&
        publishableMode === secretMode,
    };
  }

  toStripeAmount(totalGbp: number): number {
    return Math.max(0, Math.round(Number(totalGbp) * 100));
  }

  async createPaymentIntent(params: {
    userId: string;
    ownerId: string;
    totalAmount: number;
    currency?: string;
    description?: string;
  }) {
    if (!this.stripe) {
      throw new ServiceUnavailableException('Stripe is not configured');
    }

    const amount = this.toStripeAmount(params.totalAmount);
    if (amount <= 0) {
      throw new BadRequestException('Order total must be greater than zero');
    }

    const currency = String(params.currency || 'gbp').toLowerCase();

    try {
      const intent = await this.stripe.paymentIntents.create({
        amount,
        currency,
        // Card works with Payment Sheet + Google Pay / Apple Pay wallets.
        // automatic_payment_methods fails when dashboard methods aren't enabled for GBP.
        payment_method_types: ['card'],
        description: params.description || 'Eatwaze restaurant order',
        metadata: {
          userId: params.userId,
          ownerId: params.ownerId,
          totalAmountPence: String(amount),
        },
      });

      if (!intent.client_secret) {
        throw new ServiceUnavailableException('Failed to create payment intent');
      }

      return {
        paymentIntentId: intent.id,
        clientSecret: intent.client_secret,
        amount,
        currency,
      };
    } catch (err: unknown) {
      const stripeMessage =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message?: string }).message || '')
          : '';
      console.error('[Stripe] createPaymentIntent failed:', stripeMessage, err);
      throw new BadRequestException(
        stripeMessage || 'Payment provider could not start checkout',
      );
    }
  }

  async verifyPaymentForOrder(params: {
    paymentIntentId: string;
    userId: string;
    ownerId: string;
    totalAmount: number;
  }): Promise<VerifiedPayment> {
    if (!this.stripe) {
      throw new ServiceUnavailableException('Stripe is not configured');
    }

    const paymentIntentId = String(params.paymentIntentId || '').trim();
    if (!paymentIntentId) {
      throw new BadRequestException('paymentIntentId is required');
    }

    try {
      const existing = await this.prisma.restaurantOrder.findFirst({
        where: { stripePaymentIntentId: paymentIntentId },
        select: { id: true },
      });
      if (existing) {
        throw new BadRequestException(
          'This payment has already been used for an order',
        );
      }
    } catch (err) {
      if (err instanceof BadRequestException) {
        throw err;
      }
      console.warn(
        '[Payments] stripePaymentIntentId lookup skipped (run DB migration?):',
        err instanceof Error ? err.message : err,
      );
    }

    let intent: Stripe.PaymentIntent;
    try {
      intent = await this.stripe.paymentIntents.retrieve(paymentIntentId, {
        expand: ['latest_charge.payment_method_details'],
      });
    } catch (err: unknown) {
      const stripeMessage =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message?: string }).message || '')
          : '';
      throw new BadRequestException(
        stripeMessage || 'Could not verify payment with Stripe',
      );
    }

    if (intent.status !== 'succeeded') {
      throw new BadRequestException('Payment has not been completed');
    }

    const expectedAmount = this.toStripeAmount(params.totalAmount);
    if (intent.amount_received < expectedAmount) {
      throw new BadRequestException('Payment amount does not match order total');
    }

    const metaUserId = intent.metadata?.userId;
    const metaOwnerId = intent.metadata?.ownerId;
    if (metaUserId && metaUserId !== params.userId) {
      throw new BadRequestException('Payment does not belong to this user');
    }
    if (metaOwnerId && metaOwnerId !== params.ownerId) {
      throw new BadRequestException('Payment does not match this restaurant');
    }

    const paymentMethod = this.resolvePaymentMethod(intent);

    return {
      paymentIntentId,
      paymentMethod,
      amountPaid: intent.amount_received / 100,
    };
  }

  async handleWebhook(rawBody: Buffer, signature: string | string[] | undefined) {
    if (!this.stripe || !this.webhookSecret) {
      throw new ServiceUnavailableException('Stripe webhook is not configured');
    }
    if (!signature || Array.isArray(signature)) {
      throw new BadRequestException('Missing Stripe signature');
    }

    const event = this.stripe.webhooks.constructEvent(
      rawBody,
      signature,
      this.webhookSecret,
    );

    if (event.type === 'payment_intent.succeeded') {
      const intent = event.data.object as Stripe.PaymentIntent;
      await this.prisma.restaurantOrder.updateMany({
        where: {
          stripePaymentIntentId: intent.id,
          paymentStatus: { not: 'paid' },
        },
        data: {
          paymentStatus: 'paid',
          paidAt: new Date(),
          paymentMethod: this.resolvePaymentMethod(intent),
        },
      });
    }

    return { received: true };
  }

  private resolvePaymentMethod(intent: Stripe.PaymentIntent): string | null {
    const latestCharge = intent.latest_charge;
    if (!latestCharge || typeof latestCharge === 'string') {
      return intent.payment_method_types?.[0] || 'card';
    }
    const details = latestCharge.payment_method_details;
    if (details?.card?.wallet?.type) {
      return details.card.wallet.type;
    }
    if (details?.type) {
      return details.type;
    }
    return intent.payment_method_types?.[0] || 'card';
  }
}
