import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';

import { getDb } from '../db/client.js';
import app from '../index.js';
import { generateAccessToken } from '../middleware/auth.js';

describe('Admin Orders, CRM & Reports API Tests', () => {
  beforeEach(async () => {
    const db = getDb();
    await db.prepare("UPDATE orders SET order_status = 'placed', payment_status = 'paid' WHERE id = 'ord_006'").run();
    await db.prepare("UPDATE orders SET order_status = 'delivered', payment_status = 'paid' WHERE id = 'ord_001'").run();
  });


  const ownerToken = generateAccessToken({
    sub: 'usr_owner_01',
    email: 'owner@shikkis.com',
    role: 'owner',
  });

  const customerToken = generateAccessToken({
    sub: 'usr_cust_01',
    email: 'priya@example.com',
    role: 'customer',
  });

  // ── Part 1: Order Management ───────────────────────────────────────────────
  describe('Admin Order Management', () => {
    it('returns 403 when customer attempts to list admin orders', async () => {
      const res = await request(app)
        .get('/api/admin/orders')
        .set('Authorization', `Bearer ${customerToken}`);
      expect(res.status).toBe(403);
    });

    it('allows owner to list orders with filters', async () => {
      const res = await request(app)
        .get('/api/admin/orders?fulfillment_type=delivery')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.pagination).toBeDefined();
    });

    it('fetches full order detail with items, timeline, and allowed transitions', async () => {
      const res = await request(app)
        .get('/api/admin/orders/ord_006')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.order).toBeDefined();
      expect(res.body.order.id).toBe('ord_006');
      expect(res.body.order.order_status).toBe('placed');
      expect(res.body.order.fulfillment_type).toBe('delivery');
      expect(res.body.order.allowed_next_statuses).toEqual(['confirmed', 'cancelled']);
    });

    it('rejects invalid status transition from placed to delivered with 400', async () => {
      const res = await request(app)
        .patch('/api/admin/orders/ord_006/status')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ status: 'delivered' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_TRANSITION');
    });

    it('rejects cross-fulfillment status transition (pickup status on delivery order)', async () => {
      const res = await request(app)
        .patch('/api/admin/orders/ord_006/status')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ status: 'ready_for_pickup' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_TRANSITION');
    });

    it('allows valid status transition and writes order_status_history & audit_log', async () => {
      const res = await request(app)
        .patch('/api/admin/orders/ord_006/status')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ status: 'confirmed', note: 'Order confirmed by boutique manager' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.new_status).toBe('confirmed');

      // Verify order detail returns the updated status and status history
      const orderDetailRes = await request(app)
        .get('/api/admin/orders/ord_006')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(orderDetailRes.status).toBe(200);
      expect(orderDetailRes.body.order.order_status).toBe('confirmed');
      const historyItem = orderDetailRes.body.order.history.find((h: any) => h.status === 'confirmed');
      expect(historyItem).toBeDefined();
      expect(historyItem.note).toContain('Order confirmed by boutique manager');
    });

    it('allows updating internal notes', async () => {
      const res = await request(app)
        .patch('/api/admin/orders/ord_006/notes')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ internal_notes: 'Priority festive packaging requested.' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('rejects refund on unpaid/cancelled orders with 400', async () => {
      const res = await request(app)
        .post('/api/admin/orders/ord_007/refund')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ reason: 'Customer requested refund' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_REFUND_STATE');
    });

    it('processes refund on paid order and marks payment_status refunded', async () => {
      const res = await request(app)
        .post('/api/admin/orders/ord_001/refund')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ reason: 'Returned item quality approved' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify order payment_status updated
      const orderRes = await request(app)
        .get('/api/admin/orders/ord_001')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(orderRes.status).toBe(200);
      expect(orderRes.body.order.payment_status).toBe('refunded');
    });

    it('returns structured packing slip data', async () => {
      const res = await request(app)
        .get('/api/admin/orders/ord_002/packing-slip')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.order_number).toBe('SHK-2026-0002');
      expect(res.body.items).toBeDefined();
      expect(res.body.customer).toBeDefined();
    });
  });

  // ── Part 2: Customers CRM ──────────────────────────────────────────────────
  describe('Admin Customers CRM', () => {
    it('lists customers with spend and order metrics', async () => {
      const res = await request(app)
        .get('/api/admin/customers')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.data[0].lifetime_spend).toBeDefined();
    });

    it('exports customers directory as CSV', async () => {
      const res = await request(app)
        .get('/api/admin/customers/export')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/csv');
      expect(res.text).toContain('Customer ID,Name,Email');
    });

    it('fetches read-only customer detail with analytics and order history', async () => {
      const res = await request(app)
        .get('/api/admin/customers/usr_cust_01')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.customer.email).toBe('priya@example.com');
      expect(res.body.analytics.total_orders).toBeGreaterThan(0);
      expect(res.body.orders.length).toBeGreaterThan(0);
    });
  });

  // ── Part 3: Reports & Analytics (Pure SQL) ──────────────────────────────────
  describe('Admin Reports & Analytics', () => {
    it('computes KPI metrics directly in SQL', async () => {
      const res = await request(app)
        .get('/api/admin/reports/kpis?period=all')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.total_revenue).toBeGreaterThan(0);
      expect(res.body.total_orders).toBeGreaterThan(0);
      expect(res.body.aov).toBeGreaterThan(0);
    });

    it('computes 7-day continuous revenue trend in SQL', async () => {
      const res = await request(app)
        .get('/api/admin/reports/revenue-trend')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.trend).toBeDefined();
      expect(res.body.trend.length).toBe(7);
      expect(res.body.trend[0].date).toBeDefined();
    });

    it('returns top products by units and revenue', async () => {
      const res = await request(app)
        .get('/api/admin/reports/top-products?period=all')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.top_by_units).toBeDefined();
      expect(res.body.top_by_revenue).toBeDefined();
    });

    it('returns category performance breakdown', async () => {
      const res = await request(app)
        .get('/api/admin/reports/category-performance?period=all')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.categories).toBeDefined();
    });

    it('returns paginated sold items log and exports CSV', async () => {
      const res = await request(app)
        .get('/api/admin/reports/sold-items?period=all')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();

      const exportRes = await request(app)
        .get('/api/admin/reports/sold-items/export?period=all')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(exportRes.status).toBe(200);
      expect(exportRes.headers['content-type']).toContain('text/csv');
      expect(exportRes.text).toContain('Order Number,Date,Customer');
    });
  });
});
