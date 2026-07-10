import { Injectable } from '@nestjs/common';
import { EventType } from '@prisma/client';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  track(input: { type: string; toolId?: string; source?: string; country?: string; path?: string; metadata?: object }) {
    return this.prisma.analyticsEvent.create({
      data: { type: input.type as EventType, toolId: input.toolId, source: input.source, country: input.country, path: input.path, metadata: input.metadata ?? {} }
    });
  }

  async dashboard(from?: string, to?: string) {
    const occurredAt = {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to ? { lte: new Date(to) } : {})
    };
    const [events, users, tools, paidPlans, leads, conversions, sources, topTools, activeSubscriptions] = await this.prisma.$transaction([
      this.prisma.analyticsEvent.groupBy({ by: ['type'], where: { occurredAt }, orderBy: { type: 'asc' }, _count: true }),
      this.prisma.user.count(),
      this.prisma.tool.count({ where: { status: 'APPROVED' } }),
      this.prisma.subscription.count({ where: { status: { in: ['active', 'trialing'] } } }),
      this.prisma.emailLead.count(),
      this.prisma.analyticsEvent.findMany({
        where: { type: 'CONVERSION', occurredAt },
        select: { metadata: true, occurredAt: true },
        orderBy: { occurredAt: 'desc' },
        take: 100
      }),
      this.prisma.analyticsEvent.groupBy({
        by: ['source'],
        where: { type: 'CLICK', occurredAt },
        _count: true,
        orderBy: { _count: { source: 'desc' } },
        take: 10
      }),
      this.prisma.analyticsEvent.groupBy({
        by: ['toolId'],
        where: { type: 'CLICK', occurredAt, toolId: { not: null } },
        _count: true,
        orderBy: { _count: { toolId: 'desc' } },
        take: 10
      }),
      this.prisma.subscription.findMany({
        where: { status: { in: ['active', 'trialing'] } },
        include: { plan: true }
      })
    ]);
    const impressions = Number(events.find((e) => e.type === 'IMPRESSION')?._count ?? 0);
    const clicks = Number(events.find((e) => e.type === 'CLICK')?._count ?? 0);
    const conversionCount = Number(events.find((e) => e.type === 'CONVERSION')?._count ?? 0);
    const trackedRevenue = conversions.reduce((total, event) => {
      const metadata = event.metadata as { amount?: number } | null;
      return total + Number(metadata?.amount ?? 0);
    }, 0);
    const mrr = activeSubscriptions.reduce((total, subscription) => {
      const price = Number(subscription.plan.price);
      return total + (subscription.plan.interval === 'year' ? price / 12 : price);
    }, 0);

    return {
      summary: {
        users,
        tools,
        leads,
        paidPlans,
        impressions,
        clicks,
        conversions: conversionCount,
        ctr: impressions ? clicks / impressions : 0,
        trackedRevenue,
        mrr,
        arr: mrr * 12
      },
      events,
      sources,
      topTools,
      recentConversions: conversions
    };
  }
}
