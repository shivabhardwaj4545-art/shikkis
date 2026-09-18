import { Router } from 'express';
import db from '../db/client.js';

export const productsRouter = Router();

interface OfferRow {
  id: string;
  name: string;
  code: string | null;
  type: 'percent' | 'flat' | 'bxgy' | 'free_shipping';
  value: number;
  max_discount: number | null;
  min_cart_value: number;
  scope: 'all' | 'category' | 'product';
  scope_ids: string;
}

/**
 * Fetch all active auto-applied offers (code IS NULL)
 */
function getActiveAutoOffers(): OfferRow[] {
  return db
    .prepare(`
      SELECT id, name, code, type, value, max_discount, min_cart_value, scope, scope_ids
      FROM offers
      WHERE is_active = 1
        AND code IS NULL
        AND (starts_at IS NULL OR starts_at <= datetime('now'))
        AND (ends_at IS NULL OR ends_at >= datetime('now'))
      ORDER BY priority DESC
    `)
    .all() as OfferRow[];
}

/**
 * Computes base discounted price and applies any applicable auto-applied offer
 */
function computePrices(
  mrpPaise: number,
  discountPercent: number,
  productId: string,
  categoryId: string,
  activeOffers: OfferRow[]
) {
  // Base discount from product discount_percent
  const baseDiscountPaise = Math.round((mrpPaise * discountPercent) / 100);
  const basePricePaise = mrpPaise - baseDiscountPaise;

  let offerDiscountPaise = 0;
  let appliedOffer: { id: string; name: string; discount_paise: number } | null = null;

  for (const offer of activeOffers) {
    let scopeMatches = false;
    if (offer.scope === 'all') {
      scopeMatches = true;
    } else if (offer.scope === 'category') {
      try {
        const catIds = JSON.parse(offer.scope_ids || '[]');
        if (catIds.includes(categoryId)) scopeMatches = true;
      } catch {
        // ignore JSON parse error
      }
    } else if (offer.scope === 'product') {
      try {
        const prdIds = JSON.parse(offer.scope_ids || '[]');
        if (prdIds.includes(productId)) scopeMatches = true;
      } catch {
        // ignore
      }
    }

    if (scopeMatches) {
      if (offer.type === 'percent') {
        let disc = Math.round((basePricePaise * offer.value) / 100);
        if (offer.max_discount && disc > offer.max_discount) {
          disc = offer.max_discount;
        }
        offerDiscountPaise = disc;
        appliedOffer = { id: offer.id, name: offer.name, discount_paise: disc };
        break; // apply highest priority offer
      } else if (offer.type === 'flat') {
        let disc = offer.value;
        if (offer.max_discount && disc > offer.max_discount) {
          disc = offer.max_discount;
        }
        offerDiscountPaise = Math.min(disc, basePricePaise);
        appliedOffer = { id: offer.id, name: offer.name, discount_paise: offerDiscountPaise };
        break;
      }
    }
  }

  const finalPricePaise = Math.max(0, basePricePaise - offerDiscountPaise);
  const effectiveDiscountPercent =
    mrpPaise > 0 ? Math.round(((mrpPaise - finalPricePaise) / mrpPaise) * 100) : 0;

  return {
    mrp_paise: mrpPaise,
    product_discount_percent: discountPercent,
    base_price_paise: basePricePaise,
    offer_discount_paise: offerDiscountPaise,
    final_price_paise: finalPricePaise,
    effective_discount_percent: effectiveDiscountPercent,
    applied_offer: appliedOffer,
  };
}

/**
 * GET /api/products/search?q=
 * Quick debounce-friendly autocomplete search
 */
productsRouter.get('/search', (req, res) => {
  const query = (req.query.q as string)?.trim();
  if (!query || query.length < 2) {
    return res.json({ products: [] });
  }

  const activeOffers = getActiveAutoOffers();
  const searchPattern = `%${query}%`;

  const rows = db
    .prepare(`
      SELECT
        p.id, p.category_id, p.name, p.slug, p.description, p.mrp, p.discount_percent,
        p.images, c.name as category_name
      FROM products p
      JOIN categories c ON c.id = p.category_id
      WHERE p.is_active = 1
        AND (p.name LIKE ? OR p.description LIKE ? OR c.name LIKE ?)
      ORDER BY p.is_featured DESC, p.created_at DESC
      LIMIT 8
    `)
    .all(searchPattern, searchPattern, searchPattern) as Array<{
      id: string;
      category_id: string;
      name: string;
      slug: string;
      description: string;
      mrp: number;
      discount_percent: number;
      images: string;
      category_name: string;
    }>;

  const results = rows.map((p) => {
    let images: string[] = [];
    try {
      images = JSON.parse(p.images);
    } catch {
      images = [];
    }

    const priceInfo = computePrices(p.mrp, p.discount_percent, p.id, p.category_id, activeOffers);

    return {
      id: p.id,
      name: p.name,
      slug: p.slug,
      category_name: p.category_name,
      primary_image: images[0] || null,
      mrp_paise: priceInfo.mrp_paise,
      final_price_paise: priceInfo.final_price_paise,
      discount_percent: priceInfo.effective_discount_percent,
    };
  });

  return res.json({ products: results });
});

