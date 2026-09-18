import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../server/index.ts';
import db from '../server/db/index.ts';
import initSchema from '../server/db/schema.ts';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { generateAccessToken } from '../server/middleware/auth.middleware.ts';

describe('Security & Role Protection Tests', () => {
  let customerToken: string;
  let customer2Token: string;
  let ownerToken: string;
  let customer1Id: string;
  let customer2Id: string;
  let customer1OrderId: string;

  beforeAll(async () => {
    initSchema();

    customer1Id = uuidv4();
    customer2Id = uuidv4();
    const ownerId = uuidv4();

    const pwdHash = await bcrypt.hash('password123', 10);

    // Create test accounts
    db.prepare('INSERT OR REPLACE INTO users (id, email, password_hash, full_name, role) VALUES (?, ?, ?, ?, ?)').run(
      customer1Id,
      'testcustomer1@shikkis.in',
      pwdHash,
      'Customer One',
      'customer'
    );

    db.prepare('INSERT OR REPLACE INTO users (id, email, password_hash, full_name, role) VALUES (?, ?, ?, ?, ?)').run(
      customer2Id,
      'testcustomer2@shikkis.in',
      pwdHash,
      'Customer Two',
      'customer'
    );

    db.prepare('INSERT OR REPLACE INTO users (id, email, password_hash, full_name, role) VALUES (?, ?, ?, ?, ?)').run(
      ownerId,
      'testowner@shikkis.in',
      pwdHash,
      'Store Owner',
      'owner'
    );

    customerToken = generateAccessToken({ id: customer1Id, email: 'testcustomer1@shikkis.in', role: 'customer' });
    customer2Token = generateAccessToken({ id: customer2Id, email: 'testcustomer2@shikkis.in', role: 'customer' });
    ownerToken = generateAccessToken({ id: ownerId, email: 'testowner@shikkis.in', role: 'owner' });

    // Insert an order for Customer 1
    customer1OrderId = uuidv4();
    db.prepare(`
      INSERT OR REPLACE INTO orders (id, order_number, user_id, status, subtotal_paise, tax_paise, total_paise, shipping_address_json, idempotency_key)
      VALUES (?, ?, ?, 'pending', 100000, 5000, 105000, ?, ?)
    `).run(
      customer1OrderId,
      'SHK-TEST-001',
      customer1Id,
      JSON.stringify({ fullName: 'Customer One', addressLine1: '123 Silk St', city: 'Jaipur', state: 'Rajasthan', pincode: '302001', phone: '9876543210' }),
      uuidv4()
    );
  });

  it('Requirement Test 1: Customer hitting an admin route gets 403 Forbidden', async () => {
    const res = await request(app)
      .get('/api/admin/stats')
      .set('Authorization', `Bearer ${customerToken}`);

    expect(res.status).toBe(403);
    expect(res.body.error).toContain('Access denied');
  });

  it('Owner hitting an admin route succeeds with 200 OK', async () => {
    const res = await request(app)
      .get('/api/admin/stats')
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.stats).toBeDefined();
  });

  it('Requirement Test 2: Customer requesting another customer\'s order gets 404 (NOT 403)', async () => {
    // Customer 2 attempts to fetch Customer 1's order
    const res = await request(app)
      .get(`/api/orders/${customer1OrderId}`)
      .set('Authorization', `Bearer ${customer2Token}`);

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Order not found');
  });

  it('Customer requesting their own order gets 200 OK', async () => {
    const res = await request(app)
      .get(`/api/orders/${customer1OrderId}`)
      .set('Authorization', `Bearer ${customerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.order.id).toBe(customer1OrderId);
  });
});
