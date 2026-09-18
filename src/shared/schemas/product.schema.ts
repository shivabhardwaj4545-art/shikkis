import { z } from 'zod';

export const productVariantSchema = z.object({
  id: z.string().optional(),
  size: z.enum(['XS', 'S', 'M', 'L', 'XL', 'XXL', 'FREE_SIZE']),
  color: z.string().min(1, 'Color is required'),
  stockQuantity: z.number().int().nonnegative('Stock quantity must be a non-negative integer'),
  sku: z.string().min(1, 'SKU is required'),
});

export const createProductSchema = z.object({
  title: z.string().min(2, 'Title must be at least 2 characters'),
  slug: z.string().min(2, 'Slug is required'),
  categoryId: z.string().min(1, 'Category is required'),
  description: z.string().min(10, 'Description must be detailed'),
  fabric: z.string().min(2, 'Fabric details required'),
  craft: z.string().min(2, 'Craft details required'),
  pricePaise: z.number().int().positive('Price in paise must be positive integer'),
  discountPricePaise: z.number().int().nonnegative().optional(),
  isFeatured: z.boolean().default(false),
  isActive: z.boolean().default(true),
  images: z.array(z.object({
    imageUrl: z.string().url('Must be valid image URL'),
    altText: z.string().optional(),
    isPrimary: z.boolean().default(false),
  })).min(1, 'At least 1 product image required'),
  variants: z.array(productVariantSchema).min(1, 'At least 1 product variant required'),
});

export const productQuerySchema = z.object({
  gender: z.enum(['women', 'men', 'unisex', 'all']).optional(),
  categoryId: z.string().optional(),
  minPricePaise: z.coerce.number().int().nonnegative().optional(),
  maxPricePaise: z.coerce.number().int().positive().optional(),
  search: z.string().optional(),
  sort: z.enum(['newest', 'price-low', 'price-high', 'title']).optional().default('newest'),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().optional().default(12),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type ProductQueryInput = z.infer<typeof productQuerySchema>;
export type ProductVariantInput = z.infer<typeof productVariantSchema>;
