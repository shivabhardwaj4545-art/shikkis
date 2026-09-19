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
}

export default initSchema;
