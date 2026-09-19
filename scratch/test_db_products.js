import dotenv from 'dotenv';
import pkg from 'pg';
import path from 'path';

dotenv.config({ path: path.resolve('apps/backend/.env') });

const { Pool } = pkg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/shikkis',
});

async function main() {
  const catRes = await pool.query('SELECT id, name, slug, is_active FROM categories');
  console.log('Categories:', catRes.rows);

  const prodRes = await pool.query('SELECT id, name, slug, category_id, gender, occasion, mrp, discount_percent, is_active FROM products');
  console.log('Products count:', prodRes.rows.length);
  console.log('Products sample:', prodRes.rows.slice(0, 5));

  await pool.end();
}

main().catch(console.error);
