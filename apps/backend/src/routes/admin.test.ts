import request from 'supertest';
import { describe, expect, it } from 'vitest';

import app from '../index.js';
import { getDb } from '../db/client.js';
import { generateAccessToken } from '../middleware/auth.js';

describe('Admin Security & Management API (/api/admin/*)', () => {
  const customerToken = generateAccessToken({
    sub: 'usr_cust_01',
    email: 'priya@example.com',
    role: 'customer',
  });

  const ownerToken = generateAccessToken({
    sub: 'usr_owner_01',
    email: 'owner@shikkis.com',
    role: 'owner',
  });

  // ── 1. Security Enforcement ───────────────────────────────────────────────
  describe('Security Baseline: Unauthenticated & Customer Access', () => {
    it('returns 401 UNAUTHENTICATED when hitting /api/admin/products without token', async () => {
      const res = await request(app).get('/api/admin/products');
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHENTICATED');
    });

    it('returns 403 FORBIDDEN when customer tries to access /api/admin/products', async () => {
      const res = await request(app)
        .get('/api/admin/products')
        .set('Authorization', `Bearer ${customerToken}`);
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('returns 403 FORBIDDEN when customer tries to access /api/admin/inventory', async () => {
      const res = await request(app)
        .get('/api/admin/inventory')
        .set('Authorization', `Bearer ${customerToken}`);
      expect(res.status).toBe(403);
    });

    it('returns 403 FORBIDDEN when customer tries to access /api/admin/offers', async () => {
      const res = await request(app)
        .get('/api/admin/offers')
        .set('Authorization', `Bearer ${customerToken}`);
      expect(res.status).toBe(403);
    });

    it('returns 403 FORBIDDEN when customer tries to access /api/admin/banners', async () => {
      const res = await request(app)
        .get('/api/admin/banners')
        .set('Authorization', `Bearer ${customerToken}`);
      expect(res.status).toBe(403);
    });
  });

  // ── 2. Products Management (Owner) ────────────────────────────────────────
  describe('Owner Products Management', () => {
    it('allows owner to fetch products list with pagination and stock summaries', async () => {
      const res = await request(app)
        .get('/api/admin/products')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.pagination).toBeDefined();

      if (res.body.data.length > 0) {
        const prod = res.body.data[0];
        expect(prod).toHaveProperty('id');
        expect(prod).toHaveProperty('total_stock');
        expect(prod).toHaveProperty('is_active');
      }
    });

    it('allows owner to toggle product active status inline', async () => {
      // Fetch a product ID
      const listRes = await request(app)
        .get('/api/admin/products?limit=1')
        .set('Authorization', `Bearer ${ownerToken}`);
      const testProdId = listRes.body.data[0].id;

      const toggleRes = await request(app)
        .patch(`/api/admin/products/${testProdId}/status`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ is_active: false });

      expect(toggleRes.status).toBe(200);
      expect(toggleRes.body.is_active).toBe(false);

      // Restore active status
      await request(app)
        .patch(`/api/admin/products/${testProdId}/status`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ is_active: true });
    });

    it('exports products as CSV format', async () => {
      const res = await request(app)
        .get('/api/admin/products/export')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.header['content-type']).toContain('text/csv');
      expect(res.text).toContain('Product ID,Name,SKU');
    });
  });

  // ── 3. Inventory & Audit Logging ──────────────────────────────────────────
  describe('Owner Inventory Management & Audit Log', () => {
    it('fetches all variants sorted by stock ascending with low stock flags', async () => {
      const res = await request(app)
        .get('/api/admin/inventory')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      if (res.body.data.length > 0) {
        const item = res.body.data[0];
        expect(item).toHaveProperty('variant_id');
        expect(item).toHaveProperty('stock');
        expect(item).toHaveProperty('is_low_stock');
        expect(item).toHaveProperty('is_out_of_stock');
      }
    });

    it('performs batch stock update and writes to audit_log', async () => {
      const db = getDb();
      // Get 2 variant IDs
      const variants = db.prepare('SELECT id FROM product_variants LIMIT 2').all() as any[];
      const vIds = variants.map((v) => v.id);

      const batchRes = await request(app)
        .post('/api/admin/inventory/batch')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ variant_ids: vIds, stock: 42 });

      expect(batchRes.status).toBe(200);
      expect(batchRes.body.success).toBe(true);
      expect(batchRes.body.updated_count).toBe(2);

      // Verify audit_log entry was created
      const audit = db
        .prepare("SELECT * FROM audit_log WHERE action = 'BATCH_STOCK_UPDATE' ORDER BY created_at DESC LIMIT 1")
        .get() as any;
      expect(audit).toBeDefined();
      expect(audit.user_id).toBe('usr_owner_01');
      expect(audit.entity_type).toBe('product_variant');
    });
  });

  // ── 4. Offers Management & Validation ─────────────────────────────────────
  describe('Owner Offers Management & Validations', () => {
    it('rejects offer when end date is before or equal to start date', async () => {
      const res = await request(app)
        .post('/api/admin/offers')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          name: 'Invalid Date Offer',
          type: 'percent',
          value: 10,
          starts_at: '2026-10-10T10:00:00Z',
          ends_at: '2026-10-09T10:00:00Z',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_DATE_RANGE');
    });

    it('rejects offer with percentage greater than 100', async () => {
      const res = await request(app)
        .post('/api/admin/offers')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          name: 'Invalid Percent Offer',
          type: 'percent',
          value: 125,
          starts_at: '2026-10-01T10:00:00Z',
          ends_at: '2026-10-20T10:00:00Z',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_PERCENTAGE');
    });

    it('creates an active promotional offer and retrieves it with derived status', async () => {
      const code = `TEST${Date.now().toString().slice(-4)}`;
      const res = await request(app)
        .post('/api/admin/offers')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          name: 'Festive Test Discount',
          code,
          type: 'percent',
          value: 15,
          max_discount: 150000,
          min_cart_value: 200000,
          starts_at: new Date(Date.now() - 86400000).toISOString(),
          ends_at: new Date(Date.now() + 86400000 * 30).toISOString(),
          is_active: true,
          scope: 'all',
          scope_ids: [],
        });

      expect(res.status).toBe(201);
      expect(res.body.offer_id).toBeDefined();

      const listRes = await request(app)
        .get('/api/admin/offers')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(listRes.status).toBe(200);
      const created = listRes.body.data.find((o: any) => o.code === code);
      expect(created).toBeDefined();
      expect(created.derived_status).toBe('running');
    });
  });

  // ── 5. Banners Management ─────────────────────────────────────────────────
  describe('Owner Banners Management', () => {
    it('allows owner to list banners and reorder them', async () => {
      const listRes = await request(app)
        .get('/api/admin/banners')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(listRes.status).toBe(200);
      expect(Array.isArray(listRes.body.data)).toBe(true);

      if (listRes.body.data.length >= 2) {
        const b1 = listRes.body.data[0];
        const b2 = listRes.body.data[1];

        const reorderRes = await request(app)
          .put('/api/admin/banners/reorder')
          .set('Authorization', `Bearer ${ownerToken}`)
          .send({
            items: [
              { id: b1.id, display_order: 2 },
              { id: b2.id, display_order: 1 },
            ],
          });

        expect(reorderRes.status).toBe(200);
        expect(reorderRes.body.success).toBe(true);
      }
    });
    it('allows owner to create, update, and delete a banner', async () => {
      // Create banner
      const createRes = await request(app)
        .post('/api/admin/banners')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          title: 'Test Banner Title',
          subtitle: 'Test Banner Subtitle',
          image_url: 'https://example.com/banner.jpg',
          cta_text: 'Shop Now',
          cta_link: '/catalog',
        });

      expect(createRes.status).toBe(201);
      const bannerId = createRes.body.banner_id;
      expect(bannerId).toBeDefined();

      // Update banner (PATCH)
      const updateRes = await request(app)
        .patch(`/api/admin/banners/${bannerId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          title: 'Updated Banner Title',
          subtitle: 'Updated Subtitle',
          image_url: 'https://example.com/updated.jpg',
          cta_text: 'Explore New',
          cta_link: '/catalog?category=new',
          is_active: true,
        });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.success).toBe(true);

      // Verify updated values via GET
      const listRes = await request(app)
        .get('/api/admin/banners')
        .set('Authorization', `Bearer ${ownerToken}`);

      const updatedBanner = listRes.body.data.find((b: any) => b.id === bannerId);
      expect(updatedBanner).toBeDefined();
      expect(updatedBanner.title).toBe('Updated Banner Title');
      expect(updatedBanner.image_url).toBe('https://example.com/updated.jpg');

      // Cleanup
      await request(app)
        .delete(`/api/admin/banners/${bannerId}`)
        .set('Authorization', `Bearer ${ownerToken}`);
    });
  });
});
