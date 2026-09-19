const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

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
  created_at    TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS customer_profiles (
  id              TEXT PRIMARY KEY,
  user_id         TEXT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date_of_birth   TEXT,
  total_orders    INTEGER NOT NULL DEFAULT 0,
  lifetime_spend  INTEGER NOT NULL DEFAULT 0,
  last_order_date TEXT,
  created_at      TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  revoked_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
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
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS categories (
  id            TEXT PRIMARY KEY,
  name          TEXT UNIQUE NOT NULL,
  slug          TEXT UNIQUE NOT NULL,
  description   TEXT,
  image_url     TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active     INTEGER NOT NULL DEFAULT 1,
  created_at    TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
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
  mrp               INTEGER NOT NULL,
  discount_percent  INTEGER NOT NULL DEFAULT 0,
  sku               TEXT UNIQUE NOT NULL,
  images            TEXT NOT NULL DEFAULT '[]',
  is_active         INTEGER NOT NULL DEFAULT 1,
  is_featured       INTEGER NOT NULL DEFAULT 0,
  created_at        TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS product_variants (
  id             TEXT PRIMARY KEY,
  product_id     TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  size           TEXT NOT NULL,
  color          TEXT NOT NULL,
  variant_sku    TEXT UNIQUE NOT NULL,
  price_override INTEGER,
  stock          INTEGER NOT NULL DEFAULT 0,
  weight_grams   INTEGER NOT NULL DEFAULT 0,
  is_active      INTEGER NOT NULL DEFAULT 1,
  created_at     TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(product_id, size, color)
);

CREATE TABLE IF NOT EXISTS offers (
  id               TEXT PRIMARY KEY,
  name             TEXT NOT NULL,
  code             TEXT UNIQUE,
  type             TEXT NOT NULL CHECK(type IN ('percent', 'flat', 'bxgy', 'free_shipping')),
  value            INTEGER NOT NULL,
  max_discount     INTEGER,
  min_cart_value   INTEGER NOT NULL DEFAULT 0,
  starts_at        TEXT NOT NULL,
  ends_at          TEXT NOT NULL,
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
  created_at       TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS offer_redemptions (
  id          TEXT PRIMARY KEY,
  offer_id    TEXT NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  order_id    TEXT,
  redeemed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at  TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS banners (
  id            TEXT PRIMARY KEY,
  title         TEXT NOT NULL,
  subtitle      TEXT,
  image_url     TEXT NOT NULL,
  cta_text      TEXT NOT NULL DEFAULT 'Shop Now',
  cta_link      TEXT NOT NULL DEFAULT '/catalog',
  display_order INTEGER NOT NULL DEFAULT 0,
  starts_at     TEXT,
  ends_at       TEXT,
  is_active     INTEGER NOT NULL DEFAULT 1,
  created_by    TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at    TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS carts (
  id          TEXT PRIMARY KEY,
  user_id     TEXT REFERENCES users(id) ON DELETE CASCADE,
  session_id  TEXT,
  coupon_code TEXT,
  expires_at  TEXT,
  created_at  TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS cart_items (
  id         TEXT PRIMARY KEY,
  cart_id    TEXT NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
  variant_id TEXT NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
  quantity   INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(cart_id, variant_id)
);

CREATE TABLE IF NOT EXISTS orders (
  id                        TEXT PRIMARY KEY,
  order_number              TEXT UNIQUE NOT NULL,
  user_id                   TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  subtotal                  INTEGER NOT NULL,
  discount_amount           INTEGER NOT NULL DEFAULT 0,
  shipping_cost             INTEGER NOT NULL DEFAULT 0,
  tax                       INTEGER NOT NULL DEFAULT 0,
  total_amount              INTEGER NOT NULL,
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
  created_at                TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at                TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS order_items (
  id                   TEXT PRIMARY KEY,
  order_id             TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  variant_id           TEXT REFERENCES product_variants(id) ON DELETE SET NULL,
  product_name         TEXT NOT NULL,
  size                 TEXT NOT NULL,
  color                TEXT NOT NULL,
  quantity             INTEGER NOT NULL,
  price_at_purchase    INTEGER NOT NULL,
  discount_at_purchase INTEGER NOT NULL DEFAULT 0,
  created_at           TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS order_status_history (
  id         TEXT PRIMARY KEY,
  order_id   TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status     TEXT NOT NULL,
  note       TEXT,
  changed_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS audit_log (
  id          TEXT PRIMARY KEY,
  user_id     TEXT REFERENCES users(id) ON DELETE SET NULL,
  action      TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id   TEXT,
  changes     TEXT,
  ip_address  TEXT,
  created_at  TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
`;

const dataDir = path.resolve(__dirname, 'test_ddl_data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);
const db = new Database(path.join(dataDir, 'test_ddl.db'));

try {
  db.exec(FALLBACK_SCHEMA_SQL);
  console.log('✅ SQLite DDL executed successfully in ONE shot!');
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  console.log('Created tables:', tables.map(t => t.name));
} catch (e) {
  console.error('❌ DDL error:', e.message);
}

db.close();
fs.rmSync(dataDir, { recursive: true, force: true });
