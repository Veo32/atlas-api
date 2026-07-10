import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class ImporterService {
  constructor(private readonly prisma: PrismaService) {}

  async enqueue(source: string, payload: unknown) {
    return this.prisma.importJob.create({
      data: {
        source,
        stats: {
          queued: false,
          stored: true,
          payloadType: typeof payload,
          note: 'Import queue is disabled until REDIS_URL is configured.'
        }
      }
    });
  }
}
