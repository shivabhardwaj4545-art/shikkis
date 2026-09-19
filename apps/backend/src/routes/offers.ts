import { Router } from 'express';
import db from '../db/client.js';

export const offersRouter = Router();

/**
 * GET /api/offers/active
 * Returns currently active promotional offers
 */
offersRouter.get('/active', (_req, res) => {
  const now = new Date().toISOString();
  const rows = db
    .prepare(`
      SELECT
        id, name, code, type, value, max_discount, min_cart_value,
        starts_at, ends_at, banner_image_url, priority
      FROM offers
      WHERE is_active = 1
        AND (starts_at IS NULL OR starts_at <= ?)
        AND (ends_at IS NULL OR ends_at >= ?)
      ORDER BY priority DESC
    `)
    .all(now, now);

  return res.json({ data: rows });
});
