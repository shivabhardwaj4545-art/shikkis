import { z } from 'zod';
// ─── Auth ────────────────────────────────────────────────────────────────────
export const loginSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
});
export const registerSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    fullName: z.string().min(2, 'Full name must be at least 2 characters'),
    phone: z
        .string()
        .regex(/^\d{10}$/, 'Phone must be 10 digits')
        .optional(),
});
export const refreshTokenSchema = z.object({
    refreshToken: z.string().min(1, 'Refresh token is required'),
});
// ─── User Role ───────────────────────────────────────────────────────────────
export const userRoleSchema = z.enum(['owner', 'customer']);
// ─── Product ─────────────────────────────────────────────────────────────────
export const sizeSchema = z.enum(['XS', 'S', 'M', 'L', 'XL', 'XXL', 'FREE_SIZE']);
export const productVariantSchema = z.object({
    id: z.string().optional(),
    size: sizeSchema,
    color: z.string().min(1, 'Color is required'),
    stockQuantity: z
        .number()
        .int()
        .nonnegative('Stock quantity must be non-negative'),
    sku: z.string().min(1, 'SKU is required'),
});
export const createProductSchema = z.object({
    title: z.string().min(2, 'Title must be at least 2 characters'),
    slug: z.string().min(2, 'Slug is required'),
    categoryId: z.string().min(1, 'Category is required'),
    description: z.string().min(10, 'Description must be at least 10 characters'),
    fabric: z.string().min(2, 'Fabric details required'),
    craft: z.string().min(2, 'Craft details required'),
    /** Price in INTEGER PAISE (₹ × 100) — never floats */
    pricePaise: z.number().int().positive('Price in paise must be a positive integer'),
    /** Optional sale price — also in INTEGER PAISE */
    discountPricePaise: z.number().int().nonnegative().optional(),
    isFeatured: z.boolean().default(false),
    isActive: z.boolean().default(true),
    images: z
        .array(z.object({
        imageUrl: z.string().url('Must be a valid image URL'),
        altText: z.string().optional(),
        isPrimary: z.boolean().default(false),
    }))
        .min(1, 'At least 1 product image required'),
    variants: z.array(productVariantSchema).min(1, 'At least 1 variant required'),
});
export const updateProductSchema = createProductSchema.partial();
export const productQuerySchema = z.object({
    gender: z.enum(['women', 'men', 'unisex', 'all']).optional(),
    categoryId: z.string().optional(),
    minPricePaise: z.coerce.number().int().nonnegative().optional(),
    maxPricePaise: z.coerce.number().int().positive().optional(),
    search: z.string().optional(),
    sort: z
        .enum(['newest', 'price-low', 'price-high', 'title'])
        .optional()
        .default('newest'),
    page: z.coerce.number().int().positive().optional().default(1),
    limit: z.coerce.number().int().positive().max(100).optional().default(12),
});
// ─── Order ───────────────────────────────────────────────────────────────────
export const shippingAddressSchema = z.object({
    fullName: z.string().min(2, 'Full name is required'),
    addressLine1: z.string().min(5, 'Address line 1 is required'),
    addressLine2: z.string().optional(),
    city: z.string().min(2, 'City is required'),
    state: z.string().min(2, 'State is required'),
    pincode: z.string().regex(/^\d{6}$/, 'Pincode must be 6 digits'),
    phone: z.string().regex(/^\d{10}$/, 'Phone must be 10 digits'),
});
export const orderStatusSchema = z.enum([
    'pending',
    'processing',
    'shipped',
    'delivered',
    'cancelled',
]);
export const paymentStatusSchema = z.enum(['pending', 'paid', 'failed']);
export const orderItemInputSchema = z.object({
    productId: z.string().min(1, 'Product ID required'),
    variantId: z.string().min(1, 'Variant ID required'),
    quantity: z.number().int().positive('Quantity must be at least 1'),
});
export const createOrderSchema = z.object({
    items: z.array(orderItemInputSchema).min(1, 'Order must have at least 1 item'),
    shippingAddress: shippingAddressSchema,
    /** UUID used for deduplication of duplicate checkout submissions */
    idempotencyKey: z.string().uuid('Must be a valid UUID'),
});
export const updateOrderStatusSchema = z.object({
    status: orderStatusSchema,
});
// ─── Banner ──────────────────────────────────────────────────────────────────
export const createBannerSchema = z.object({
    title: z.string().min(2, 'Title is required'),
    subtitle: z.string().optional(),
    ctaText: z.string().default('Shop Collection'),
    ctaLink: z.string().default('/catalog'),
    badgeText: z.string().optional(),
    isActive: z.boolean().default(true),
});
export const updateBannerSchema = createBannerSchema.partial();
//# sourceMappingURL=index.js.map