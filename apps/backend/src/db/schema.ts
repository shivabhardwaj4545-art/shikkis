import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import db from './client.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Initializes the SQLite database schema by reading and executing schema.sql.
 * Safe to call repeatedly due to CREATE TABLE IF NOT EXISTS / CREATE INDEX IF NOT EXISTS.
 */
import { seedFullDatabase } from './seedFull.js';

export function initSchema(): void {
  let schemaPath = path.resolve(__dirname, 'schema.sql');
  if (!fs.existsSync(schemaPath)) {
    schemaPath = path.resolve(__dirname, '../../../src/db/schema.sql');
  }
  if (!fs.existsSync(schemaPath)) {
    schemaPath = path.resolve(__dirname, '../../src/db/schema.sql');
  }
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');
  db.exec(schemaSql);

  seedIfEmpty();
}

function seedIfEmpty(): void {
  try {
    const userCount = (db.prepare('SELECT COUNT(*) as cnt FROM users').get() as any)?.cnt || 0;
    const productCount = (db.prepare('SELECT COUNT(*) as cnt FROM products').get() as any)?.cnt || 0;
    if (userCount > 0 && productCount > 0) return;

    console.log('🌱 Empty catalog or users detected. Seeding full catalog, banners, offers, orders & admin account...');
    seedFullDatabase(db);
    console.log('✅ Full Database Seeding Complete!');
  } catch (err) {
    console.error('Error auto-seeding database:', err);
  }
}

export default initSchema;
