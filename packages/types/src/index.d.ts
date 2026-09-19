import { z } from 'zod';
export declare const loginSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
    password: string;
}, {
    email: string;
    password: string;
}>;
export declare const registerSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
    fullName: z.ZodString;
    phone: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    email: string;
    password: string;
    fullName: string;
    phone?: string | undefined;
}, {
    email: string;
    password: string;
    fullName: string;
    phone?: string | undefined;
}>;
export declare const refreshTokenSchema: z.ZodObject<{
    refreshToken: z.ZodString;
}, "strip", z.ZodTypeAny, {
    refreshToken: string;
}, {
    refreshToken: string;
}>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
export declare const userRoleSchema: z.ZodEnum<["owner", "customer"]>;
export type UserRole = z.infer<typeof userRoleSchema>;
export declare const sizeSchema: z.ZodEnum<["XS", "S", "M", "L", "XL", "XXL", "FREE_SIZE"]>;
export type Size = z.infer<typeof sizeSchema>;
export declare const productVariantSchema: z.ZodObject<{
    id: z.ZodOptional<z.ZodString>;
    size: z.ZodEnum<["XS", "S", "M", "L", "XL", "XXL", "FREE_SIZE"]>;
    color: z.ZodString;
    stockQuantity: z.ZodNumber;
    sku: z.ZodString;
}, "strip", z.ZodTypeAny, {
    size: "XS" | "S" | "M" | "L" | "XL" | "XXL" | "FREE_SIZE";
    color: string;
    stockQuantity: number;
    sku: string;
    id?: string | undefined;
}, {
    size: "XS" | "S" | "M" | "L" | "XL" | "XXL" | "FREE_SIZE";
    color: string;
    stockQuantity: number;
    sku: string;
    id?: string | undefined;
}>;
export declare const createProductSchema: z.ZodObject<{
    title: z.ZodString;
    slug: z.ZodString;
    categoryId: z.ZodString;
    description: z.ZodString;
    fabric: z.ZodString;
    craft: z.ZodString;
    /** Price in INTEGER PAISE (₹ × 100) — never floats */
    pricePaise: z.ZodNumber;
    /** Optional sale price — also in INTEGER PAISE */
    discountPricePaise: z.ZodOptional<z.ZodNumber>;
    isFeatured: z.ZodDefault<z.ZodBoolean>;
    isActive: z.ZodDefault<z.ZodBoolean>;
    images: z.ZodArray<z.ZodObject<{
        imageUrl: z.ZodString;
        altText: z.ZodOptional<z.ZodString>;
        isPrimary: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        imageUrl: string;
        isPrimary: boolean;
        altText?: string | undefined;
    }, {
        imageUrl: string;
        altText?: string | undefined;
        isPrimary?: boolean | undefined;
    }>, "many">;
    variants: z.ZodArray<z.ZodObject<{
        id: z.ZodOptional<z.ZodString>;
        size: z.ZodEnum<["XS", "S", "M", "L", "XL", "XXL", "FREE_SIZE"]>;
        color: z.ZodString;
        stockQuantity: z.ZodNumber;
        sku: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        size: "XS" | "S" | "M" | "L" | "XL" | "XXL" | "FREE_SIZE";
        color: string;
        stockQuantity: number;
        sku: string;
        id?: string | undefined;
    }, {
        size: "XS" | "S" | "M" | "L" | "XL" | "XXL" | "FREE_SIZE";
        color: string;
        stockQuantity: number;
        sku: string;
        id?: string | undefined;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    slug: string;
    title: string;
    categoryId: string;
    description: string;
    fabric: string;
    craft: string;
    pricePaise: number;
    isFeatured: boolean;
    isActive: boolean;
    images: {
        imageUrl: string;
        isPrimary: boolean;
        altText?: string | undefined;
    }[];
    variants: {
        size: "XS" | "S" | "M" | "L" | "XL" | "XXL" | "FREE_SIZE";
        color: string;
        stockQuantity: number;
        sku: string;
        id?: string | undefined;
    }[];
    discountPricePaise?: number | undefined;
}, {
    slug: string;
    title: string;
    categoryId: string;
    description: string;
    fabric: string;
    craft: string;
    pricePaise: number;
    images: {
        imageUrl: string;
        altText?: string | undefined;
        isPrimary?: boolean | undefined;
    }[];
    variants: {
        size: "XS" | "S" | "M" | "L" | "XL" | "XXL" | "FREE_SIZE";
        color: string;
        stockQuantity: number;
        sku: string;
        id?: string | undefined;
    }[];
    discountPricePaise?: number | undefined;
    isFeatured?: boolean | undefined;
    isActive?: boolean | undefined;
}>;
export declare const updateProductSchema: z.ZodObject<{
    title: z.ZodOptional<z.ZodString>;
    slug: z.ZodOptional<z.ZodString>;
    categoryId: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    fabric: z.ZodOptional<z.ZodString>;
    craft: z.ZodOptional<z.ZodString>;
    pricePaise: z.ZodOptional<z.ZodNumber>;
    discountPricePaise: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
    isFeatured: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
    isActive: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
    images: z.ZodOptional<z.ZodArray<z.ZodObject<{
        imageUrl: z.ZodString;
        altText: z.ZodOptional<z.ZodString>;
        isPrimary: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        imageUrl: string;
        isPrimary: boolean;
        altText?: string | undefined;
    }, {
        imageUrl: string;
        altText?: string | undefined;
        isPrimary?: boolean | undefined;
    }>, "many">>;
    variants: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodOptional<z.ZodString>;
        size: z.ZodEnum<["XS", "S", "M", "L", "XL", "XXL", "FREE_SIZE"]>;
        color: z.ZodString;
        stockQuantity: z.ZodNumber;
        sku: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        size: "XS" | "S" | "M" | "L" | "XL" | "XXL" | "FREE_SIZE";
        color: string;
        stockQuantity: number;
        sku: string;
        id?: string | undefined;
    }, {
        size: "XS" | "S" | "M" | "L" | "XL" | "XXL" | "FREE_SIZE";
        color: string;
        stockQuantity: number;
        sku: string;
        id?: string | undefined;
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    slug?: string | undefined;
    title?: string | undefined;
    categoryId?: string | undefined;
    description?: string | undefined;
    fabric?: string | undefined;
    craft?: string | undefined;
    pricePaise?: number | undefined;
    discountPricePaise?: number | undefined;
    isFeatured?: boolean | undefined;
    isActive?: boolean | undefined;
    images?: {
        imageUrl: string;
        isPrimary: boolean;
        altText?: string | undefined;
    }[] | undefined;
    variants?: {
        size: "XS" | "S" | "M" | "L" | "XL" | "XXL" | "FREE_SIZE";
        color: string;
        stockQuantity: number;
        sku: string;
        id?: string | undefined;
    }[] | undefined;
}, {
    slug?: string | undefined;
    title?: string | undefined;
    categoryId?: string | undefined;
    description?: string | undefined;
    fabric?: string | undefined;
    craft?: string | undefined;
    pricePaise?: number | undefined;
    discountPricePaise?: number | undefined;
    isFeatured?: boolean | undefined;
    isActive?: boolean | undefined;
    images?: {
        imageUrl: string;
        altText?: string | undefined;
        isPrimary?: boolean | undefined;
    }[] | undefined;
    variants?: {
        size: "XS" | "S" | "M" | "L" | "XL" | "XXL" | "FREE_SIZE";
        color: string;
        stockQuantity: number;
        sku: string;
        id?: string | undefined;
    }[] | undefined;
}>;
export declare const productQuerySchema: z.ZodObject<{
    gender: z.ZodOptional<z.ZodEnum<["women", "men", "unisex", "all"]>>;
    categoryId: z.ZodOptional<z.ZodString>;
    minPricePaise: z.ZodOptional<z.ZodNumber>;
    maxPricePaise: z.ZodOptional<z.ZodNumber>;
    search: z.ZodOptional<z.ZodString>;
    sort: z.ZodDefault<z.ZodOptional<z.ZodEnum<["newest", "price-low", "price-high", "title"]>>>;
    page: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    limit: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
}, "strip", z.ZodTypeAny, {
    sort: "newest" | "title" | "price-low" | "price-high";
    limit: number;
    page: number;
    search?: string | undefined;
    gender?: "all" | "women" | "men" | "unisex" | undefined;
    categoryId?: string | undefined;
    minPricePaise?: number | undefined;
    maxPricePaise?: number | undefined;
}, {
    search?: string | undefined;
    gender?: "all" | "women" | "men" | "unisex" | undefined;
    sort?: "newest" | "title" | "price-low" | "price-high" | undefined;
    limit?: number | undefined;
    page?: number | undefined;
    categoryId?: string | undefined;
    minPricePaise?: number | undefined;
    maxPricePaise?: number | undefined;
}>;
export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type ProductQueryInput = z.infer<typeof productQuerySchema>;
export type ProductVariantInput = z.infer<typeof productVariantSchema>;
export declare const shippingAddressSchema: z.ZodObject<{
    fullName: z.ZodString;
    addressLine1: z.ZodString;
    addressLine2: z.ZodOptional<z.ZodString>;
    city: z.ZodString;
    state: z.ZodString;
    pincode: z.ZodString;
    phone: z.ZodString;
}, "strip", z.ZodTypeAny, {
    fullName: string;
    phone: string;
    addressLine1: string;
    city: string;
    state: string;
    pincode: string;
    addressLine2?: string | undefined;
}, {
    fullName: string;
    phone: string;
    addressLine1: string;
    city: string;
    state: string;
    pincode: string;
    addressLine2?: string | undefined;
}>;
export declare const orderStatusSchema: z.ZodEnum<["pending", "processing", "shipped", "delivered", "cancelled"]>;
export declare const paymentStatusSchema: z.ZodEnum<["pending", "paid", "failed"]>;
export declare const orderItemInputSchema: z.ZodObject<{
    productId: z.ZodString;
    variantId: z.ZodString;
    quantity: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    quantity: number;
    productId: string;
    variantId: string;
}, {
    quantity: number;
    productId: string;
    variantId: string;
}>;
export declare const createOrderSchema: z.ZodObject<{
    items: z.ZodArray<z.ZodObject<{
        productId: z.ZodString;
        variantId: z.ZodString;
        quantity: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        quantity: number;
        productId: string;
        variantId: string;
    }, {
        quantity: number;
        productId: string;
        variantId: string;
    }>, "many">;
    shippingAddress: z.ZodObject<{
        fullName: z.ZodString;
        addressLine1: z.ZodString;
        addressLine2: z.ZodOptional<z.ZodString>;
        city: z.ZodString;
        state: z.ZodString;
        pincode: z.ZodString;
        phone: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        fullName: string;
        phone: string;
        addressLine1: string;
        city: string;
        state: string;
        pincode: string;
        addressLine2?: string | undefined;
    }, {
        fullName: string;
        phone: string;
        addressLine1: string;
        city: string;
        state: string;
        pincode: string;
        addressLine2?: string | undefined;
    }>;
    /** UUID used for deduplication of duplicate checkout submissions */
    idempotencyKey: z.ZodString;
}, "strip", z.ZodTypeAny, {
    items: {
        quantity: number;
        productId: string;
        variantId: string;
    }[];
    shippingAddress: {
        fullName: string;
        phone: string;
        addressLine1: string;
        city: string;
        state: string;
        pincode: string;
        addressLine2?: string | undefined;
    };
    idempotencyKey: string;
}, {
    items: {
        quantity: number;
        productId: string;
        variantId: string;
    }[];
    shippingAddress: {
        fullName: string;
        phone: string;
        addressLine1: string;
        city: string;
        state: string;
        pincode: string;
        addressLine2?: string | undefined;
    };
    idempotencyKey: string;
}>;
export declare const updateOrderStatusSchema: z.ZodObject<{
    status: z.ZodEnum<["pending", "processing", "shipped", "delivered", "cancelled"]>;
}, "strip", z.ZodTypeAny, {
    status: "pending" | "processing" | "shipped" | "delivered" | "cancelled";
}, {
    status: "pending" | "processing" | "shipped" | "delivered" | "cancelled";
}>;
export type ShippingAddress = z.infer<typeof shippingAddressSchema>;
export type OrderStatus = z.infer<typeof orderStatusSchema>;
export type PaymentStatus = z.infer<typeof paymentStatusSchema>;
export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;
export declare const createBannerSchema: z.ZodObject<{
    title: z.ZodString;
    subtitle: z.ZodOptional<z.ZodString>;
    ctaText: z.ZodDefault<z.ZodString>;
    ctaLink: z.ZodDefault<z.ZodString>;
    badgeText: z.ZodOptional<z.ZodString>;
    isActive: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    title: string;
    isActive: boolean;
    ctaText: string;
    ctaLink: string;
    subtitle?: string | undefined;
    badgeText?: string | undefined;
}, {
    title: string;
    isActive?: boolean | undefined;
    subtitle?: string | undefined;
    ctaText?: string | undefined;
    ctaLink?: string | undefined;
    badgeText?: string | undefined;
}>;
export declare const updateBannerSchema: z.ZodObject<{
    title: z.ZodOptional<z.ZodString>;
    subtitle: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    ctaText: z.ZodOptional<z.ZodDefault<z.ZodString>>;
    ctaLink: z.ZodOptional<z.ZodDefault<z.ZodString>>;
    badgeText: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    isActive: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
}, "strip", z.ZodTypeAny, {
    title?: string | undefined;
    isActive?: boolean | undefined;
    subtitle?: string | undefined;
    ctaText?: string | undefined;
    ctaLink?: string | undefined;
    badgeText?: string | undefined;
}, {
    title?: string | undefined;
    isActive?: boolean | undefined;
    subtitle?: string | undefined;
    ctaText?: string | undefined;
    ctaLink?: string | undefined;
    badgeText?: string | undefined;
}>;
export type CreateBannerInput = z.infer<typeof createBannerSchema>;
export type UpdateBannerInput = z.infer<typeof updateBannerSchema>;
export interface ApiError {
    error: {
        code: string;
        message: string;
        details?: Array<{
            path: string;
            message: string;
        }>;
    };
}
export interface PaginatedResponse<T> {
    data: T[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}
//# sourceMappingURL=index.d.ts.map