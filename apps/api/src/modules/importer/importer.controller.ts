import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ImporterService } from './importer.service';

@ApiTags('importer')
@Controller('imports')
export class ImporterController {
  constructor(private readonly importer: ImporterService) {}

  @Post('csv')
  csv(@Body() body: { sourceUrl?: string; rows?: unknown[] }) {
    return this.importer.enqueue('csv', body);
  }

  @Post('api')
  api(@Body() body: { endpoint: string; token?: string }) {
    return this.importer.enqueue('api', body);
  }
}
