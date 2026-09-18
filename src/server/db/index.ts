import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbDir = path.resolve(__dirname, '../../../data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.resolve(dbDir, 'shikkis.db');
export const db = new Database(dbPath);

// Enable WAL mode & Foreign Key constraints as required by project rules
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export default db;
