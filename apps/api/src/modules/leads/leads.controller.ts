import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { LeadsService } from './leads.service';

@ApiTags('leads')
@Controller('leads')
export class LeadsController {
  constructor(private readonly leads: LeadsService) {}

  @Post()
  capture(
    @Body()
    body: {
      email: string;
      name?: string;
      planSlug?: string;
      source?: string;
      locale?: string;
      consent?: boolean;
      metadata?: Record<string, unknown>;
    }
  ) {
    return this.leads.capture(body);
  }
}
