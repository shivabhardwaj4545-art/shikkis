import { Router } from 'express';
import db from '../db/client.js';
import { seedFullDatabase } from '../db/seedFull.js';

const router = Router();

/**
 * GET /api/health
 *
 * Returns 200 with store info and DB status.
 * Used by load balancers and monitoring tools.
 */
router.get('/', async (_req, res) => {
  let dbStatus = 'connected';
  let productCount = 0;
  let userCount = 0;

  let dbError: string | null = null;

  try {
    const prodRes = await db.queryOne<{ cnt: string | number }>('SELECT COUNT(*) as cnt FROM products');
    const userRes = await db.queryOne<{ cnt: string | number }>('SELECT COUNT(*) as cnt FROM users');
    productCount = Number(prodRes?.cnt ?? 0);
    userCount = Number(userRes?.cnt ?? 0);
  } catch (err: any) {
    dbStatus = 'error';
    dbError = err?.message || String(err);
    console.error('Database query error in health check:', err);
  }

  if (dbStatus === 'connected' && (productCount === 0 || userCount === 0)) {
    try {
      console.log('🌱 Health check detected 0 products/users. Running seedFullDatabase...');
      await seedFullDatabase(db);
      const prodRes = await db.queryOne<{ cnt: string | number }>('SELECT COUNT(*) as cnt FROM products');
      const userRes = await db.queryOne<{ cnt: string | number }>('SELECT COUNT(*) as cnt FROM users');
      productCount = Number(prodRes?.cnt ?? 0);
      userCount = Number(userRes?.cnt ?? 0);
    } catch (err) {
      console.error('Auto-seed error in health check:', err);
    }
  }

  res.json({
    status: 'ok',
    store: 'Shikkis — Curated Style',
    db: dbStatus,
    dbError,
    products: productCount,
    users: userCount,
    timestamp: new Date().toISOString(),
    uptime: Math.round(process.uptime()),
  });
});

router.get('/seed', async (_req, res) => {
  try {
    await seedFullDatabase(db);
    const prodRes = await db.queryOne<{ cnt: string | number }>('SELECT COUNT(*) as cnt FROM products');
    const userRes = await db.queryOne<{ cnt: string | number }>('SELECT COUNT(*) as cnt FROM users');
    res.json({
      status: 'ok',
      message: 'Full database seeded successfully',
      products: Number(prodRes?.cnt ?? 0),
      users: Number(userRes?.cnt ?? 0),
    });
  } catch (err: any) {
    res.status(500).json({ status: 'error', error: err.message });
  }
});

export default router;
