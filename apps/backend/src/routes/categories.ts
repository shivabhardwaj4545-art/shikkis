import { Router } from 'express';
import db from '../db/client.js';

export const categoriesRouter = Router();

/**
 * GET /api/categories
 * Returns active categories ordered by display_order with product counts
 */
categoriesRouter.get('/', (_req, res) => {
  const rows = db
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
    .all();

  return res.json({ data: rows });
});
