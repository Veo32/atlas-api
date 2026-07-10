import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateToolInput, ToolSearchInput } from '@aitools/shared';
import slugify from 'slugify';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class ToolsService {
  constructor(private readonly prisma: PrismaService) {}

  async search(input: ToolSearchInput) {
    const where = {
      status: 'APPROVED' as const,
      ...(input.q
        ? {
            OR: [
              { name: { contains: input.q, mode: 'insensitive' as const } },
              { tagline: { contains: input.q, mode: 'insensitive' as const } },
              { description: { contains: input.q, mode: 'insensitive' as const } }
            ]
          }
        : {}),
      ...(input.sponsored ? { isSponsored: true } : {}),
      ...(input.category
        ? { categories: { some: { category: { slug: input.category } } } }
        : {})
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.tool.findMany({
        where,
        include: { categories: { include: { category: true } }, tags: { include: { tag: true } } },
        orderBy: [{ isSponsored: 'desc' }, { sponsorWeight: 'desc' }, { popularityScore: 'desc' }],
        skip: (input.page - 1) * input.limit,
        take: input.limit
      }),
      this.prisma.tool.count({ where })
    ]);
    return { items, total, page: input.page, limit: input.limit };
  }

  featured() {
    return this.prisma.tool.findMany({ where: { status: 'APPROVED', isFeatured: true }, take: 12 });
  }

  latest() {
    return this.prisma.tool.findMany({ where: { status: 'APPROVED' }, orderBy: { createdAt: 'desc' }, take: 24 });
  }

  async bySlug(slug: string, locale: string) {
    const tool = await this.prisma.tool.findUnique({
      where: { slug },
      include: { translations: { where: { locale } }, categories: { include: { category: true } }, reviews: true }
    });
    if (!tool) throw new NotFoundException('Tool not found');
    return tool;
  }

  async trackVisit(slug: string, source: string) {
    const tool = await this.prisma.tool.findUnique({ where: { slug } });
    if (!tool) throw new NotFoundException('Tool not found');

    const destination = tool.affiliateUrl || tool.websiteUrl;
    await this.prisma.$transaction([
      this.prisma.analyticsEvent.create({
        data: {
          type: 'CLICK',
          toolId: tool.id,
          source,
          path: `/tools/${slug}/visit`,
          metadata: {
            affiliate: Boolean(tool.affiliateUrl),
            destination
          }
        }
      }),
      this.prisma.tool.update({
        where: { id: tool.id },
        data: { popularityScore: { increment: 1 } }
      })
    ]);

    return destination;
  }

  compare(slugs: string[]) {
    return this.prisma.tool.findMany({
      where: { slug: { in: slugs }, status: 'APPROVED' },
      include: { categories: { include: { category: true } }, reviews: true }
    });
  }

  async create(input: CreateToolInput) {
    const baseSlug = slugify(input.name, { lower: true, strict: true });
    const slug = await this.uniqueSlug(baseSlug);
    const categories = await this.prisma.category.findMany({ where: { slug: { in: input.categorySlugs } } });
    return this.prisma.tool.create({
      data: {
        slug,
        name: input.name,
        tagline: input.tagline,
        description: input.description,
        websiteUrl: input.websiteUrl,
        logoUrl: input.logoUrl,
        pricingModel: input.pricingModel,
        startingPrice: input.startingPrice,
        affiliateUrl: input.affiliateUrl,
        categories: { create: categories.map((category) => ({ categoryId: category.id })) },
        tags: {
          create: input.tagSlugs.map((tagSlug: string) => ({
            tag: { connectOrCreate: { where: { slug: tagSlug }, create: { slug: tagSlug, name: tagSlug } } }
          }))
        }
      }
    });
  }

  private async uniqueSlug(base: string) {
    let slug = base;
    let suffix = 2;
    while (await this.prisma.tool.findUnique({ where: { slug } })) {
      slug = `${base}-${suffix++}`;
    }
    return slug;
  }
}
