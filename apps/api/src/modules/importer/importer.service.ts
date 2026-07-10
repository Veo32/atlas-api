import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class ImporterService {
  constructor(@InjectQueue('tool-imports') private readonly importQueue: Queue, private readonly prisma: PrismaService) {}

  async enqueue(source: string, payload: unknown) {
    const job = await this.prisma.importJob.create({ data: { source, stats: { queued: true } } });
    await this.importQueue.add('ingest-tools', { jobId: job.id, source, payload });
    return job;
  }
}
