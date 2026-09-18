import request from 'supertest';
import { describe, expect, it } from 'vitest';

import app from '../index.js';
import { generateAccessToken } from '../middleware/auth.js';

describe('Orders API & Security Verification', () => {
  // Generate JWT access tokens for Customer A (usr_cust_01) and Customer B (usr_cust_02)
  const tokenCustomerA = generateAccessToken({
    sub: 'usr_cust_01',
    email: 'priya@example.com',
    role: 'customer',
  });

  const tokenCustomerB = generateAccessToken({
    sub: 'usr_cust_02',
    email: 'rohan@example.com',
    role: 'customer',
  });

  // ord_001 belongs to usr_cust_01 (Priya Sharma)
  // ord_002 belongs to usr_cust_02 (Rohan Mehra)

  describe('GET /api/orders', () => {
    it('returns 401 Unauthenticated without token', async () => {
      const res = await request(app).get('/api/orders');
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHENTICATED');
    });

    it('returns only orders belonging to the authenticated customer', async () => {
      const resA = await request(app)
        .get('/api/orders')
        .set('Authorization', `Bearer ${tokenCustomerA}`);

      expect(resA.status).toBe(200);
      expect(resA.body.data).toBeDefined();
      expect(Array.isArray(resA.body.data)).toBe(true);

      // Verify all returned orders belong to Customer A
      for (const ord of resA.body.data) {
        expect(ord.order_number).toBeDefined();
        expect(ord.total_amount).toBeGreaterThan(0);
      }
    });

    it('filters orders by status correctly', async () => {
      const res = await request(app)
        .get('/api/orders?status=delivered')
        .set('Authorization', `Bearer ${tokenCustomerA}`);

      expect(res.status).toBe(200);
      for (const ord of res.body.data) {
        expect(ord.order_status).toBe('delivered');
      }
    });
  });

  describe('GET /api/orders/:id — Ownership & 404 Isolation', () => {
    it('allows Customer A to load their own order (ord_001)', async () => {
      const res = await request(app)
        .get('/api/orders/ord_001')
        .set('Authorization', `Bearer ${tokenCustomerA}`);

      expect(res.status).toBe(200);
      expect(res.body.order).toBeDefined();
      expect(res.body.order.id).toBe('ord_001');
      expect(res.body.order.items.length).toBeGreaterThan(0);
    });

    it('returns 404 (NOT 403) when Customer A tries to access Customer B order (ord_002)', async () => {
      // Security test mandated by AGENTS.md: do not leak existence of other customers' orders!
      const res = await request(app)
        .get('/api/orders/ord_002')
        .set('Authorization', `Bearer ${tokenCustomerA}`);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('ORDER_NOT_FOUND');
    });

    it('returns 404 when Customer B tries to access Customer A order (ord_001)', async () => {
      const res = await request(app)
        .get('/api/orders/ord_001')
        .set('Authorization', `Bearer ${tokenCustomerB}`);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('ORDER_NOT_FOUND');
    });

    it('returns 404 for non-existent order ID', async () => {
      const res = await request(app)
        .get('/api/orders/ord_non_existent_999')
        .set('Authorization', `Bearer ${tokenCustomerA}`);

      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/orders/:id/pay — Settle Pending Online Payment', () => {
    it('returns 404 if customer tries to pay another customer order', async () => {
      const res = await request(app)
        .post('/api/orders/ord_002/pay')
        .set('Authorization', `Bearer ${tokenCustomerA}`);

      expect(res.status).toBe(404);
    });

    it('returns 400 if order is already paid', async () => {
      // ord_001 is already paid
      const res = await request(app)
        .post('/api/orders/ord_001/pay')
        .set('Authorization', `Bearer ${tokenCustomerA}`);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('PAYMENT_NOT_PENDING');
    });
  });

  describe('GET /api/orders/:id/invoice — PDF Invoice Generation', () => {
    it('returns 404 when unauthorized customer requests invoice', async () => {
      const res = await request(app)
        .get('/api/orders/ord_002/invoice')
        .set('Authorization', `Bearer ${tokenCustomerA}`);

      expect(res.status).toBe(404);
    });

    it('generates and streams valid PDF invoice for customer own order', async () => {
      const res = await request(app)
        .get('/api/orders/ord_001/invoice')
        .set('Authorization', `Bearer ${tokenCustomerA}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toBe('application/pdf');
      expect(res.headers['content-disposition']).toContain('SHK-2026-0001');
      expect(res.body).toBeInstanceOf(Buffer);
      // Valid PDF starts with "%PDF-"
      const header = res.body.subarray(0, 5).toString();
      expect(header).toBe('%PDF-');
    });
  });
});
