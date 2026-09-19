import { Router } from 'express';
import db from '../db/client.js';

export const offersRouter = Router();

/**
 * GET /api/offers/active
 * Returns currently active promotional offers
 */
offersRouter.get('/active', async (_req, res, next) => {
  try {
    const now = new Date().toISOString();
    const rows = (await db
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
      .all(now, now)) as any[];

    const formatted = rows.map((r) => ({
      ...r,
      value: Number(r.value),
      max_discount: r.max_discount !== null ? Number(r.max_discount) : null,
      min_cart_value: Number(r.min_cart_value),
    }));

    return res.json({ data: formatted });
  } catch (err) {
    return next(err);
  }
});
