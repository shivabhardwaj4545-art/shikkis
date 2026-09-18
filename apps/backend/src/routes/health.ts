import { Router } from 'express';

import db from '../db/client.js';

const router = Router();

/**
 * GET /api/health
 *
 * Returns 200 with store info and DB status.
 * Used by load balancers and monitoring tools.
 */
router.get('/', (_req, res) => {
  // Verify DB connection is alive
  const dbStatus = db.open ? 'connected' : 'disconnected';

  res.json({
    status: 'ok',
    store: 'Shikkis — Curated Style',
    db: dbStatus,
    timestamp: new Date().toISOString(),
    uptime: Math.round(process.uptime()),
  });
});

export default router;
