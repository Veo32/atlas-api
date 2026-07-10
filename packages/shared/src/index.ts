import { z } from 'zod';

export const locales = ['en', 'ar', 'es', 'zh', 'hi'] as const;
export type Locale = (typeof locales)[number];

export const toolSearchSchema = z.object({
  q: z.string().trim().optional(),
  category: z.string().trim().optional(),
  tags: z.array(z.string()).optional(),
  pricing: z.array(z.string()).optional(),
  rating: z.coerce.number().min(0).max(5).optional(),
  sponsored: z.coerce.boolean().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(24),
  locale: z.enum(locales).default('en')
});

export const createToolSchema = z.object({
  name: z.string().min(2).max(120),
  tagline: z.string().min(8).max(180),
  description: z.string().min(40).max(8000),
  websiteUrl: z.string().url(),
  logoUrl: z.string().url().optional(),
  categorySlugs: z.array(z.string()).min(1),
  tagSlugs: z.array(z.string()).default([]),
  pricingModel: z.enum(['free', 'freemium', 'subscription', 'paid', 'enterprise']).default('freemium'),
  startingPrice: z.number().nonnegative().optional(),
  affiliateUrl: z.string().url().optional()
});

export const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  title: z.string().max(120).optional(),
  body: z.string().max(4000).optional()
});

export const importToolSchema = createToolSchema.extend({
  externalId: z.string().optional(),
  source: z.string().default('csv')
});

export const pricingPlanSchema = z.object({
  slug: z.string(),
  name: z.string(),
  price: z.number(),
  interval: z.enum(['month', 'year']),
  features: z.array(z.string()),
  limits: z.record(z.union([z.string(), z.number(), z.boolean()]))
});

export type ToolSearchInput = z.infer<typeof toolSearchSchema>;
export type CreateToolInput = z.infer<typeof createToolSchema>;
export type ReviewInput = z.infer<typeof reviewSchema>;
