import pkg from 'pg';
import Database from 'better-sqlite3';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), 'apps/backend/.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const { Pool } = pkg;

const connectionString =
  process.env.DATABASE_URL ||
  process.env.DATABASE_PUBLIC_URL ||
  process.env.DATABASE_PRIVATE_URL ||
  process.env.POSTGRES_URL ||
  process.env.PG_URL ||
  process.env.PGURL;

let poolConfig: pkg.PoolConfig;

if (connectionString) {
  const isLocalHost = connectionString.includes('localhost') || connectionString.includes('127.0.0.1');
  const disableSsl = process.env.PGSSLMODE === 'disable' || process.env.PGSSL === 'false';

  poolConfig = {
    connectionString,
    ssl: disableSsl || isLocalHost ? false : { rejectUnauthorized: false },
    connectionTimeoutMillis: 3000,
  };
} else {
  const host =
    process.env.PGHOST ||
    process.env.POSTGRES_HOST ||
    (process.env.NODE_ENV === 'production' ? 'postgres.railway.internal' : 'localhost');
  const port = Number(process.env.PGPORT || process.env.POSTGRES_PORT || 5432);
  const user = process.env.PGUSER || process.env.POSTGRES_USER || 'postgres';
  const password = process.env.PGPASSWORD || process.env.POSTGRES_PASSWORD || 'Shiva@123';
  const database = process.env.PGDATABASE || process.env.POSTGRES_DB || (process.env.NODE_ENV === 'production' ? 'railway' : 'shikkis');

  const isLocalHost = host === 'localhost' || host === '127.0.0.1';
  const disableSsl = process.env.PGSSLMODE === 'disable' || process.env.PGSSL === 'false';

  poolConfig = {
    host,
    port,
    user,
    password,
    database,
    ssl: disableSsl || isLocalHost ? false : { rejectUnauthorized: false },
    connectionTimeoutMillis: 3000,
  };
}

console.log(`🔌 Initializing PostgreSQL Pool [host/conn: ${connectionString ? 'DATABASE_URL' : poolConfig.host}:${poolConfig.port || 5432}, db: ${poolConfig.database || 'default'}]`);

export const pool = new Pool(poolConfig);

let sqliteDb: InstanceType<typeof Database> | null = null;
let isUsingSqlite = false;

pool.on('error', (err) => {
  console.error('⚠️ Unexpected PostgreSQL pool error:', err?.message || err);
});

