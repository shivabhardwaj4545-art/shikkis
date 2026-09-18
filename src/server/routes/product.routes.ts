import { Router } from 'express';
import db from '../db/index.ts';

const router = Router();

// GET /api/products — Catalog with filtering & sorting
router.get('/', (req, res, next) => {
  try {
    const { gender, categoryId, minPricePaise, maxPricePaise, search, sort } = req.query;

    let query = `
      SELECT p.*, c.name as category_name, c.gender as category_gender
      FROM products p
      JOIN categories c ON p.category_id = c.id
      WHERE p.is_active = 1
    `;
    const params: any[] = [];

    if (gender && gender !== 'all') {
      query += ` AND c.gender = ?`;
      params.push(gender);
    }

    if (categoryId) {
      query += ` AND p.category_id = ?`;
      params.push(categoryId);
    }

    if (minPricePaise) {
      query += ` AND p.price_paise >= ?`;
      params.push(Number(minPricePaise));
    }

    if (maxPricePaise) {
      query += ` AND p.price_paise <= ?`;
      params.push(Number(maxPricePaise));
    }

    if (search) {
      query += ` AND (p.title LIKE ? OR p.description LIKE ? OR p.fabric LIKE ? OR p.craft LIKE ?)`;
      const term = `%${search}%`;
      params.push(term, term, term, term);
    }

    if (sort === 'price-low') {
      query += ` ORDER BY p.price_paise ASC`;
    } else if (sort === 'price-high') {
      query += ` ORDER BY p.price_paise DESC`;
    } else if (sort === 'title') {
      query += ` ORDER BY p.title ASC`;
    } else {
      query += ` ORDER BY p.created_at DESC`;
    }

    const products = db.prepare(query).all(...params) as any[];

    // Attach primary images & variants to each product
    const fullProducts = products.map((p) => {
      const images = db.prepare('SELECT * FROM product_images WHERE product_id = ? ORDER BY is_primary DESC, display_order ASC').all(p.id) as any[];
      const variants = db.prepare('SELECT * FROM product_variants WHERE product_id = ?').all(p.id) as any[];

      return {
        id: p.id,
        title: p.title,
        slug: p.slug,
        categoryId: p.category_id,
        categoryName: p.category_name,
        gender: p.category_gender,
        description: p.description,
        fabric: p.fabric,
        craft: p.craft,
        pricePaise: p.price_paise,
        discountPricePaise: p.discount_price_paise,
        isFeatured: Boolean(p.is_featured),
        isActive: Boolean(p.is_active),
        images: images.map(img => ({
          id: img.id,
          productId: img.product_id,
          imageUrl: img.image_url,
          altText: img.alt_text,
          isPrimary: Boolean(img.is_primary),
          displayOrder: img.display_order,
        })),
        variants: variants.map(v => ({
          id: v.id,
          productId: v.product_id,
          size: v.size,
          color: v.color,
          stockQuantity: v.stock_quantity,
          sku: v.sku,
        })),
        createdAt: p.created_at,
      };
    });

    res.json({ products: fullProducts });
  } catch (err) {
    next(err);
  }
});

// GET /api/products/categories
router.get('/categories', (_req, res, next) => {
  try {
    const categories = db.prepare('SELECT * FROM categories ORDER BY name ASC').all();
    res.json({ categories });
  } catch (err) {
    next(err);
  }
});

// GET /api/products/banners
router.get('/banners', (_req, res, next) => {
  try {
    const banners = db.prepare('SELECT * FROM banners WHERE is_active = 1').all() as any[];
    res.json({
      banners: banners.map(b => ({
        id: b.id,
        title: b.title,
        subtitle: b.subtitle,
        ctaText: b.cta_text,
        ctaLink: b.cta_link,
        badgeText: b.badge_text,
        isActive: Boolean(b.is_active),
      }))
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/products/:slug — Detail view
router.get('/:slug', (req, res, next) => {
  try {
    const { slug } = req.params;
    const p = db.prepare(`
      SELECT p.*, c.name as category_name, c.gender as category_gender
      FROM products p
      JOIN categories c ON p.category_id = c.id
      WHERE p.slug = ? AND p.is_active = 1
    `).get(slug) as any;

    if (!p) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const images = db.prepare('SELECT * FROM product_images WHERE product_id = ? ORDER BY is_primary DESC, display_order ASC').all(p.id) as any[];
    const variants = db.prepare('SELECT * FROM product_variants WHERE product_id = ?').all(p.id) as any[];

    return res.json({
      product: {
        id: p.id,
        title: p.title,
        slug: p.slug,
        categoryId: p.category_id,
        categoryName: p.category_name,
        gender: p.category_gender,
        description: p.description,
        fabric: p.fabric,
        craft: p.craft,
        pricePaise: p.price_paise,
        discountPricePaise: p.discount_price_paise,
        isFeatured: Boolean(p.is_featured),
        isActive: Boolean(p.is_active),
        images: images.map(img => ({
          id: img.id,
          productId: img.product_id,
          imageUrl: img.image_url,
          altText: img.alt_text,
          isPrimary: Boolean(img.is_primary),
          displayOrder: img.display_order,
        })),
        variants: variants.map(v => ({
          id: v.id,
          productId: v.product_id,
          size: v.size,
          color: v.color,
          stockQuantity: v.stock_quantity,
          sku: v.sku,
        })),
        createdAt: p.created_at,
      },
    });
  } catch (err) {
    return next(err);
  }
});

export default router;
