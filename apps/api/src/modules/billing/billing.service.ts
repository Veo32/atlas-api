import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BillingProvider } from '@prisma/client';
import Stripe from 'stripe';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class BillingService {
  private readonly stripe?: Stripe;

  constructor(private readonly prisma: PrismaService, private readonly config: ConfigService) {
    const stripeSecretKey = this.config.get<string>('STRIPE_SECRET_KEY');
    if (stripeSecretKey && !stripeSecretKey.includes('sk_test_x')) {
      this.stripe = new Stripe(stripeSecretKey);
    }
  }

  plans() {
    return this.prisma.plan.findMany({ where: { isPublic: true }, orderBy: { price: 'asc' } });
  }

  async checkout(input: {
    provider: string;
    planSlug: string;
    userId?: string;
    customerEmail?: string;
    successUrl: string;
    cancelUrl: string;
  }) {
    const plan = await this.prisma.plan.findUniqueOrThrow({ where: { slug: input.planSlug } });

    if (Number(plan.price) === 0) {
      return { provider: input.provider, plan, checkoutUrl: input.successUrl };
    }

    if (input.provider.toLowerCase() !== 'stripe') {
      throw new BadRequestException('Only Stripe checkout is implemented right now.');
    }

    if (!this.stripe) {
      throw new BadRequestException('Stripe is not configured. Add STRIPE_SECRET_KEY to .env.');
    }

    const session = await this.stripe.checkout.sessions.create({
      mode: 'subscription',
      success_url: `${input.successUrl}?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${input.cancelUrl}?checkout=cancelled`,
      customer_email: input.customerEmail,
      client_reference_id: input.userId,
      metadata: {
        userId: input.userId ?? '',
        planId: plan.id,
        planSlug: plan.slug
      },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: plan.currency.toLowerCase(),
            recurring: { interval: plan.interval === 'year' ? 'year' : 'month' },
            unit_amount: Math.round(Number(plan.price) * 100),
            product_data: {
              name: `AtlasAI.tools ${plan.name}`,
              description: plan.description ?? undefined
            }
          }
        }
      ]
    });

    if (input.userId) {
      await this.prisma.subscription.create({
        data: {
          userId: input.userId,
          planId: plan.id,
          provider: BillingProvider.STRIPE,
          providerCustomerId: typeof session.customer === 'string' ? session.customer : undefined,
          providerSubId: typeof session.subscription === 'string' ? session.subscription : undefined,
          status: 'checkout_started'
        }
      });
    }

    return {
      provider: 'stripe',
      plan,
      checkoutUrl: session.url
    };
  }

  async webhook(provider: string, body: unknown, rawBody?: Buffer, signature?: string) {
    if (provider.toLowerCase() !== 'stripe') {
      return { received: true, provider, ignored: true };
    }

    let event = body as Stripe.Event;
    const webhookSecret = this.config.get<string>('STRIPE_WEBHOOK_SECRET');
    if (this.stripe && webhookSecret && signature && rawBody) {
      event = this.stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    }

    if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
      const session = event.data.object as Stripe.Checkout.Session;
      await this.recordStripeCheckout(session);
    }

    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object as Stripe.Subscription;
      await this.prisma.subscription.updateMany({
        where: { provider: BillingProvider.STRIPE, providerSubId: subscription.id },
        data: { status: 'cancelled' }
      });
    }

    return { received: true, provider: 'stripe', type: event.type };
  }

  private async recordStripeCheckout(session: Stripe.Checkout.Session) {
    const email = session.customer_details?.email ?? session.customer_email;
    const amount = session.amount_total ? session.amount_total / 100 : 0;
    const currency = session.currency?.toUpperCase() ?? 'USD';
    const planSlug = session.metadata?.planSlug || this.planSlugFromAmount(amount);
    const paymentLink = typeof session.payment_link === 'string' ? session.payment_link : undefined;

    const user = email
      ? await this.prisma.user.upsert({
          where: { email },
          update: { updatedAt: new Date() },
          create: { email, name: session.customer_details?.name ?? undefined }
        })
      : null;

    if (email) {
      await this.prisma.emailLead.upsert({
        where: { email },
        update: {
          planSlug: planSlug ?? undefined,
          source: 'stripe_webhook',
          metadata: { provider: 'stripe', paymentLink, amount, currency, sessionId: session.id }
        },
        create: {
          email,
          planSlug: planSlug ?? undefined,
          source: 'stripe_webhook',
          metadata: { provider: 'stripe', paymentLink, amount, currency, sessionId: session.id }
        }
      });
    }

    if (user && planSlug) {
      const plan = await this.prisma.plan.findUnique({ where: { slug: planSlug } });
      if (plan && Number(plan.price) > 0) {
        await this.prisma.subscription.upsert({
          where: { id: `stripe_${session.id}` },
          update: {
            status: 'active',
            providerCustomerId: typeof session.customer === 'string' ? session.customer : undefined,
            providerSubId: typeof session.subscription === 'string' ? session.subscription : session.id
          },
          create: {
            id: `stripe_${session.id}`,
            userId: user.id,
            planId: plan.id,
            provider: BillingProvider.STRIPE,
            providerCustomerId: typeof session.customer === 'string' ? session.customer : undefined,
            providerSubId: typeof session.subscription === 'string' ? session.subscription : session.id,
            status: 'active'
          }
        });
      }
    }

    await this.prisma.analyticsEvent.create({
      data: {
        type: 'CONVERSION',
        userId: user?.id,
        source: 'stripe',
        path: '/billing/webhook/stripe',
        metadata: { amount, currency, planSlug, paymentLink, sessionId: session.id }
      }
    });
  }

  private planSlugFromAmount(amount: number) {
    if (amount === 29) return 'pro';
    if (amount === 199) return 'scale';
    return undefined;
  }
}