/**
 * GET /api/products
 * Full catalog query with cursor pagination, filters & sorting
 */
productsRouter.get('/', (req, res) => {
  const {
    category,
    gender,
    occasion,
    min_price,
    max_price,
    min_discount,
    in_stock,
    is_featured,
    sort = 'newest',
    limit = '12',
    cursor,
    page,
  } = req.query;

  const activeOffers = getActiveAutoOffers();
  const parsedLimit = Math.min(Math.max(parseInt(limit as string, 10) || 12, 1), 50);

  const whereClauses: string[] = ['p.is_active = 1'];
  const params: unknown[] = [];

  // Filter by category (slug or id)
  if (category && category !== 'all') {
    whereClauses.push('(c.slug = ? OR c.id = ?)');
    params.push(category, category);
  }

  // Filter by gender ('men', 'women', 'unisex')
  if (gender && gender !== 'all') {
    whereClauses.push('p.gender = ?');
    params.push(gender);
  }

  // Filter by occasion
  if (occasion && occasion !== 'all') {
    whereClauses.push('p.occasion LIKE ?');
    params.push(`%${occasion}%`);
  }

  // Filter by price range (paise)
  if (min_price) {
    const minP = parseInt(min_price as string, 10);
    if (!isNaN(minP)) {
      whereClauses.push('p.mrp >= ?');
      params.push(minP);
    }
  }

  if (max_price) {
    const maxP = parseInt(max_price as string, 10);
    if (!isNaN(maxP)) {
      whereClauses.push('p.mrp <= ?');
      params.push(maxP);
    }
  }

  // Filter by discount percent
  if (min_discount) {
    const minD = parseInt(min_discount as string, 10);
    if (!isNaN(minD)) {
      whereClauses.push('p.discount_percent >= ?');
      params.push(minD);
    }
  }

  // Filter by in-stock only
  if (in_stock === 'true' || in_stock === '1') {
    whereClauses.push(`
      EXISTS (
        SELECT 1 FROM product_variants pv
        WHERE pv.product_id = p.id AND pv.stock > 0 AND pv.is_active = 1
      )
    `);
  }

  // Filter by featured
  if (is_featured === 'true' || is_featured === '1') {
    whereClauses.push('p.is_featured = 1');
  }

  // Sorting
  let orderBy = 'p.created_at DESC';
  if (sort === 'price_asc') {
    orderBy = 'p.mrp ASC';
  } else if (sort === 'price_desc') {
    orderBy = 'p.mrp DESC';
  } else if (sort === 'discount_desc') {
    orderBy = 'p.discount_percent DESC';
  } else if (sort === 'newest') {
    orderBy = 'p.created_at DESC';
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  // Get total matching count
  const countRow = db
    .prepare(`
      SELECT COUNT(DISTINCT p.id) as total
      FROM products p
      JOIN categories c ON c.id = p.category_id
      ${whereSql}
    `)
    .get(...params) as { total: number };

  const total = countRow?.total || 0;

  // Pagination via offset or cursor
  let offset = 0;
  if (page) {
    const pNum = Math.max(parseInt(page as string, 10) || 1, 1);
    offset = (pNum - 1) * parsedLimit;
  } else if (cursor) {
    try {
      const decoded = Buffer.from(cursor as string, 'base64').toString('utf8');
      const curOffset = parseInt(decoded, 10);
      if (!isNaN(curOffset)) offset = curOffset;
    } catch {
      offset = 0;
    }
  }

  const queryParams = [...params, parsedLimit, offset];

  const rows = db
    .prepare(`
      SELECT
        p.id, p.category_id, p.name, p.slug, p.description, p.fabric, p.occasion,
        p.gender, p.mrp, p.discount_percent, p.sku, p.images, p.is_featured, p.created_at,
        c.name as category_name, c.slug as category_slug,
        (
          SELECT SUM(stock)
          FROM product_variants pv
          WHERE pv.product_id = p.id AND pv.is_active = 1
        ) as total_stock,
        (
          SELECT json_group_array(
            json_object(
              'id', pv.id,
              'size', pv.size,
              'color', pv.color,
              'variant_sku', pv.variant_sku,
              'stock', pv.stock
            )
          )
          FROM product_variants pv
          WHERE pv.product_id = p.id AND pv.is_active = 1
        ) as variants_json
      FROM products p
      JOIN categories c ON c.id = p.category_id
      ${whereSql}
      ORDER BY ${orderBy}
      LIMIT ? OFFSET ?
    `)
    .all(...queryParams) as Array<{
      id: string;
      category_id: string;
      name: string;
      slug: string;
      description: string;
      fabric: string;
      occasion: string;
      gender: string;
      mrp: number;
      discount_percent: number;
      sku: string;
      images: string;
      is_featured: number;
      created_at: string;
      category_name: string;
      category_slug: string;
      total_stock: number | null;
      variants_json: string;
    }>;

  const products = rows.map((p) => {
    let images: string[] = [];
    try {
      images = JSON.parse(p.images);
    } catch {
      images = [];
    }

    let variants: any[] = [];
    try {
      variants = JSON.parse(p.variants_json);
    } catch {
      variants = [];
    }

    const priceInfo = computePrices(p.mrp, p.discount_percent, p.id, p.category_id, activeOffers);

    return {
      id: p.id,
      name: p.name,
      slug: p.slug,
      description: p.description,
      fabric: p.fabric,
      occasion: p.occasion,
      gender: p.gender,
      sku: p.sku,
      category_id: p.category_id,
      category_name: p.category_name,
      category_slug: p.category_slug,
      images,
      is_featured: Boolean(p.is_featured),
      total_stock: p.total_stock || 0,
      variants,
      price: priceInfo,
    };
  });

  const nextOffset = offset + rows.length;
  const hasMore = nextOffset < total;
  const nextCursor = hasMore ? Buffer.from(nextOffset.toString()).toString('base64') : null;

  return res.json({
    data: products,
    pagination: {
      total,
      limit: parsedLimit,
      offset,
      has_more: hasMore,
      next_cursor: nextCursor,
      total_pages: Math.ceil(total / parsedLimit),
      current_page: Math.floor(offset / parsedLimit) + 1,
    },
  });
});

/**
 * GET /api/products/:slug
 * Full product detail + all variants + 4 related products
 */
productsRouter.get('/:slug', (req, res) => {
  const { slug } = req.params;

  const product = db
    .prepare(`
      SELECT
        p.id, p.category_id, p.name, p.slug, p.description, p.long_description,
        p.fabric, p.occasion, p.gender, p.care_instructions, p.mrp, p.discount_percent,
        p.sku, p.images, p.is_featured, p.created_at,
        c.name as category_name, c.slug as category_slug
      FROM products p
      JOIN categories c ON c.id = p.category_id
      WHERE p.slug = ? AND p.is_active = 1
    `)
    .get(slug) as any;

  if (!product) {
    return res.status(404).json({
      error: {
        code: 'PRODUCT_NOT_FOUND',
        message: `Product with slug '${slug}' not found`,
      },
    });
  }

  let images: string[] = [];
  try {
    images = JSON.parse(product.images);
  } catch {
    images = [];
  }

  // Variants
  const variants = db
    .prepare(`
      SELECT id, size, color, variant_sku, price_override, stock, weight_grams
      FROM product_variants
      WHERE product_id = ? AND is_active = 1
      ORDER BY size, color
    `)
    .all(product.id) as Array<{
      id: string;
      size: string;
      color: string;
      variant_sku: string;
      price_override: number | null;
      stock: number;
      weight_grams: number;
    }>;

  // Active offers computation
  const activeOffers = getActiveAutoOffers();
  const priceInfo = computePrices(
    product.mrp,
    product.discount_percent,
    product.id,
    product.category_id,
    activeOffers
  );

  // 4 related products from same category
  const relatedRows = db
    .prepare(`
      SELECT
        p.id, p.category_id, p.name, p.slug, p.mrp, p.discount_percent, p.images,
        c.name as category_name
      FROM products p
      JOIN categories c ON c.id = p.category_id
      WHERE p.category_id = ? AND p.id != ? AND p.is_active = 1
      ORDER BY p.is_featured DESC, p.created_at DESC
      LIMIT 4
    `)
    .all(product.category_id, product.id) as any[];

  const relatedProducts = relatedRows.map((rp) => {
    let rImages: string[] = [];
    try {
      rImages = JSON.parse(rp.images);
    } catch {
      rImages = [];
    }
    const rPrices = computePrices(rp.mrp, rp.discount_percent, rp.id, rp.category_id, activeOffers);
    return {
      id: rp.id,
      name: rp.name,
      slug: rp.slug,
      category_name: rp.category_name,
      images: rImages,
      price: rPrices,
    };
  });

  return res.json({
    data: {
      ...product,
      images,
      price: priceInfo,
      variants,
      related_products: relatedProducts,
    },
  });
});
