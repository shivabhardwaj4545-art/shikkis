import { z } from 'zod';

export const createBannerSchema = z.object({
  title: z.string().min(2, 'Title is required'),
  subtitle: z.string().optional(),
  ctaText: z.string().default('Shop Collection'),
  ctaLink: z.string().default('/catalog'),
  badgeText: z.string().optional(),
  isActive: z.boolean().default(true),
});

export type CreateBannerInput = z.infer<typeof createBannerSchema>;
