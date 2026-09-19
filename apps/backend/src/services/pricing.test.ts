import { describe, expect, it } from 'vitest';
import db from '../db/client.js';
import { calculateCart } from './pricing.js';

function createTestDb() {
  return db;
}

describe('Offer & Pricing Engine (calculateCart)', () => {
  it('handles empty cart correctly with zero totals and no shipping', async () => {
    const testDb = createTestDb();
    const result = await calculateCart([], 'user_1', undefined, testDb);

    expect(result.items).toHaveLength(0);
    expect(result.subtotal_mrp_paise).toBe(0);
    expect(result.subtotal_paise).toBe(0);
    expect(result.total_discount_paise).toBe(0);
    expect(result.shipping_paise).toBe(0);
    expect(result.tax_paise).toBe(0);
    expect(result.total_paise).toBe(0);
  });

  it('calculates percent discount with a cap (max_discount enforced)', async () => {
    const testDb = createTestDb();

    // 50% discount capped at ₹1,000 (100,000 paise)
    await testDb.prepare(`
      INSERT INTO offers (
        id, name, code, type, value, max_discount, min_cart_value,
        starts_at, ends_at, is_active, stackable, priority
      ) VALUES (
        'ofr_cap', '50% Capped', 'HALF50', 'percent', 50, 100000, 0,
        '2020-01-01', '2099-01-01', 1, 1, 10
      )
    `).run();

    // Cart total is ₹10,000 (1,000,000 paise) -> 50% would be ₹5,000, but cap is ₹1,000
    const result = await calculateCart([{ variant_id: 'var_01', quantity: 1 }], 'user_1', 'HALF50', testDb);

    expect(result.coupon).toBeDefined();
    expect(result.coupon?.discount_paise).toBe(100000); // capped at ₹1,000 (100,000 paise)
    expect(result.subtotal_paise).toBe(900000); // 1,000,000 - 100,000 = 900,000
  });

  it('rejects flat discount below minimum cart value', async () => {
    const testDb = createTestDb();

    // ₹500 flat off on min cart of ₹15,000
    await testDb.prepare(`
      INSERT INTO offers (
        id, name, code, type, value, min_cart_value,
        starts_at, ends_at, is_active, stackable, priority
      ) VALUES (
        'ofr_min', 'Flat 500 Off', 'FLAT500', 'flat', 50000, 1500000,
        '2020-01-01', '2099-01-01', 1, 1, 10
      )
    `).run();

    // Cart total is ₹10,000 (< ₹15,000 minimum)
    const result = await calculateCart([{ variant_id: 'var_01', quantity: 1 }], 'user_1', 'FLAT500', testDb);

    expect(result.coupon).toBeUndefined();
    expect(result.coupon_error).toContain('Minimum cart value');
    expect(result.total_discount_paise).toBe(0);
  });

  it('ignores expired offers', async () => {
    const testDb = createTestDb();

    // Expired offer
    await testDb.prepare(`
      INSERT INTO offers (
        id, name, code, type, value,
        starts_at, ends_at, is_active, stackable, priority
      ) VALUES (
        'ofr_expired', 'Expired Promo', 'EXPIRED20', 'percent', 20,
        '2020-01-01', '2021-01-01', 1, 1, 10
      )
    `).run();

    const result = await calculateCart([{ variant_id: 'var_01', quantity: 1 }], 'user_1', 'EXPIRED20', testDb);

    expect(result.coupon).toBeUndefined();
    expect(result.coupon_error).toContain('expired');
    expect(result.total_discount_paise).toBe(0);
  });

  it('rejects coupon when usage limit is exhausted', async () => {
    const testDb = createTestDb();

    // Usage limit = 10, already used 10 times
    await testDb.prepare(`
      INSERT INTO offers (
        id, name, code, type, value,
        starts_at, ends_at, is_active, usage_limit, used_count, priority
      ) VALUES (
        'ofr_exhausted', 'Soldout Promo', 'LIMIT10', 'percent', 20,
        '2020-01-01', '2099-01-01', 1, 10, 10, 10
      )
    `).run();

    const result = await calculateCart([{ variant_id: 'var_01', quantity: 1 }], 'user_1', 'LIMIT10', testDb);

    expect(result.coupon).toBeUndefined();
    expect(result.coupon_error).toContain('usage limit has been reached');
  });

  it('rejects coupon when per-user limit is already consumed', async () => {
    const testDb = createTestDb();

    // Per user limit = 1
    await testDb.prepare(`
      INSERT INTO offers (
        id, name, code, type, value,
        starts_at, ends_at, is_active, per_user_limit, priority
      ) VALUES (
        'ofr_peruser', 'Once Per User', 'ONCE10', 'percent', 10,
        '2020-01-01', '2099-01-01', 1, 1, 10
      )
    `).run();

    // Record 1 existing redemption for user_priya
    await testDb.prepare(`
      INSERT INTO offer_redemptions (id, offer_id, user_id, order_id)
      VALUES ('red_1', 'ofr_peruser', 'user_priya', 'ord_123')
    `).run();

    const result = await calculateCart([{ variant_id: 'var_01', quantity: 1 }], 'user_priya', 'ONCE10', testDb);

    expect(result.coupon).toBeUndefined();
    expect(result.coupon_error).toContain('maximum allowed number of times');
  });

  it('enforces non-stackable conflict (rejects coupon if non-stackable auto-offer applied)', async () => {
    const testDb = createTestDb();

    // Non-stackable automatic offer (code IS NULL, stackable = 0)
    await testDb.prepare(`
      INSERT INTO offers (
        id, name, code, type, value,
        starts_at, ends_at, is_active, stackable, priority
      ) VALUES (
        'ofr_auto_nostack', 'Auto Heritage 10%', NULL, 'percent', 10,
        '2020-01-01', '2099-01-01', 1, 0, 100
      )
    `).run();

    // Coupon code offer
    await testDb.prepare(`
      INSERT INTO offers (
        id, name, code, type, value,
        starts_at, ends_at, is_active, stackable, priority
      ) VALUES (
        'ofr_coupon', 'Extra 5% Coupon', 'EXTRA5', 'percent', 5,
        '2020-01-01', '2099-01-01', 1, 1, 10
      )
    `).run();

    const result = await calculateCart([{ variant_id: 'var_01', quantity: 1 }], 'user_1', 'EXTRA5', testDb);

    // Auto offer should be applied
    expect(result.applied_offers.some((o: any) => o.id === 'ofr_auto_nostack')).toBe(true);
    // Coupon should be rejected due to non-stackable conflict
    expect(result.coupon).toBeUndefined();
    expect(result.coupon_error).toContain('Cannot combine coupon');
  });

  it('applies free shipping offer and waives shipping fee', async () => {
    const testDb = createTestDb();

    // Small item ₹1,000 (standard shipping would be ₹150 because < ₹2,500)
    await testDb.prepare(`
      INSERT INTO products (id, category_id, name, mrp, discount_percent, sku, images, is_active)
      VALUES ('prd_small', 'cat_sarees', 'Dupatta', 100000, 0, 'SKU-SM', '[]', 1);
    `).run();

    await testDb.prepare(`
      INSERT INTO product_variants (id, product_id, size, color, stock, is_active)
      VALUES ('var_small', 'prd_small', 'FREE_SIZE', 'Gold', 10, 1);
    `).run();

    // Without coupon, shipping is ₹150 (15,000 paise)
    const baseResult = await calculateCart([{ variant_id: 'var_small', quantity: 1 }], 'user_1', undefined, testDb);
    expect(baseResult.shipping_paise).toBe(15000);

    // Free shipping coupon
    await testDb.prepare(`
      INSERT INTO offers (
        id, name, code, type, value,
        starts_at, ends_at, is_active, stackable, priority
      ) VALUES (
        'ofr_freeship', 'Complimentary Shipping', 'FREESHIP', 'free_shipping', 0,
        '2020-01-01', '2099-01-01', 1, 1, 10
      )
    `).run();

    const freeShipResult = await calculateCart([{ variant_id: 'var_small', quantity: 1 }], 'user_1', 'FREESHIP', testDb);
    expect(freeShipResult.shipping_paise).toBe(0);
    expect(freeShipResult.coupon).toBeDefined();
    expect(freeShipResult.coupon?.code).toBe('FREESHIP');
  });
});
