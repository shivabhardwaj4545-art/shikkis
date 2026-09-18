import { Router } from 'express';
import db from '../db/client.js';

export const offersRouter = Router();

/**
 * GET /api/offers/active
 * Returns currently active promotional offers
 */
offersRouter.get('/active', (_req, res) => {
  const rows = db
    .prepare(`
      SELECT
        id, name, code, type, value, max_discount, min_cart_value,
        starts_at, ends_at, banner_image_url, priority
      FROM offers
      WHERE is_active = 1
        AND (starts_at IS NULL OR starts_at <= datetime('now'))
        AND (ends_at IS NULL OR ends_at >= datetime('now'))
      ORDER BY priority DESC
    `)
    .all();

  return res.json({ data: rows });
});
