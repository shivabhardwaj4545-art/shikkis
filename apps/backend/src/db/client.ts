import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import type { Database as DatabaseType } from 'better-sqlite3';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Resolve SQLite database path reliably across dev and production
const dbPath =
  process.env.DATABASE_PATH ||
  path.resolve(process.cwd(), 'data/shikkis.db');

const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

export const db: DatabaseType = new Database(dbPath);

// ── Required by project rules ────────────────────────────────────────────────
// WAL mode: enables concurrent reads while a write is in progress
db.pragma('journal_mode = WAL');
// Foreign key constraints: enforced at the DB level, not just application level
db.pragma('foreign_keys = ON');

export const getDb = (): DatabaseType => db;
export default db;
