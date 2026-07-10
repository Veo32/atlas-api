import { Body, Controller, Get, Param, Post, Query, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { createToolSchema, toolSearchSchema } from '@aitools/shared';
import { Response } from 'express';
import { ToolsService } from './tools.service';

@ApiTags('tools')
@Controller('tools')
export class ToolsController {
  constructor(private readonly tools: ToolsService) {}

  @Get()
  search(@Query() query: Record<string, unknown>) {
    return this.tools.search(toolSearchSchema.parse(query));
  }

  @Get('featured')
  featured() {
    return this.tools.featured();
  }

  @Get('latest')
  latest() {
    return this.tools.latest();
  }

  @Get('compare')
  compare(@Query('slugs') slugs: string) {
    return this.tools.compare((slugs ?? '').split(',').filter(Boolean));
  }

  @Get(':slug/visit')
  async visit(@Param('slug') slug: string, @Query('source') source = 'directory', @Res() response: Response) {
    const url = await this.tools.trackVisit(slug, source);
    return response.redirect(url);
  }

  @Get(':slug')
  bySlug(@Param('slug') slug: string, @Query('locale') locale = 'en') {
    return this.tools.bySlug(slug, locale);
  }

  @Post()
  create(@Body() body: unknown) {
    return this.tools.create(createToolSchema.parse(body));
  }
}
