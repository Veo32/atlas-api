import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';

@ApiTags('analytics')
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Post('track')
  track(@Body() body: { type: string; toolId?: string; source?: string; country?: string; path?: string; metadata?: object }) {
    return this.analytics.track(body);
  }

  @Get('dashboard')
  dashboard(@Query('from') from?: string, @Query('to') to?: string) {
    return this.analytics.dashboard(from, to);
  }
}
