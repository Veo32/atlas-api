import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class LeadsService {
  constructor(private readonly prisma: PrismaService) {}

  async capture(input: {
    email: string;
    name?: string;
    planSlug?: string;
    source?: string;
    locale?: string;
    consent?: boolean;
    metadata?: Record<string, unknown>;
  }) {
    const email = input.email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new BadRequestException('Valid email is required');
    }

    const metadata = (input.metadata ?? {}) as Prisma.InputJsonObject;

    return this.prisma.emailLead.upsert({
      where: { email },
      update: {
        name: input.name,
        planSlug: input.planSlug,
        source: input.source ?? 'pricing',
        locale: input.locale ?? 'en',
        consent: input.consent ?? true,
        metadata
      },
      create: {
        email,
        name: input.name,
        planSlug: input.planSlug,
        source: input.source ?? 'pricing',
        locale: input.locale ?? 'en',
        consent: input.consent ?? true,
        metadata
      }
    });
  }
}
