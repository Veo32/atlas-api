import { Body, Controller, Get, Headers, Param, Post, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { BillingService } from './billing.service';

@ApiTags('billing')
@Controller('billing')
export class BillingController {
  constructor(private readonly billing: BillingService) {}

  @Get('plans')
  plans() {
    return this.billing.plans();
  }

  @Post('checkout')
  checkout(
    @Body()
    body: {
      provider: string;
      planSlug: string;
      userId?: string;
      customerEmail?: string;
      successUrl: string;
      cancelUrl: string;
    }
  ) {
    return this.billing.checkout(body);
  }

  @Post('webhook/:provider')
  webhook(@Param('provider') provider: string, @Body() body: unknown, @Req() request: Request, @Headers('stripe-signature') signature?: string) {
    return this.billing.webhook(provider, body, (request as Request & { rawBody?: Buffer }).rawBody, signature);
  }
}
