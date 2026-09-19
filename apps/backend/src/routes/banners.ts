import { Router } from 'express';
import db from '../db/client.js';

export const bannersRouter = Router();

/**
 * GET /api/banners/active
 * Returns banners within the scheduled time window, ordered by display_order
 */
bannersRouter.get('/active', (_req, res) => {
  const now = new Date().toISOString();
  const rows = db
    .prepare(`
      SELECT
        id, title, subtitle, image_url, cta_text, cta_link, display_order,
        starts_at, ends_at
      FROM banners
      WHERE is_active = 1
        AND (starts_at IS NULL OR starts_at <= ?)
        AND (ends_at IS NULL OR ends_at >= ?)
      ORDER BY display_order ASC
    `)
    .all(now, now);

  return res.json({ data: rows });
});
