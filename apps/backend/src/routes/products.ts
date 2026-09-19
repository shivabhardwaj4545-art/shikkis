import { Router } from 'express';
import db from '../db/client.js';
import { seedFullDatabase } from '../db/seedFull.js';

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
async function getActiveAutoOffers(): Promise<OfferRow[]> {
  const rows = await db
    .prepare(`
      SELECT id, name, code, type, value, max_discount, min_cart_value, scope, scope_ids
      FROM offers
      WHERE is_active = 1
        AND code IS NULL
        AND (starts_at IS NULL OR starts_at <= CURRENT_TIMESTAMP)
        AND (ends_at IS NULL OR ends_at >= CURRENT_TIMESTAMP)
      ORDER BY priority DESC
    `)
    .all();
  return rows as OfferRow[];
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
        const catIds = typeof offer.scope_ids === 'string' ? JSON.parse(offer.scope_ids || '[]') : offer.scope_ids || [];
        if (catIds.includes(categoryId)) scopeMatches = true;
      } catch {
        // ignore JSON parse error
      }
    } else if (offer.scope === 'product') {
      try {
        const prdIds = typeof offer.scope_ids === 'string' ? JSON.parse(offer.scope_ids || '[]') : offer.scope_ids || [];
        if (prdIds.includes(productId)) scopeMatches = true;
      } catch {
        // ignore
      }
    }

    if (scopeMatches) {
      const offerVal = Number(offer.value);
      const maxDisc = offer.max_discount !== null ? Number(offer.max_discount) : null;
      if (offer.type === 'percent') {
        let disc = Math.round((basePricePaise * offerVal) / 100);
        if (maxDisc !== null && disc > maxDisc) {
          disc = maxDisc;
        }
        offerDiscountPaise = disc;
        appliedOffer = { id: offer.id, name: offer.name, discount_paise: disc };
        break;
      } else if (offer.type === 'flat') {
        let disc = offerVal;
        if (maxDisc !== null && disc > maxDisc) {
          disc = maxDisc;
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
productsRouter.get('/search', async (req, res) => {
  const query = (req.query.q as string)?.trim();
  if (!query || query.length < 2) {
    return res.json({ products: [] });
  }

  const activeOffers = await getActiveAutoOffers();
  const searchPattern = `%${query}%`;

  const rows = (await db
    .prepare(`
      SELECT
        p.id, p.category_id, p.name, p.slug, p.description, p.mrp, p.discount_percent,
        p.images, c.name as category_name
      FROM products p
      JOIN categories c ON c.id = p.category_id
      WHERE p.is_active = 1
        AND (p.name ILIKE ? OR p.description ILIKE ? OR c.name ILIKE ?)
      ORDER BY p.is_featured DESC, p.created_at DESC
      LIMIT 8
    `)
    .all(searchPattern, searchPattern, searchPattern)) as Array<{
      id: string;
      category_id: string;
      name: string;
      slug: string;
      description: string;
      mrp: number | string;
      discount_percent: number | string;
      images: string;
      category_name: string;
    }>;

  const results = rows.map((p) => {
    let images: string[] = [];
    try {
      images = typeof p.images === 'string' ? JSON.parse(p.images) : p.images || [];
    } catch {
      images = [];
    }

    const mrp = Number(p.mrp);
    const discPct = Number(p.discount_percent);
    const priceInfo = computePrices(mrp, discPct, p.id, p.category_id, activeOffers);

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
productsRouter.get('/', async (req, res) => {
  const countRes = await db.queryOne<{ cnt: string | number }>('SELECT COUNT(*) as cnt FROM products');
  const productCount = Number(countRes?.cnt ?? 0);

  if (productCount === 0) {
    try {
      console.log('🌱 Products endpoint detected 0 products. Auto-seeding catalog...');
      await seedFullDatabase(db);
    } catch (e) {
      console.error('Auto-seed error in products router:', e);
    }
  }
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

  const activeOffers = await getActiveAutoOffers();
  const parsedLimit = Math.min(Math.max(parseInt(limit as string, 10) || 12, 1), 50);

  const whereClauses: string[] = ['p.is_active = 1'];
  const params: unknown[] = [];

  // Filter by category (slug or id)
  if (category && category !== 'all') {
    whereClauses.push('(LOWER(c.slug) = LOWER(?) OR c.id = ?)');
    params.push(category, category);
  }

  // Filter by gender ('men', 'women', 'unisex')
  if (gender && gender !== 'all') {
    const gLower = (gender as string).toLowerCase();
    if (gLower === 'women' || gLower === 'men') {
      whereClauses.push('(LOWER(p.gender) = ? OR LOWER(p.gender) = \'unisex\')');
      params.push(gLower);
    } else {
      whereClauses.push('LOWER(p.gender) = ?');
      params.push(gLower);
    }
  }

  // Filter by occasion
  if (occasion && occasion !== 'all') {
    const rawOccasion = (occasion as string).trim();
    const keywords = rawOccasion
      .split(/[\s&,/]+/)
      .filter((k) => k.length > 2 && k.toLowerCase() !== 'and');
    if (keywords.length > 0) {
      const occOrClauses = keywords.map(() => 'p.occasion ILIKE ?');
      whereClauses.push(`(${occOrClauses.join(' OR ')})`);
      keywords.forEach((k) => params.push(`%${k}%`));
    } else {
      whereClauses.push('p.occasion ILIKE ?');
      params.push(`%${rawOccasion}%`);
    }
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
  const countRow = (await db
    .prepare(`
      SELECT COUNT(DISTINCT p.id) as total
      FROM products p
      JOIN categories c ON c.id = p.category_id
      ${whereSql}
    `)
    .get(...params)) as { total: string | number };

  const total = Number(countRow?.total ?? 0);

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

  const rows = (await db
    .prepare(`
      SELECT
        p.id, p.category_id, p.name, p.slug, p.description, p.fabric, p.occasion,
        p.gender, p.mrp, p.discount_percent, p.sku, p.images, p.is_featured, p.created_at,
        c.name as category_name, c.slug as category_slug,
        (
          SELECT SUM(stock)
          FROM product_variants pv
          WHERE pv.product_id = p.id AND pv.is_active = 1
        ) as total_stock
      FROM products p
      JOIN categories c ON c.id = p.category_id
      ${whereSql}
      ORDER BY ${orderBy}
      LIMIT ? OFFSET ?
    `)
    .all(...queryParams)) as Array<{
      id: string;
      category_id: string;
      name: string;
      slug: string;
      description: string;
      fabric: string;
      occasion: string;
      gender: string;
      mrp: number | string;
      discount_percent: number | string;
      sku: string;
      images: string;
      is_featured: number;
      created_at: string;
      category_name: string;
      category_slug: string;
      total_stock: number | string | null;
    }>;

  // Fetch variants for all products returned on current page
  const productIds = rows.map((r) => r.id);
  const variantsMap: Record<string, any[]> = {};

  if (productIds.length > 0) {
    const allVariants = await db
      .prepare(`
        SELECT id, product_id, size, color, variant_sku, stock
        FROM product_variants
        WHERE is_active = 1 AND product_id IN (${productIds.map(() => '?').join(', ')})
      `)
      .all(...productIds);

    for (const v of allVariants) {
      if (!variantsMap[v.product_id]) variantsMap[v.product_id] = [];
      variantsMap[v.product_id].push({
        id: v.id,
        size: v.size,
        color: v.color,
        variant_sku: v.variant_sku,
        stock: Number(v.stock),
      });
    }
  }

  const products = rows.map((p) => {
    let images: string[] = [];
    try {
      images = typeof p.images === 'string' ? JSON.parse(p.images) : p.images || [];
    } catch {
      images = [];
    }

    const mrp = Number(p.mrp);
    const discPct = Number(p.discount_percent);
    const priceInfo = computePrices(mrp, discPct, p.id, p.category_id, activeOffers);

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
      total_stock: Number(p.total_stock || 0),
      variants: variantsMap[p.id] || [],
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
productsRouter.get('/:slug', async (req, res) => {
  const { slug } = req.params;

  const product = (await db
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
    .get(slug)) as any;

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
    images = typeof product.images === 'string' ? JSON.parse(product.images) : product.images || [];
  } catch {
    images = [];
  }

  // Variants
  const variantsRows = (await db
    .prepare(`
      SELECT id, size, color, variant_sku, price_override, stock, weight_grams
      FROM product_variants
      WHERE product_id = ? AND is_active = 1
      ORDER BY size, color
    `)
    .all(product.id)) as Array<{
      id: string;
      size: string;
      color: string;
      variant_sku: string;
      price_override: number | string | null;
      stock: number | string;
      weight_grams: number | string;
    }>;

  const variants = variantsRows.map((v) => ({
    ...v,
    price_override: v.price_override !== null ? Number(v.price_override) : null,
    stock: Number(v.stock),
    weight_grams: Number(v.weight_grams),
  }));

  // Active offers computation
  const activeOffers = await getActiveAutoOffers();
  const mrp = Number(product.mrp);
  const discPct = Number(product.discount_percent);
  const priceInfo = computePrices(mrp, discPct, product.id, product.category_id, activeOffers);

  // 4 related products from same category
  const relatedRows = (await db
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
    .all(product.category_id, product.id)) as any[];

  const relatedProducts = relatedRows.map((rp) => {
    let rImages: string[] = [];
    try {
      rImages = typeof rp.images === 'string' ? JSON.parse(rp.images) : rp.images || [];
    } catch {
      rImages = [];
    }
    const rMrp = Number(rp.mrp);
    const rDisc = Number(rp.discount_percent);
    const rPrices = computePrices(rMrp, rDisc, rp.id, rp.category_id, activeOffers);
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
      mrp: mrp,
      discount_percent: discPct,
      images,
      price: priceInfo,
      variants,
      related_products: relatedProducts,
    },
  });
});
