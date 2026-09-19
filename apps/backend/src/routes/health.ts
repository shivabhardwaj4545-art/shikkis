import { Router } from 'express';

import db from '../db/client.js';

const router = Router();

/**
 * GET /api/health
 *
 * Returns 200 with store info and DB status.
 * Used by load balancers and monitoring tools.
 */
import { seedFullDatabase } from '../db/seedFull.js';

router.get('/', (_req, res) => {
  const dbStatus = db.open ? 'connected' : 'disconnected';
  let productCount = (db.prepare('SELECT COUNT(*) as cnt FROM products').get() as any)?.cnt || 0;
  let userCount = (db.prepare('SELECT COUNT(*) as cnt FROM users').get() as any)?.cnt || 0;

  if (productCount === 0 || userCount === 0) {
    try {
      console.log('🌱 Health check detected 0 products/users. Running seedFullDatabase...');
      seedFullDatabase(db);
      productCount = (db.prepare('SELECT COUNT(*) as cnt FROM products').get() as any)?.cnt || 0;
      userCount = (db.prepare('SELECT COUNT(*) as cnt FROM users').get() as any)?.cnt || 0;
    } catch (err) {
      console.error('Auto-seed error in health check:', err);
    }
  }

  res.json({
    status: 'ok',
    store: 'Shikkis — Curated Style',
    db: dbStatus,
    products: productCount,
    users: userCount,
    timestamp: new Date().toISOString(),
    uptime: Math.round(process.uptime()),
  });
});

router.get('/seed', (_req, res) => {
  try {
    seedFullDatabase(db);
    const productCount = (db.prepare('SELECT COUNT(*) as cnt FROM products').get() as any)?.cnt || 0;
    const userCount = (db.prepare('SELECT COUNT(*) as cnt FROM users').get() as any)?.cnt || 0;
    res.json({ status: 'ok', message: 'Full database seeded successfully', products: productCount, users: userCount });
  } catch (err: any) {
    res.status(500).json({ status: 'error', error: err.message });
  }
});

export default router;
