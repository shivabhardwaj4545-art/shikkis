import { Router } from 'express';
import db from '../db/client.js';

export const categoriesRouter = Router();

/**
 * GET /api/categories
 * Returns active categories ordered by display_order with product counts
 */
categoriesRouter.get('/', async (_req, res, next) => {
  try {
    const rows = (await db
      .prepare(`
        SELECT
          c.id, c.name, c.slug, c.description, c.image_url, c.display_order,
          (
            SELECT COUNT(*)
            FROM products p
            WHERE p.category_id = c.id AND p.is_active = 1
          ) as product_count
        FROM categories c
        WHERE c.is_active = 1
        ORDER BY c.display_order ASC, c.name ASC
      `)
      .all()) as any[];

    const formatted = rows.map((r) => ({
      ...r,
      product_count: Number(r.product_count || 0),
    }));

    return res.json({ data: formatted });
  } catch (err) {
    return next(err);
  }
});
