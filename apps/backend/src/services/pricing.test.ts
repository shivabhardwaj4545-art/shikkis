import Database from 'better-sqlite3';
import { describe, expect, it } from 'vitest';
import { calculateCart } from './pricing.js';

function createTestDb(): Database.Database {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');

  // Schema for testing
  db.exec(`
    CREATE TABLE categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT NOT NULL
    );

    CREATE TABLE products (
      id TEXT PRIMARY KEY,
      category_id TEXT NOT NULL,
      name TEXT NOT NULL,
      mrp INTEGER NOT NULL,
      discount_percent INTEGER NOT NULL DEFAULT 0,
      sku TEXT NOT NULL,
      images TEXT NOT NULL DEFAULT '[]',
      is_active INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE product_variants (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL,
      size TEXT NOT NULL,
      color TEXT NOT NULL,
      stock INTEGER NOT NULL DEFAULT 10,
      price_override INTEGER,
      is_active INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE offers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      code TEXT,
      type TEXT NOT NULL,
      value INTEGER NOT NULL,
      max_discount INTEGER,
      min_cart_value INTEGER NOT NULL DEFAULT 0,
      starts_at TEXT NOT NULL,
      ends_at TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      stackable INTEGER NOT NULL DEFAULT 0,
      usage_limit INTEGER,
      used_count INTEGER NOT NULL DEFAULT 0,
      per_user_limit INTEGER NOT NULL DEFAULT 1,
      scope TEXT NOT NULL DEFAULT 'all',
      scope_ids TEXT DEFAULT '[]',
      priority INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE offer_redemptions (
      id TEXT PRIMARY KEY,
      offer_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      order_id TEXT NOT NULL,
      redeemed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Insert standard product test fixture
  db.prepare(`
    INSERT INTO categories (id, name, slug) VALUES ('cat_sarees', 'Sarees', 'sarees');
  `).run();

  db.prepare(`
    INSERT INTO products (id, category_id, name, mrp, discount_percent, sku, images, is_active)
    VALUES ('prd_01', 'cat_sarees', 'Silk Saree', 1000000, 0, 'SKU-01', '["https://example.com/img.jpg"]', 1);
  `).run();

  db.prepare(`
    INSERT INTO product_variants (id, product_id, size, color, stock, price_override, is_active)
    VALUES ('var_01', 'prd_01', 'FREE_SIZE', 'Crimson', 10, NULL, 1);
  `).run();

  return db;
}

describe('Offer & Pricing Engine (calculateCart)', () => {
  it('handles empty cart correctly with zero totals and no shipping', () => {
    const db = createTestDb();
    const result = calculateCart([], 'user_1', undefined, db);

    expect(result.items).toHaveLength(0);
    expect(result.subtotal_mrp_paise).toBe(0);
    expect(result.subtotal_paise).toBe(0);
    expect(result.total_discount_paise).toBe(0);
    expect(result.shipping_paise).toBe(0);
    expect(result.tax_paise).toBe(0);
    expect(result.total_paise).toBe(0);
  });

  it('calculates percent discount with a cap (max_discount enforced)', () => {
    const db = createTestDb();

    // 50% discount capped at ₹1,000 (100,000 paise)
    db.prepare(`
      INSERT INTO offers (
        id, name, code, type, value, max_discount, min_cart_value,
        starts_at, ends_at, is_active, stackable, priority
      ) VALUES (
        'ofr_cap', '50% Capped', 'HALF50', 'percent', 50, 100000, 0,
        '2020-01-01', '2099-01-01', 1, 1, 10
      )
    `).run();

    // Cart total is ₹10,000 (1,000,000 paise) -> 50% would be ₹5,000, but cap is ₹1,000
    const result = calculateCart([{ variant_id: 'var_01', quantity: 1 }], 'user_1', 'HALF50', db);

    expect(result.coupon).toBeDefined();
    expect(result.coupon?.discount_paise).toBe(100000); // capped at ₹1,000 (100,000 paise)
    expect(result.subtotal_paise).toBe(900000); // 1,000,000 - 100,000 = 900,000
  });

  it('rejects flat discount below minimum cart value', () => {
    const db = createTestDb();

    // ₹500 flat off on min cart of ₹15,000
    db.prepare(`
      INSERT INTO offers (
        id, name, code, type, value, min_cart_value,
        starts_at, ends_at, is_active, stackable, priority
      ) VALUES (
        'ofr_min', 'Flat 500 Off', 'FLAT500', 'flat', 50000, 1500000,
        '2020-01-01', '2099-01-01', 1, 1, 10
      )
    `).run();

    // Cart total is ₹10,000 (< ₹15,000 minimum)
    const result = calculateCart([{ variant_id: 'var_01', quantity: 1 }], 'user_1', 'FLAT500', db);

    expect(result.coupon).toBeUndefined();
    expect(result.coupon_error).toContain('Minimum cart value');
    expect(result.total_discount_paise).toBe(0);
  });

  it('ignores expired offers', () => {
    const db = createTestDb();

    // Expired offer
    db.prepare(`
      INSERT INTO offers (
        id, name, code, type, value,
        starts_at, ends_at, is_active, stackable, priority
      ) VALUES (
        'ofr_expired', 'Expired Promo', 'EXPIRED20', 'percent', 20,
        '2020-01-01', '2021-01-01', 1, 1, 10
      )
    `).run();

    const result = calculateCart([{ variant_id: 'var_01', quantity: 1 }], 'user_1', 'EXPIRED20', db);

    expect(result.coupon).toBeUndefined();
    expect(result.coupon_error).toContain('expired');
    expect(result.total_discount_paise).toBe(0);
  });

  it('rejects coupon when usage limit is exhausted', () => {
    const db = createTestDb();

    // Usage limit = 10, already used 10 times
    db.prepare(`
      INSERT INTO offers (
        id, name, code, type, value,
        starts_at, ends_at, is_active, usage_limit, used_count, priority
      ) VALUES (
        'ofr_exhausted', 'Soldout Promo', 'LIMIT10', 'percent', 20,
        '2020-01-01', '2099-01-01', 1, 10, 10, 10
      )
    `).run();

    const result = calculateCart([{ variant_id: 'var_01', quantity: 1 }], 'user_1', 'LIMIT10', db);

    expect(result.coupon).toBeUndefined();
    expect(result.coupon_error).toContain('usage limit has been reached');
  });

  it('rejects coupon when per-user limit is already consumed', () => {
    const db = createTestDb();

    // Per user limit = 1
    db.prepare(`
      INSERT INTO offers (
        id, name, code, type, value,
        starts_at, ends_at, is_active, per_user_limit, priority
      ) VALUES (
        'ofr_peruser', 'Once Per User', 'ONCE10', 'percent', 10,
        '2020-01-01', '2099-01-01', 1, 1, 10
      )
    `).run();

    // Record 1 existing redemption for user_priya
    db.prepare(`
      INSERT INTO offer_redemptions (id, offer_id, user_id, order_id)
      VALUES ('red_1', 'ofr_peruser', 'user_priya', 'ord_123')
    `).run();

    const result = calculateCart([{ variant_id: 'var_01', quantity: 1 }], 'user_priya', 'ONCE10', db);

    expect(result.coupon).toBeUndefined();
    expect(result.coupon_error).toContain('maximum allowed number of times');
  });

  it('enforces non-stackable conflict (rejects coupon if non-stackable auto-offer applied)', () => {
    const db = createTestDb();

    // Non-stackable automatic offer (code IS NULL, stackable = 0)
    db.prepare(`
      INSERT INTO offers (
        id, name, code, type, value,
        starts_at, ends_at, is_active, stackable, priority
      ) VALUES (
        'ofr_auto_nostack', 'Auto Heritage 10%', NULL, 'percent', 10,
        '2020-01-01', '2099-01-01', 1, 0, 100
      )
    `).run();

    // Coupon code offer
    db.prepare(`
      INSERT INTO offers (
        id, name, code, type, value,
        starts_at, ends_at, is_active, stackable, priority
      ) VALUES (
        'ofr_coupon', 'Extra 5% Coupon', 'EXTRA5', 'percent', 5,
        '2020-01-01', '2099-01-01', 1, 1, 10
      )
    `).run();

    const result = calculateCart([{ variant_id: 'var_01', quantity: 1 }], 'user_1', 'EXTRA5', db);

    // Auto offer should be applied
    expect(result.applied_offers.some((o) => o.id === 'ofr_auto_nostack')).toBe(true);
    // Coupon should be rejected due to non-stackable conflict
    expect(result.coupon).toBeUndefined();
    expect(result.coupon_error).toContain('Cannot combine coupon');
  });

  it('applies free shipping offer and waives shipping fee', () => {
    const db = createTestDb();

    // Small item ₹1,000 (standard shipping would be ₹150 because < ₹2,500)
    db.prepare(`
      INSERT INTO products (id, category_id, name, mrp, discount_percent, sku, images, is_active)
      VALUES ('prd_small', 'cat_sarees', 'Dupatta', 100000, 0, 'SKU-SM', '[]', 1);
    `).run();

    db.prepare(`
      INSERT INTO product_variants (id, product_id, size, color, stock, is_active)
      VALUES ('var_small', 'prd_small', 'FREE_SIZE', 'Gold', 10, 1);
    `).run();

    // Without coupon, shipping is ₹150 (15,000 paise)
    const baseResult = calculateCart([{ variant_id: 'var_small', quantity: 1 }], 'user_1', undefined, db);
    expect(baseResult.shipping_paise).toBe(15000);

    // Free shipping coupon
    db.prepare(`
      INSERT INTO offers (
        id, name, code, type, value,
        starts_at, ends_at, is_active, stackable, priority
      ) VALUES (
        'ofr_freeship', 'Complimentary Shipping', 'FREESHIP', 'free_shipping', 0,
        '2020-01-01', '2099-01-01', 1, 1, 10
      )
    `).run();

    const freeShipResult = calculateCart([{ variant_id: 'var_small', quantity: 1 }], 'user_1', 'FREESHIP', db);
    expect(freeShipResult.shipping_paise).toBe(0);
    expect(freeShipResult.coupon).toBeDefined();
    expect(freeShipResult.coupon?.code).toBe('FREESHIP');
  });
});