const FALLBACK_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  first_name    TEXT NOT NULL,
  last_name     TEXT NOT NULL,
  phone         TEXT,
  role          TEXT NOT NULL DEFAULT 'customer' CHECK(role IN ('owner', 'customer')),
  is_active     INTEGER NOT NULL DEFAULT 1,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS customer_profiles (
  id              TEXT PRIMARY KEY,
  user_id         TEXT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date_of_birth   TEXT,
  total_orders    INTEGER NOT NULL DEFAULT 0,
  lifetime_spend  BIGINT NOT NULL DEFAULT 0,
  last_order_date TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS addresses (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  label      TEXT,
  full_name  TEXT NOT NULL,
  line1      TEXT NOT NULL,
  line2      TEXT,
  city       TEXT NOT NULL,
  state      TEXT NOT NULL,
  pincode    TEXT NOT NULL,
  phone      TEXT NOT NULL,
  is_default INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS categories (
  id            TEXT PRIMARY KEY,
  name          TEXT UNIQUE NOT NULL,
  slug          TEXT UNIQUE NOT NULL,
  description   TEXT,
  image_url     TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active     INTEGER NOT NULL DEFAULT 1,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS products (
  id                TEXT PRIMARY KEY,
  category_id       TEXT NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  name              TEXT NOT NULL,
  slug              TEXT UNIQUE NOT NULL,
  description       TEXT NOT NULL,
  long_description  TEXT,
  fabric            TEXT,
  occasion          TEXT,
  gender            TEXT NOT NULL DEFAULT 'women' CHECK(gender IN ('men', 'women', 'unisex')),
  care_instructions TEXT,
  mrp               BIGINT NOT NULL,
  discount_percent  INTEGER NOT NULL DEFAULT 0,
  sku               TEXT UNIQUE NOT NULL,
  images            TEXT NOT NULL DEFAULT '[]',
  is_active         INTEGER NOT NULL DEFAULT 1,
  is_featured       INTEGER NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS product_variants (
  id             TEXT PRIMARY KEY,
  product_id     TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  size           TEXT NOT NULL,
  color          TEXT NOT NULL,
  variant_sku    TEXT UNIQUE NOT NULL,
  price_override BIGINT,
  stock          INTEGER NOT NULL DEFAULT 0,
  weight_grams   INTEGER NOT NULL DEFAULT 0,
  is_active      INTEGER NOT NULL DEFAULT 1,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(product_id, size, color)
);

CREATE TABLE IF NOT EXISTS offers (
  id               TEXT PRIMARY KEY,
  name             TEXT NOT NULL,
  code             TEXT UNIQUE,
  type             TEXT NOT NULL CHECK(type IN ('percent', 'flat', 'bxgy', 'free_shipping')),
  value            BIGINT NOT NULL,
  max_discount     BIGINT,
  min_cart_value   BIGINT NOT NULL DEFAULT 0,
  starts_at        TIMESTAMPTZ NOT NULL,
  ends_at          TIMESTAMPTZ NOT NULL,
  is_active        INTEGER NOT NULL DEFAULT 1,
  stackable        INTEGER NOT NULL DEFAULT 0,
  usage_limit      INTEGER,
  used_count       INTEGER NOT NULL DEFAULT 0,
  per_user_limit   INTEGER NOT NULL DEFAULT 1,
  scope            TEXT NOT NULL DEFAULT 'all' CHECK(scope IN ('all', 'category', 'product')),
  scope_ids        TEXT NOT NULL DEFAULT '[]',
  banner_image_url TEXT,
  priority         INTEGER NOT NULL DEFAULT 0,
  created_by       TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS offer_redemptions (
  id          TEXT PRIMARY KEY,
  offer_id    TEXT NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  order_id    TEXT,
  redeemed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS banners (
  id            TEXT PRIMARY KEY,
  title         TEXT NOT NULL,
  subtitle      TEXT,
  image_url     TEXT NOT NULL,
  cta_text      TEXT NOT NULL DEFAULT 'Shop Now',
  cta_link      TEXT NOT NULL DEFAULT '/catalog',
  display_order INTEGER NOT NULL DEFAULT 0,
  starts_at     TIMESTAMPTZ,
  ends_at       TIMESTAMPTZ,
  is_active     INTEGER NOT NULL DEFAULT 1,
  created_by    TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS carts (
  id          TEXT PRIMARY KEY,
  user_id     TEXT REFERENCES users(id) ON DELETE CASCADE,
  session_id  TEXT,
  coupon_code TEXT,
  expires_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS cart_items (
  id         TEXT PRIMARY KEY,
  cart_id    TEXT NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
  variant_id TEXT NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
  quantity   INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(cart_id, variant_id)
);

CREATE TABLE IF NOT EXISTS orders (
  id                        TEXT PRIMARY KEY,
  order_number              TEXT UNIQUE NOT NULL,
  user_id                   TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  subtotal                  BIGINT NOT NULL,
  discount_amount           BIGINT NOT NULL DEFAULT 0,
  shipping_cost             BIGINT NOT NULL DEFAULT 0,
  tax                       BIGINT NOT NULL DEFAULT 0,
  total_amount              BIGINT NOT NULL,
  fulfillment_type          TEXT NOT NULL DEFAULT 'delivery' CHECK(fulfillment_type IN ('delivery', 'pickup')),
  delivery_address_snapshot TEXT,
  pickup_slot               TEXT,
  payment_status            TEXT NOT NULL DEFAULT 'pending' CHECK(payment_status IN ('pending', 'paid', 'failed', 'refunded')),
  payment_method            TEXT NOT NULL DEFAULT 'online' CHECK(payment_method IN ('online', 'cod')),
  razorpay_order_id         TEXT,
  razorpay_payment_id       TEXT,
  order_status              TEXT NOT NULL DEFAULT 'placed' CHECK(order_status IN ('placed', 'confirmed', 'ready_for_pickup', 'out_for_delivery', 'delivered', 'picked_up', 'cancelled')),
  customer_notes            TEXT,
  internal_notes            TEXT,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS order_items (
  id                   TEXT PRIMARY KEY,
  order_id             TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  variant_id           TEXT REFERENCES product_variants(id) ON DELETE SET NULL,
  product_name         TEXT NOT NULL,
  size                 TEXT NOT NULL,
  color                TEXT NOT NULL,
  quantity             INTEGER NOT NULL,
  price_at_purchase    BIGINT NOT NULL,
  discount_at_purchase BIGINT NOT NULL DEFAULT 0,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS order_status_history (
  id         TEXT PRIMARY KEY,
  order_id   TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status     TEXT NOT NULL,
  note       TEXT,
  changed_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS audit_log (
  id          TEXT PRIMARY KEY,
  user_id     TEXT REFERENCES users(id) ON DELETE SET NULL,
  action      TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id   TEXT,
  changes     TEXT,
  ip_address  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
`;

function getSqliteInstance() {
  if (!sqliteDb) {
    const dataDir = path.resolve(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    const dbPath = path.join(dataDir, 'shikkis.db');
    sqliteDb = new Database(dbPath);
    sqliteDb.pragma('journal_mode = WAL');
    sqliteDb.pragma('foreign_keys = ON');
    console.log(`📦 Fallback SQLite Database initialized at ${dbPath}`);

    try {
      const stmts = FALLBACK_SCHEMA_SQL.split(';').map(s => s.trim()).filter(s => s.length > 0);
      for (const s of stmts) {
        const { text } = parseSqliteParams(s, []);
        if (text) sqliteDb.exec(text);
      }
      console.log('✅ SQLite fallback schema tables initialized.');
    } catch (e: any) {
      console.error('Error auto-creating SQLite tables:', e?.message || e);
    }
  }
  return sqliteDb;
}

function parseSqliteParams(sql: string, params: any[]): { text: string; values: any[] } {
  let values = params;
  let text = sql;

  if (params.length === 1 && typeof params[0] === 'object' && params[0] !== null && !Array.isArray(params[0])) {
    const obj = params[0];
    const paramKeys: string[] = [];
    text = sql.replace(/@([a-zA-Z0-9_]+)/g, (_, key) => {
      paramKeys.push(key);
      return '?';
    });
    values = paramKeys.map(k => (obj[k] !== undefined ? obj[k] : null));
  } else {
    text = sql.replace(/\$\d+/g, '?');
    if (params.length === 1 && Array.isArray(params[0])) {
      values = params[0];
    }
  }

  // Convert PostgreSQL specific functions/syntax to SQLite equivalents
  text = text.replace(/\bILIKE\b/gi, 'LIKE');
  text = text.replace(/\bTIMESTAMPTZ\b/gi, 'TEXT');
  text = text.replace(/\bBIGINT\b/gi, 'INTEGER');
  text = text.replace(/CURRENT_TIMESTAMP/gi, "datetime('now')");

  return { text, values };
}

export function parseSqlAndParams(sql: string, params: any[]): { text: string; values: any[] } {
  if (params.length === 1 && typeof params[0] === 'object' && params[0] !== null && !Array.isArray(params[0])) {
    const obj = params[0];
    const paramKeys: string[] = [];
    const text = sql.replace(/@([a-zA-Z0-9_]+)/g, (_, key) => {
      paramKeys.push(key);
      return `$${paramKeys.length}`;
    });
    if (paramKeys.length > 0) {
      const values = paramKeys.map((key) => (obj[key] !== undefined ? obj[key] : null));
      return { text, values };
    }
  }

  let paramIndex = 1;
  const text = /\$\d+/.test(sql) ? sql : sql.replace(/\?/g, () => `$${paramIndex++}`);
  const values = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
  return { text, values };
}

export interface DbClient {
  query<T = any>(sql: string, ...params: any[]): Promise<T[]>;
  queryOne<T = any>(sql: string, ...params: any[]): Promise<T | null>;
  execute(sql: string, ...params: any[]): Promise<{ rowCount: number }>;
  exec(sql: string): Promise<void>;
  transaction<T>(callback: (client: any) => Promise<T>): Promise<T>;
  prepare(sql: string): {
    get(...params: any[]): Promise<any>;
    all(...params: any[]): Promise<any[]>;
    run(...params: any[]): Promise<{ changes: number }>;
  };
}

function handleDbError(err: any): boolean {
  const msg = err?.message || String(err);
  const code = err?.code;
  if (
    code === 'ECONNREFUSED' ||
    code === 'ETIMEDOUT' ||
    code === 'ENOTFOUND' ||
    code === '28P01' || // password failed
    code === '3D000' || // database does not exist
    msg.includes('Connection terminated') ||
    msg.includes('connect') ||
    msg.includes('connection')
  ) {
    if (!isUsingSqlite) {
      console.warn(`⚠️ PostgreSQL connection unavailable (${msg}). Switching to SQLite fallback engine.`);
      isUsingSqlite = true;
    }
    return true;
  }
  return false;
}

export const db: DbClient = {
  async query<T = any>(sql: string, ...params: any[]): Promise<T[]> {
    if (isUsingSqlite) {
      const sDb = getSqliteInstance();
      const { text, values } = parseSqliteParams(sql, params);
      const stmt = sDb.prepare(text);
      return stmt.all(...values) as T[];
    }
    try {
      const { text, values } = parseSqlAndParams(sql, params);
      const res = await pool.query(text, values);
      return res.rows as T[];
    } catch (err: any) {
      if (handleDbError(err)) {
        return this.query<T>(sql, ...params);
      }
      throw err;
    }
  },

  async queryOne<T = any>(sql: string, ...params: any[]): Promise<T | null> {
    const rows = await this.query<T>(sql, ...params);
    return rows.length > 0 ? rows[0] : null;
  },

  async execute(sql: string, ...params: any[]): Promise<{ rowCount: number }> {
    if (isUsingSqlite) {
      const sDb = getSqliteInstance();
      const { text, values } = parseSqliteParams(sql, params);
      const stmt = sDb.prepare(text);
      const info = stmt.run(...values);
      return { rowCount: info.changes };
    }
    try {
      const { text, values } = parseSqlAndParams(sql, params);
      const res = await pool.query(text, values);
      return { rowCount: res.rowCount ?? 0 };
    } catch (err: any) {
      if (handleDbError(err)) {
        return this.execute(sql, ...params);
      }
      throw err;
    }
  },

  async exec(sql: string): Promise<void> {
    if (isUsingSqlite) {
      const sDb = getSqliteInstance();
      const statements = sql
        .split(';')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
      for (const stmtSql of statements) {
        const { text } = parseSqliteParams(stmtSql, []);
        sDb.exec(text);
      }
      return;
    }
    try {
      await pool.query(sql);
    } catch (err: any) {
      if (handleDbError(err)) {
        return this.exec(sql);
      }
      throw err;
    }
  },

  async transaction<T>(callback: (client: any) => Promise<T>): Promise<T> {
    if (isUsingSqlite) {
      const sDb = getSqliteInstance();
      const txClient = {
        async query<R = any>(sql: string, ...params: any[]): Promise<R[]> {
          const { text, values } = parseSqliteParams(sql, params);
          return sDb.prepare(text).all(...values) as R[];
        },
        async queryOne<R = any>(sql: string, ...params: any[]): Promise<R | null> {
          const { text, values } = parseSqliteParams(sql, params);
          const rows = sDb.prepare(text).all(...values) as R[];
          return rows.length > 0 ? rows[0] : null;
        },
        async execute(sql: string, ...params: any[]): Promise<{ rowCount: number }> {
          const { text, values } = parseSqliteParams(sql, params);
          const info = sDb.prepare(text).run(...values);
          return { rowCount: info.changes };
        },
        prepare(sql: string) {
          const { text } = parseSqliteParams(sql, []);
          const stmt = sDb.prepare(text);
          return {
            async get(...params: any[]): Promise<any> {
              const { values } = parseSqliteParams(sql, params);
              return stmt.get(...values) || null;
            },
            async all(...params: any[]): Promise<any[]> {
              const { values } = parseSqliteParams(sql, params);
              return stmt.all(...values);
            },
            async run(...params: any[]): Promise<{ changes: number }> {
              const { values } = parseSqliteParams(sql, params);
              const info = stmt.run(...values);
              return { changes: info.changes };
            },
          };
        },
      };

      sDb.exec('BEGIN TRANSACTION');
      try {
        const res = await callback(txClient);
        sDb.exec('COMMIT');
        return res;
      } catch (err) {
        sDb.exec('ROLLBACK');
        throw err;
      }
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const txClient = {
        async query<R = any>(sql: string, ...params: any[]): Promise<R[]> {
          const { text, values } = parseSqlAndParams(sql, params);
          const res = await client.query(text, values);
          return res.rows as R[];
        },
        async queryOne<R = any>(sql: string, ...params: any[]): Promise<R | null> {
          const { text, values } = parseSqlAndParams(sql, params);
          const res = await client.query(text, values);
          return res.rows.length > 0 ? (res.rows[0] as R) : null;
        },
        async execute(sql: string, ...params: any[]): Promise<{ rowCount: number }> {
          const { text, values } = parseSqlAndParams(sql, params);
          const res = await client.query(text, values);
          return { rowCount: res.rowCount ?? 0 };
        },
        prepare(sql: string) {
          return {
            async get(...params: any[]): Promise<any> {
              const { text, values } = parseSqlAndParams(sql, params);
              const res = await client.query(text, values);
              return res.rows.length > 0 ? res.rows[0] : null;
            },
            async all(...params: any[]): Promise<any[]> {
              const { text, values } = parseSqlAndParams(sql, params);
              const res = await client.query(text, values);
              return res.rows;
            },
            async run(...params: any[]): Promise<{ changes: number }> {
              const { text, values } = parseSqlAndParams(sql, params);
              const res = await client.query(text, values);
              return { changes: res.rowCount ?? 0 };
            },
          };
        },
      };
      const result = await callback(txClient);
      await client.query('COMMIT');
      return result;
    } catch (err: any) {
      await client.query('ROLLBACK');
      if (handleDbError(err)) {
        return this.transaction(callback);
      }
      throw err;
    } finally {
      client.release();
    }
  },

  prepare(sql: string) {
    return {
      async get(...params: any[]): Promise<any> {
        const rows = await db.query(sql, ...params);
        return rows.length > 0 ? rows[0] : null;
      },
      async all(...params: any[]): Promise<any[]> {
        return db.query(sql, ...params);
      },
      async run(...params: any[]): Promise<{ changes: number }> {
        const res = await db.execute(sql, ...params);
        return { changes: res.rowCount };
      },
    };
  },
};

export const getDb = (): DbClient => db;
export default db;
