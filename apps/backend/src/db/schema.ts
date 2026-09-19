import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import db from './client.js';
import { seedFullDatabase } from './seedFull.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Initializes the PostgreSQL database schema by reading and executing schema.sql.
 * Safe to call repeatedly due to CREATE TABLE IF NOT EXISTS / CREATE INDEX IF NOT EXISTS.
 */
export async function initSchema(): Promise<void> {
  const possiblePaths = [
    path.resolve(__dirname, 'schema.sql'),
    path.resolve(__dirname, 'db/schema.sql'),
    path.resolve(__dirname, '../db/schema.sql'),
    path.resolve(__dirname, '../../src/db/schema.sql'),
    path.resolve(__dirname, '../../../src/db/schema.sql'),
    path.resolve(process.cwd(), 'apps/backend/src/db/schema.sql'),
    path.resolve(process.cwd(), 'src/db/schema.sql'),
  ];

  let schemaSql = '';
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      console.log(`📋 Loading database schema from: ${p}`);
      schemaSql = fs.readFileSync(p, 'utf8');
      break;
    }
  }

  if (schemaSql) {
    await db.exec(schemaSql);
  } else {
    console.warn('⚠️ schema.sql file not found in build paths!');
  }

  await seedIfEmpty();
}

async function seedIfEmpty(): Promise<void> {
  try {
    const userRes = await db.queryOne<{ cnt: string | number }>('SELECT COUNT(*) as cnt FROM users');
    const productRes = await db.queryOne<{ cnt: string | number }>('SELECT COUNT(*) as cnt FROM products');

    const userCount = Number(userRes?.cnt ?? 0);
    const productCount = Number(productRes?.cnt ?? 0);

    if (userCount > 0 && productCount > 0) return;

    console.log('🌱 Empty catalog or users detected. Seeding full catalog, banners, offers, orders & admin account...');
    await seedFullDatabase(db);
    console.log('✅ Full Database Seeding Complete!');
  } catch (err) {
    console.error('Error auto-seeding database:', err);
  }
}

export default initSchema;
