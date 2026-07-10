import { PrismaClient, Role } from '@prisma/client';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

function loadPrismaEnv() {
  if (process.env.DATABASE_URL) return;

  try {
    const envPath = join(__dirname, '.env');
    const envFile = readFileSync(envPath, 'utf8');
    const databaseUrl = envFile
      .split(/\r?\n/)
      .find((line) => line.trim().startsWith('DATABASE_URL='))
      ?.split('=')
      .slice(1)
      .join('=')
      .trim();

    if (databaseUrl) process.env.DATABASE_URL = databaseUrl;
  } catch {
    // Prisma will show the normal DATABASE_URL error if the file is missing.
  }
}

loadPrismaEnv();

const prisma = new PrismaClient();

async function main() {
  const admin = await prisma.user.upsert({
    where: { email: 'admin@aitools.local' },
    update: {},
    create: { email: 'admin@aitools.local', name: 'Directory Admin', roles: [Role.SUPER_ADMIN, Role.ADMIN] }
  });

  const categories = [
    ['writing', 'Writing'],
    ['image-generation', 'Image Generation'],
    ['coding', 'Coding'],
    ['automation', 'Automation'],
    ['marketing', 'Marketing']
  ];

  for (const [slug, name] of categories) {
    await prisma.category.upsert({
      where: { slug },
      update: {},
      create: { slug, name, description: `${name} AI tools and workflows` }
    });
  }

  const tool = await prisma.tool.upsert({
    where: { slug: 'promptpilot' },
    update: {},
    create: {
      slug: 'promptpilot',
      name: 'PromptPilot',
      tagline: 'AI prompt workspace for teams',
      description: 'Collaborative prompt management, testing, approval workflows, and analytics for production AI teams.',
      websiteUrl: 'https://example.com/promptpilot',
      status: 'APPROVED',
      pricingModel: 'subscription',
      startingPrice: 19,
      ownerId: admin.id,
      isFeatured: true,
      seoTitle: 'PromptPilot AI Tool Review',
      seoDescription: 'Discover PromptPilot features, pricing, reviews, alternatives, and team workflows.'
    }
  });

  const category = await prisma.category.findUniqueOrThrow({ where: { slug: 'automation' } });
  await prisma.toolCategory.upsert({
    where: { toolId_categoryId: { toolId: tool.id, categoryId: category.id } },
    update: {},
    create: { toolId: tool.id, categoryId: category.id }
  });

  const plans = [
    {
      slug: 'starter',
      name: 'Starter',
      description: 'For visitors who want to save tools and build public collections.',
      price: 0,
      features: ['Directory access', 'Bookmarks', 'Public collections'],
      limits: { listings: 0, apiCalls: 1000 }
    },
    {
      slug: 'pro',
      name: 'Pro',
      description: 'For founders and tool vendors growing listings and analytics.',
      price: 29,
      features: ['Featured placement credits', 'Advanced analytics', 'API access'],
      limits: { listings: 10, apiCalls: 100000 }
    },
    {
      slug: 'scale',
      name: 'Scale',
      description: 'For teams buying sponsored placements, white-label access, and bulk imports.',
      price: 199,
      features: ['Sponsored placements', 'White label', 'Bulk import'],
      limits: { listings: 100, apiCalls: 1000000 }
    }
  ];

  for (const plan of plans) {
    await prisma.plan.upsert({
      where: { slug: plan.slug },
      update: plan,
      create: plan
    });
  }
}

main().finally(() => prisma.$disconnect());
