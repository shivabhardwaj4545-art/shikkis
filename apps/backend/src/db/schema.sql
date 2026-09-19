-- ============================================================================
-- Shikkis E-Commerce Database Schema
-- PostgreSQL Schema
-- Monetary values stored as INTEGER / BIGINT paise (₹1.00 = 100 paise). NEVER floats.
-- ============================================================================

-- 1. Users
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

-- 2. Customer Profiles
CREATE TABLE IF NOT EXISTS customer_profiles (
  id              TEXT PRIMARY KEY,
  user_id         TEXT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date_of_birth   TEXT,
  total_orders    INTEGER NOT NULL DEFAULT 0,
  lifetime_spend  BIGINT NOT NULL DEFAULT 0, -- in paise
  last_order_date TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3. Refresh Tokens
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 4. Addresses
CREATE TABLE IF NOT EXISTS addresses (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  label      TEXT, -- e.g. 'Home', 'Work'
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

-- 5. Categories
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

-- 6. Products
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
  mrp               BIGINT NOT NULL, -- in paise
  discount_percent  INTEGER NOT NULL DEFAULT 0,
  sku               TEXT UNIQUE NOT NULL,
  images            TEXT NOT NULL DEFAULT '[]', -- JSON array of image URLs
  is_active         INTEGER NOT NULL DEFAULT 1,
  is_featured       INTEGER NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 7. Product Variants
CREATE TABLE IF NOT EXISTS product_variants (
  id             TEXT PRIMARY KEY,
  product_id     TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  size           TEXT NOT NULL,
  color          TEXT NOT NULL,
  variant_sku    TEXT UNIQUE NOT NULL,
  price_override BIGINT, -- in paise, overrides product mrp if set
  stock          INTEGER NOT NULL DEFAULT 0,
  weight_grams   INTEGER NOT NULL DEFAULT 0,
  is_active      INTEGER NOT NULL DEFAULT 1,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(product_id, size, color)
);

-- 8. Offers
CREATE TABLE IF NOT EXISTS offers (
  id               TEXT PRIMARY KEY,
  name             TEXT NOT NULL,
  code             TEXT UNIQUE, -- NULL allowed for auto-applied promotions
  type             TEXT NOT NULL CHECK(type IN ('percent', 'flat', 'bxgy', 'free_shipping')),
  value            BIGINT NOT NULL, -- percentage or paise
  max_discount     BIGINT, -- in paise, for percent discounts
  min_cart_value   BIGINT NOT NULL DEFAULT 0, -- in paise
  starts_at        TIMESTAMPTZ NOT NULL,
  ends_at          TIMESTAMPTZ NOT NULL,
  is_active        INTEGER NOT NULL DEFAULT 1,
  stackable        INTEGER NOT NULL DEFAULT 0,
  usage_limit      INTEGER, -- overall redemption limit
  used_count       INTEGER NOT NULL DEFAULT 0,
  per_user_limit   INTEGER NOT NULL DEFAULT 1,
  scope            TEXT NOT NULL DEFAULT 'all' CHECK(scope IN ('all', 'category', 'product')),
  scope_ids        TEXT NOT NULL DEFAULT '[]', -- JSON array of category or product IDs
  banner_image_url TEXT,
  priority         INTEGER NOT NULL DEFAULT 0,
  created_by       TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 9. Offer Redemptions
CREATE TABLE IF NOT EXISTS offer_redemptions (
  id          TEXT PRIMARY KEY,
  offer_id    TEXT NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  order_id    TEXT,
  redeemed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 10. Banners
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

-- 11. Carts
CREATE TABLE IF NOT EXISTS carts (
  id          TEXT PRIMARY KEY,
  user_id     TEXT REFERENCES users(id) ON DELETE CASCADE,
  session_id  TEXT,
  coupon_code TEXT,
  expires_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 12. Cart Items
CREATE TABLE IF NOT EXISTS cart_items (
  id         TEXT PRIMARY KEY,
  cart_id    TEXT NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
  variant_id TEXT NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
  quantity   INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(cart_id, variant_id)
);

-- 13. Orders
CREATE TABLE IF NOT EXISTS orders (
  id                        TEXT PRIMARY KEY,
  order_number              TEXT UNIQUE NOT NULL,
  user_id                   TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  subtotal                  BIGINT NOT NULL, -- in paise
  discount_amount           BIGINT NOT NULL DEFAULT 0, -- in paise
  shipping_cost             BIGINT NOT NULL DEFAULT 0, -- in paise
  tax                       BIGINT NOT NULL DEFAULT 0, -- in paise
  total_amount              BIGINT NOT NULL, -- in paise
  fulfillment_type          TEXT NOT NULL DEFAULT 'delivery' CHECK(fulfillment_type IN ('delivery', 'pickup')),
  delivery_address_snapshot TEXT, -- JSON snapshot of address
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

-- 14. Order Items
CREATE TABLE IF NOT EXISTS order_items (
  id                   TEXT PRIMARY KEY,
  order_id             TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  variant_id           TEXT REFERENCES product_variants(id) ON DELETE SET NULL,
  product_name         TEXT NOT NULL,
  size                 TEXT NOT NULL,
  color                TEXT NOT NULL,
  quantity             INTEGER NOT NULL,
  price_at_purchase    BIGINT NOT NULL, -- in paise
  discount_at_purchase BIGINT NOT NULL DEFAULT 0, -- in paise
  created_at           TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 15. Order Status History
CREATE TABLE IF NOT EXISTS order_status_history (
  id         TEXT PRIMARY KEY,
  order_id   TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status     TEXT NOT NULL,
  note       TEXT,
  changed_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 16. Audit Log
CREATE TABLE IF NOT EXISTS audit_log (
  id          TEXT PRIMARY KEY,
  user_id     TEXT REFERENCES users(id) ON DELETE SET NULL,
  action      TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id   TEXT,
  changes     TEXT, -- JSON representation of diff or payload
  ip_address  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- INDEXES
-- Index foreign keys & columns used in WHERE or ORDER BY clauses
-- ============================================================================

-- Foreign Key Indexes
CREATE INDEX IF NOT EXISTS idx_customer_profiles_user_id ON customer_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_addresses_user_id ON addresses(user_id);
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_product_variants_product_id ON product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_offers_created_by ON offers(created_by);
CREATE INDEX IF NOT EXISTS idx_offer_redemptions_offer_id ON offer_redemptions(offer_id);
CREATE INDEX IF NOT EXISTS idx_offer_redemptions_user_id ON offer_redemptions(user_id);
CREATE INDEX IF NOT EXISTS idx_offer_redemptions_order_id ON offer_redemptions(order_id);
CREATE INDEX IF NOT EXISTS idx_banners_created_by ON banners(created_by);
CREATE INDEX IF NOT EXISTS idx_carts_user_id ON carts(user_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_cart_id ON cart_items(cart_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_variant_id ON cart_items(variant_id);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_variant_id ON order_items(variant_id);
CREATE INDEX IF NOT EXISTS idx_order_status_history_order_id ON order_status_history(order_id);
CREATE INDEX IF NOT EXISTS idx_order_status_history_changed_by ON order_status_history(changed_by);
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id);

-- Filter & Order By Indexes per spec
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_is_featured ON products(is_featured);
CREATE INDEX IF NOT EXISTS idx_products_gender ON products(gender);
CREATE INDEX IF NOT EXISTS idx_products_active_category ON products(category_id, is_active);

CREATE INDEX IF NOT EXISTS idx_orders_order_status ON orders(order_status);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at_desc ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_user_created ON orders(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_offers_active_window ON offers(is_active, starts_at, ends_at);

CREATE INDEX IF NOT EXISTS idx_categories_display_order ON categories(is_active, display_order);
CREATE INDEX IF NOT EXISTS idx_banners_display_order ON banners(is_active, display_order);
