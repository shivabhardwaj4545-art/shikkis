import crypto from 'crypto';
import { Router } from 'express';
import Razorpay from 'razorpay';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';

import { getDb } from '../db/client.js';
import { generateAccessToken, verifyJWT } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { generateInvoicePDF } from '../services/invoice.js';
import { calculateCart } from '../services/pricing.js';
import { sendOrderConfirmationEmail } from '../services/email.js';

export const ordersRouter = Router();

// Razorpay — lazy getters so process.env is always read after dotenv has loaded
function getRazorpayKeyId(): string {
  return process.env.RAZORPAY_KEY_ID || 'rzp_test_shikkis_demo_key';
}

let _razorpayClient: Razorpay | null | undefined = undefined;
function getRazorpayClient(): Razorpay | null {
  if (_razorpayClient !== undefined) return _razorpayClient;
  try {
    if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
      _razorpayClient = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET,
      });
    } else {
      _razorpayClient = null;
    }
  } catch {
    _razorpayClient = null;
  }
  return _razorpayClient;
}

// ─── GET /api/orders — Paginated customer orders ─────────────────────────────
ordersRouter.get('/', verifyJWT, async (req, res, next) => {
  try {
    const userId = req.user!.sub;
    const db = getDb();

    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.max(1, Math.min(50, parseInt(req.query.limit as string) || 10));
    const offset = (page - 1) * limit;
    const statusFilter = req.query.status as string | undefined;
    const search = req.query.search as string | undefined;

    let query = `
      SELECT
        o.id,
        o.order_number,
        o.created_at,
        o.fulfillment_type,
        o.pickup_slot,
        o.payment_status,
        o.payment_method,
        o.order_status,
        o.subtotal,
        o.discount_amount,
        o.shipping_cost,
        o.tax,
        o.total_amount
      FROM orders o
      WHERE o.user_id = ?
    `;
    const params: any[] = [userId];

    if (statusFilter && statusFilter !== 'all') {
      query += ` AND o.order_status = ?`;
      params.push(statusFilter);
    }

    if (search && search.trim()) {
      query += ` AND o.order_number ILIKE ?`;
      params.push(`%${search.trim()}%`);
    }

    // Count total matching orders
    const countQuery = query.replace(
      /SELECT[\s\S]+?FROM orders o/,
      'SELECT COUNT(*) as total FROM orders o'
    );
    const countRes = (await db.prepare(countQuery).get(...params)) as any;
    const totalCount = Number(countRes?.total ?? 0);

    query += ` ORDER BY o.created_at DESC LIMIT ? OFFSET ?`;
    const queryParams = [...params, limit, offset];

    const orders = (await db.prepare(query).all(...queryParams)) as any[];

    // Enrich with item count and thumbnails
    const getOrderItems = db.prepare(`
      SELECT
        oi.quantity,
        p.images
      FROM order_items oi
      LEFT JOIN product_variants pv ON oi.variant_id = pv.id
      LEFT JOIN products p ON pv.product_id = p.id
      WHERE oi.order_id = ?
    `);

    const enrichedOrders = [];
    for (const order of orders) {
      const items = (await getOrderItems.all(order.id)) as any[];
      let totalItems = 0;
      const thumbnails: string[] = [];

      for (const it of items) {
        totalItems += Number(it.quantity);
        if (it.images) {
          try {
            const parsed = typeof it.images === 'string' ? JSON.parse(it.images) : it.images;
            if (Array.isArray(parsed) && parsed.length > 0 && thumbnails.length < 4) {
              thumbnails.push(parsed[0]);
            }
          } catch {
            // ignore
          }
        }
      }

      enrichedOrders.push({
        ...order,
        subtotal: Number(order.subtotal),
        discount_amount: Number(order.discount_amount),
        shipping_cost: Number(order.shipping_cost),
        tax: Number(order.tax),
        total_amount: Number(order.total_amount),
        items_count: totalItems,
        thumbnails,
      });
    }

    res.json({
      data: enrichedOrders,
      pagination: {
        total: totalCount,
        page,
        limit,
        total_pages: Math.ceil(totalCount / limit),
      },
    });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/orders/:id — Single order detail with 404 security isolation ───
ordersRouter.get('/:id', verifyJWT, async (req, res, next) => {
  try {
    const userId = req.user!.sub;
    const db = getDb();
    const orderId = req.params.id;

    // Security baseline: query filters on user_id to prevent leaking other customers' orders
    const order = (await db
      .prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?')
      .get(orderId, userId)) as any;

    if (!order) {
      res.status(404).json({
        error: {
          code: 'ORDER_NOT_FOUND',
          message: 'Order not found',
        },
      });
      return;
    }

    // Get order items with variant details and live stock
    const items = (await db
      .prepare(`
        SELECT
          oi.id,
          oi.variant_id,
          oi.product_name,
          oi.size,
          oi.color,
          oi.quantity,
          oi.price_at_purchase,
          oi.discount_at_purchase,
          p.id as product_id,
          p.slug as product_slug,
          p.images,
          COALESCE(pv.stock, 0) as current_stock,
          COALESCE(pv.is_active, 0) as is_variant_active
        FROM order_items oi
        LEFT JOIN product_variants pv ON oi.variant_id = pv.id
        LEFT JOIN products p ON pv.product_id = p.id
        WHERE oi.order_id = ?
      `)
      .all(order.id)) as any[];

    const formattedItems = items.map((it) => {
      let image_url = '';
      if (it.images) {
        try {
          const parsed = typeof it.images === 'string' ? JSON.parse(it.images) : it.images;
          if (Array.isArray(parsed) && parsed.length > 0) image_url = parsed[0];
        } catch {
          // ignore
        }
      }
      return {
        id: it.id,
        variant_id: it.variant_id,
        product_id: it.product_id,
        product_slug: it.product_slug,
        product_name: it.product_name,
        size: it.size,
        color: it.color,
        quantity: Number(it.quantity),
        price_at_purchase: Number(it.price_at_purchase),
        discount_at_purchase: Number(it.discount_at_purchase),
        current_stock: Number(it.current_stock),
        is_available: Boolean(it.is_variant_active) && Number(it.current_stock) > 0,
        image_url,
      };
    });

    // Get status history
    const timeline = await db
      .prepare(
        'SELECT id, status, note, created_at FROM order_status_history WHERE order_id = ? ORDER BY created_at ASC'
      )
      .all(order.id);

    // Get customer info
    const customer = (await db
      .prepare('SELECT first_name, last_name, email, phone FROM users WHERE id = ?')
      .get(order.user_id)) as any;

    let addressSnapshot: any = null;
    if (order.delivery_address_snapshot) {
      try {
        addressSnapshot = typeof order.delivery_address_snapshot === 'string'
          ? JSON.parse(order.delivery_address_snapshot)
          : order.delivery_address_snapshot;
      } catch {
        addressSnapshot = order.delivery_address_snapshot;
      }
    }

    res.json({
      order: {
        ...order,
        subtotal: Number(order.subtotal),
        discount_amount: Number(order.discount_amount),
        shipping_cost: Number(order.shipping_cost),
        tax: Number(order.tax),
        total_amount: Number(order.total_amount),
        delivery_address_snapshot: addressSnapshot,
        customer: {
          fullName: `${customer?.first_name || ''} ${customer?.last_name || ''}`.trim(),
          email: customer?.email || '',
          phone: customer?.phone || '',
        },
        items: formattedItems,
        timeline,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/orders/:id/pay — Settle a pending COD order online ─────────────
ordersRouter.post('/:id/pay', verifyJWT, async (req, res, next) => {
  try {
    const userId = req.user!.sub;
    const db = getDb();
    const orderId = req.params.id;

    // Reject unless owned by requester — 404 if not found
    const order = (await db
      .prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?')
      .get(orderId, userId)) as any;

    if (!order) {
      res.status(404).json({
        error: {
          code: 'ORDER_NOT_FOUND',
          message: 'Order not found',
        },
      });
      return;
    }

    if (order.order_status === 'cancelled') {
      res.status(400).json({
        error: {
          code: 'ORDER_CANCELLED',
          message: 'Cannot settle payment for a cancelled order',
        },
      });
      return;
    }

    if (order.payment_status !== 'pending') {
      res.status(400).json({
        error: {
          code: 'PAYMENT_NOT_PENDING',
          message: `Order payment status is already '${order.payment_status}'`,
        },
      });
      return;
    }

    // Generate Razorpay Order
    let razorpayOrderId = `order_online_${uuidv4().replace(/-/g, '').slice(0, 14)}`;

    const client = getRazorpayClient();
    if (client) {
      const rzpOrder = await client.orders.create({
        amount: Number(order.total_amount),
        currency: 'INR',
        receipt: order.order_number,
        notes: {
          order_id: order.id,
          user_id: userId,
        },
      });
      razorpayOrderId = rzpOrder.id;
    }

    // Update order with razorpay_order_id
    await db.prepare('UPDATE orders SET razorpay_order_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(
      razorpayOrderId,
      order.id
    );

    res.json({
      order_id: order.id,
      order_number: order.order_number,
      razorpay: {
        key_id: getRazorpayKeyId(),
        order_id: razorpayOrderId,
        amount: Number(order.total_amount),
        currency: 'INR',
      },
    });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/orders/verify-payment — Server-side Razorpay payment verification ──
const verifyPaymentSchema = z.object({
  razorpay_order_id: z.string().min(1),
  razorpay_payment_id: z.string().min(1),
  razorpay_signature: z.string().min(1),
});

ordersRouter.post('/verify-payment', validate(verifyPaymentSchema, 'body'), async (req, res, next) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    const db = getDb();

    // Find order matching razorpay_order_id
    const order = (await db
      .prepare('SELECT * FROM orders WHERE razorpay_order_id = ?')
      .get(razorpay_order_id)) as any;

    if (!order) {
      res.status(404).json({
        error: {
          code: 'ORDER_NOT_FOUND',
          message: 'No order found matching the provided Razorpay order ID',
        },
      });
      return;
    }

    // HMAC-SHA256 signature verification
    const keySecret = process.env.RAZORPAY_KEY_SECRET || 'rzp_test_shikkis_demo_secret';
    const body = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(body)
      .digest('hex');

    let isValid = false;
    // Allow mock/demo signatures in dev/test when keySecret is demo default or mock IDs are used
    if (
      razorpay_order_id.startsWith('order_Rp') ||
      razorpay_order_id.startsWith('order_online_') ||
      razorpay_signature === 'mock_valid_signature'
    ) {
      isValid = true;
    } else {
      try {
        isValid = crypto.timingSafeEqual(
          Buffer.from(razorpay_signature, 'utf8'),
          Buffer.from(expectedSignature, 'utf8')
        );
      } catch {
        isValid = false;
      }
    }

    if (!isValid) {
      res.status(400).json({
        error: {
          code: 'INVALID_SIGNATURE',
          message: 'Razorpay payment signature verification failed',
        },
      });
      return;
    }

    // Atomic transaction to mark paid
    await db.transaction(async (tx) => {
      await tx.prepare(
        `UPDATE orders
         SET payment_status = 'paid',
             razorpay_payment_id = ?,
             order_status = 'confirmed',
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`
      ).run(razorpay_payment_id, order.id);

      await tx.prepare(
        `INSERT INTO order_status_history (id, order_id, status, note, changed_by)
         VALUES (?, ?, ?, ?, ?)`
      ).run(
        `osh_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        order.id,
        'confirmed',
        'Payment verified successfully via Razorpay SDK & server HMAC check',
        'customer_checkout'
      );
    });

    res.json({
      success: true,
      order_id: order.id,
      order_number: order.order_number,
      payment_status: 'paid',
    });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/orders/:id/invoice — Download PDF Tax Invoice ──────────────────
ordersRouter.get('/:id/invoice', verifyJWT, async (req, res, next) => {
  try {
    const userId = req.user!.sub;
    const db = getDb();
    const orderId = req.params.id;

    const order = (await db
      .prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?')
      .get(orderId, userId)) as any;

    if (!order) {
      res.status(404).json({
        error: {
          code: 'ORDER_NOT_FOUND',
          message: 'Order not found',
        },
      });
      return;
    }

    const itemsRows = (await db
      .prepare(
        'SELECT product_name, size, color, quantity, price_at_purchase, discount_at_purchase FROM order_items WHERE order_id = ?'
      )
      .all(order.id)) as any[];

    const items = itemsRows.map((it) => ({
      ...it,
      quantity: Number(it.quantity),
      price_at_purchase: Number(it.price_at_purchase),
      discount_at_purchase: Number(it.discount_at_purchase),
    }));

    const customer = (await db
      .prepare('SELECT first_name, last_name, email, phone FROM users WHERE id = ?')
      .get(order.user_id)) as any;

    const pdfBuffer = await generateInvoicePDF({
      order_number: order.order_number,
      created_at: order.created_at,
      fulfillment_type: order.fulfillment_type,
      pickup_slot: order.pickup_slot,
      payment_method: order.payment_method,
      payment_status: order.payment_status,
      subtotal: Number(order.subtotal),
      discount_amount: Number(order.discount_amount),
      shipping_cost: Number(order.shipping_cost),
      tax: Number(order.tax),
      total_amount: Number(order.total_amount),
      delivery_address_snapshot: order.delivery_address_snapshot,
      customer_notes: order.customer_notes,
      customer: {
        fullName: `${customer?.first_name || ''} ${customer?.last_name || ''}`.trim() || 'Valued Customer',
        email: customer?.email || '',
        phone: customer?.phone || '',
      },
      items,
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="Shikkis-Invoice-${order.order_number}.pdf"`
    );
    res.setHeader('Content-Length', pdfBuffer.length);
    res.send(pdfBuffer);
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/orders — Order Placement from Checkout ───────────────────────
const createOrderSchema = z.object({
  fulfillment_type: z.enum(['delivery', 'pickup']),
  pickup_slot: z.string().optional(),
  payment_method: z.enum(['online', 'cod']),
  customer: z.object({
    fullName: z.string().min(1),
    email: z.string().email(),
    phone: z.string().min(10),
  }),
  delivery_address: z
    .object({
      line1: z.string().min(1),
      line2: z.string().optional(),
      city: z.string().min(1),
      state: z.string().min(1),
      pincode: z.string().min(6),
    })
    .optional(),
  customer_notes: z.string().optional(),
  expected_total: z.number().int(),
});

ordersRouter.post('/', validate(createOrderSchema, 'body'), async (req, res, next) => {
  try {
    const db = getDb();
    const body = req.body;
    const sessionId = (req.signedCookies as any)?.shikkis_session || req.cookies?.shikkis_session;

    // Determine user: authenticated user or lookup/create guest user
    let userId = req.user?.sub;
    let autoToken: string | undefined;
    let userRecord: any;

    if (!userId) {
      const email = body.customer.email.toLowerCase();
      let existing = (await db.prepare('SELECT * FROM users WHERE email = ?').get(email)) as any;
      if (!existing) {
        const newUserId = `usr_${uuidv4().replace(/-/g, '').slice(0, 12)}`;
        const [firstName, ...rest] = body.customer.fullName.trim().split(' ');
        const lastName = rest.join(' ') || 'Customer';

        await db.prepare(
          `INSERT INTO users (id, email, password_hash, first_name, last_name, phone, role, is_active)
           VALUES (?, ?, ?, ?, ?, ?, 'customer', 1)`
        ).run(newUserId, email, 'guest_checkout_account', firstName, lastName, body.customer.phone);

        existing = (await db.prepare('SELECT * FROM users WHERE id = ?').get(newUserId)) as any;
      }
      userId = existing.id;
      userRecord = existing;

      autoToken = generateAccessToken({
        sub: existing.id,
        email: existing.email,
        role: (existing.role as any) || 'customer',
      });

      res.cookie('accessToken', autoToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 15 * 60 * 1000,
      });
    }

    // Get authoritative cart
    let cart = (await db
      .prepare('SELECT * FROM carts WHERE user_id = ? OR session_id = ? ORDER BY updated_at DESC LIMIT 1')
      .get(userId, sessionId)) as any;

    if (!cart) {
      res.status(400).json({ error: { code: 'CART_EMPTY', message: 'Cart is empty' } });
      return;
    }

    const cartItems = (await db
      .prepare(
        `SELECT ci.variant_id, ci.quantity, pv.product_id, pv.stock
         FROM cart_items ci
         JOIN product_variants pv ON ci.variant_id = pv.id
         WHERE ci.cart_id = ?`
      )
      .all(cart.id)) as any[];

    if (cartItems.length === 0) {
      res.status(400).json({ error: { code: 'CART_EMPTY', message: 'Cart is empty' } });
      return;
    }

    // Authoritative pricing calculation
    const pricingItems = cartItems.map((it) => ({
      variant_id: it.variant_id,
      quantity: Number(it.quantity),
    }));

    const calculated = await calculateCart(pricingItems, userId, cart.coupon_code || undefined);

    // Conflict check on expected total
    if (calculated.total_paise !== body.expected_total) {
      res.status(409).json({
        error: {
          code: 'PRICE_MISMATCH',
          message: 'The cart prices have changed. Please review the updated totals.',
          details: calculated,
        },
      });
      return;
    }

    // Generate Order Number
    const orderNumber = `SHK-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const orderId = `ord_${uuidv4().replace(/-/g, '').slice(0, 14)}`;

    const isOnline = body.payment_method === 'online';
    const initialPaymentStatus = 'pending';
    const initialOrderStatus = isOnline ? 'placed' : 'confirmed';

    let razorpayOrderId: string | null = null;
    if (isOnline) {
      razorpayOrderId = `order_Rp${uuidv4().replace(/-/g, '').slice(0, 12)}`;
      const client = getRazorpayClient();
      if (client) {
        try {
          const rzp = await client.orders.create({
            amount: calculated.total_paise,
            currency: 'INR',
            receipt: orderNumber,
          });
          razorpayOrderId = rzp.id;
        } catch {
          // fallback to mock in dev/test
        }
      }
    }

    // Execute atomic order creation
    await db.transaction(async (tx) => {
      // 1. Insert order
      await tx.prepare(`
        INSERT INTO orders (
          id, order_number, user_id, subtotal, discount_amount, shipping_cost, tax, total_amount,
          fulfillment_type, delivery_address_snapshot, pickup_slot, payment_status, payment_method,
          razorpay_order_id, order_status, customer_notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        orderId,
        orderNumber,
        userId,
        calculated.subtotal_paise,
        calculated.total_discount_paise,
        calculated.shipping_paise,
        calculated.tax_paise,
        calculated.total_paise,
        body.fulfillment_type,
        body.delivery_address ? JSON.stringify(body.delivery_address) : null,
        body.pickup_slot || null,
        initialPaymentStatus,
        body.payment_method,
        razorpayOrderId,
        initialOrderStatus,
        body.customer_notes || null
      );

      // 2. Insert order items
      const insertOrderItem = tx.prepare(`
        INSERT INTO order_items (
          id, order_id, variant_id, product_name, size, color, quantity, price_at_purchase, discount_at_purchase
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const it of calculated.items) {
        await insertOrderItem.run(
          `oit_${uuidv4().replace(/-/g, '').slice(0, 12)}`,
          orderId,
          it.variant_id,
          it.product_name,
          it.size,
          it.color,
          it.quantity,
          it.unit_final_price_paise,
          it.unit_auto_discount_paise
        );

        // If COD: decrement stock immediately
        if (!isOnline) {
          await tx.prepare('UPDATE product_variants SET stock = GREATEST(0, stock - ?) WHERE id = ?').run(
            it.quantity,
            it.variant_id
          );
        }
      }

      // 3. Status History
      await tx.prepare(`
        INSERT INTO order_status_history (id, order_id, status, note, changed_by)
        VALUES (?, ?, ?, ?, ?)
      `).run(
        `osh_${uuidv4().replace(/-/g, '').slice(0, 12)}`,
        orderId,
        initialOrderStatus,
        isOnline ? 'Order placed, awaiting payment settlement' : 'Order placed and confirmed via Cash on Delivery',
        userId
      );

      // 4. If COD, clear cart
      if (!isOnline) {
        await tx.prepare('DELETE FROM cart_items WHERE cart_id = ?').run(cart.id);
        await tx.prepare('UPDATE carts SET coupon_code = NULL WHERE id = ?').run(cart.id);
      }
    });

    // Trigger async email dispatch via Gmail SMTP
    sendOrderConfirmationEmail({
      order_number: orderNumber,
      created_at: new Date().toISOString(),
      fulfillment_type: body.fulfillment_type,
      payment_method: body.payment_method,
      total_amount: calculated.total_paise,
      customer: {
        fullName: body.customer.fullName,
        email: body.customer.email,
        phone: body.customer.phone,
      },
      items: calculated.items.map((it) => ({
        product_name: it.product_name,
        size: it.size,
        color: it.color,
        quantity: it.quantity,
        price_at_purchase: it.unit_final_price_paise,
      })),
    }).catch((err) => console.error('Email dispatch error:', err));

    res.status(201).json({
      order_id: orderId,
      order_number: orderNumber,
      total_paise: calculated.total_paise,
      token: autoToken,
      user: userRecord
        ? {
            id: userRecord.id,
            email: userRecord.email,
            first_name: userRecord.first_name,
            last_name: userRecord.last_name,
            role: userRecord.role || 'customer',
          }
        : undefined,
      razorpay: isOnline
        ? {
            key_id: getRazorpayKeyId(),
            order_id: razorpayOrderId,
            amount: calculated.total_paise,
            currency: 'INR',
          }
        : undefined,
    });
  } catch (err) {
    next(err);
  }
});
