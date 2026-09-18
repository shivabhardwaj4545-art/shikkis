import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/index.ts';
import { verifyJWT } from '../middleware/auth.middleware.ts';
import { validate } from '../middleware/validate.ts';
import { createOrderSchema } from '../../shared/schemas/order.schema.ts';

const router = Router();

// POST /api/orders — Create new order with server-computed prices & idempotency
router.post('/', verifyJWT, validate(createOrderSchema), (req, res, next) => {
  try {
    const userId = req.user!.id;
    const { items, shippingAddress, idempotencyKey } = req.body;

    // Check Idempotency Key first
    const existingOrder = db.prepare('SELECT * FROM orders WHERE idempotency_key = ? AND user_id = ?').get(idempotencyKey, userId) as any;
    if (existingOrder) {
      const orderItems = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(existingOrder.id);
      return res.status(200).json({
        order: {
          ...existingOrder,
          shippingAddress: JSON.parse(existingOrder.shipping_address_json),
          items: orderItems,
        },
      });
    }

    // Compute prices server-side strictly from DB
    let subtotalPaise = 0;
    const resolvedItems: Array<{
      productId: string;
      variantId: string;
      title: string;
      size: string;
      color: string;
      pricePaise: number;
      quantity: number;
    }> = [];

    for (const item of items) {
      const product = db.prepare('SELECT id, title, price_paise, discount_price_paise, is_active FROM products WHERE id = ?').get(item.productId) as any;
      if (!product || !product.is_active) {
        return res.status(400).json({ error: `Product ${item.productId} is no longer available` });
      }

      const variant = db.prepare('SELECT id, size, color, stock_quantity FROM product_variants WHERE id = ? AND product_id = ?').get(item.variantId, item.productId) as any;
      if (!variant) {
        return res.status(400).json({ error: `Selected variant for product ${product.title} is invalid` });
      }

      if (variant.stock_quantity < item.quantity) {
        return res.status(400).json({ error: `Insufficient stock for ${product.title} (${variant.size})` });
      }

      const itemPricePaise = product.discount_price_paise || product.price_paise;
      subtotalPaise += itemPricePaise * item.quantity;

      resolvedItems.push({
        productId: product.id,
        variantId: variant.id,
        title: product.title,
        size: variant.size,
        color: variant.color,
        pricePaise: itemPricePaise,
        quantity: item.quantity,
      });
    }

    const taxPaise = Math.round(subtotalPaise * 0.05); // 5% GST on luxury wear
    const totalPaise = subtotalPaise + taxPaise;

    const orderId = uuidv4();
    const orderNumber = `SHK-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const createOrderTransaction = db.transaction(() => {
      db.prepare(`
        INSERT INTO orders (id, order_number, user_id, status, subtotal_paise, tax_paise, discount_paise, total_paise, shipping_address_json, idempotency_key, payment_status)
        VALUES (?, ?, ?, 'pending', ?, ?, 0, ?, ?, ?, 'pending')
      `).run(
        orderId,
        orderNumber,
        userId,
        subtotalPaise,
        taxPaise,
        totalPaise,
        JSON.stringify(shippingAddress),
        idempotencyKey
      );

      const insertOrderItem = db.prepare(`
        INSERT INTO order_items (id, order_id, product_id, variant_id, title, size, color, price_paise, quantity)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const rItem of resolvedItems) {
        insertOrderItem.run(
          uuidv4(),
          orderId,
          rItem.productId,
          rItem.variantId,
          rItem.title,
          rItem.size,
          rItem.color,
          rItem.pricePaise,
          rItem.quantity
        );

        // Deduct inventory stock
        db.prepare('UPDATE product_variants SET stock_quantity = stock_quantity - ? WHERE id = ?').run(rItem.quantity, rItem.variantId);
      }

      // Clear user cart
      const cart = db.prepare('SELECT id FROM carts WHERE user_id = ?').get(userId) as any;
      if (cart) {
        db.prepare('DELETE FROM cart_items WHERE cart_id = ?').run(cart.id);
      }
    });

    createOrderTransaction();

    const createdOrder = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId) as any;

    return res.status(201).json({
      order: {
        id: createdOrder.id,
        orderNumber: createdOrder.order_number,
        userId: createdOrder.user_id,
        status: createdOrder.status,
        subtotalPaise: createdOrder.subtotal_paise,
        taxPaise: createdOrder.tax_paise,
        discountPaise: createdOrder.discount_paise,
        totalPaise: createdOrder.total_paise,
        shippingAddress: JSON.parse(createdOrder.shipping_address_json),
        paymentStatus: createdOrder.payment_status,
        items: resolvedItems,
        createdAt: createdOrder.created_at,
      },
    });
  } catch (err) {
    return next(err);
  }
});

// GET /api/orders — List customer's own orders strictly
router.get('/', verifyJWT, (req, res, next) => {
  try {
    const userId = req.user!.id;
    const orders = db.prepare('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC').all(userId) as any[];

    const formattedOrders = orders.map((o) => {
      const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(o.id) as any[];
      return {
        id: o.id,
        orderNumber: o.order_number,
        userId: o.user_id,
        status: o.status,
        subtotalPaise: o.subtotal_paise,
        taxPaise: o.tax_paise,
        discountPaise: o.discount_paise,
        totalPaise: o.total_paise,
        shippingAddress: JSON.parse(o.shipping_address_json),
        paymentStatus: o.payment_status,
        razorpayOrderId: o.razorpay_order_id,
        items: items.map(i => ({
          id: i.id,
          productId: i.product_id,
          variantId: i.variant_id,
          title: i.title,
          size: i.size,
          color: i.color,
          pricePaise: i.price_paise,
          quantity: i.quantity,
        })),
        createdAt: o.created_at,
      };
    });

    return res.json({ orders: formattedOrders });
  } catch (err) {
    return next(err);
  }
});

// GET /api/orders/:id — Customer reads their own order
// STRICT RULE: If order does not belong to customer (or does not exist), return 404 (NOT 403)
router.get('/:id', verifyJWT, (req, res, next) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const order = db.prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?').get(id, userId) as any;

    if (!order) {
      // Must be 404 to avoid leaking existence of orders
      return res.status(404).json({ error: 'Order not found' });
    }

    const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id) as any[];

    return res.json({
      order: {
        id: order.id,
        orderNumber: order.order_number,
        userId: order.user_id,
        status: order.status,
        subtotalPaise: order.subtotal_paise,
        taxPaise: order.tax_paise,
        discountPaise: order.discount_paise,
        totalPaise: order.total_paise,
        shippingAddress: JSON.parse(order.shipping_address_json),
        paymentStatus: order.payment_status,
        razorpayOrderId: order.razorpay_order_id,
        items: items.map(i => ({
          id: i.id,
          productId: i.product_id,
          variantId: i.variant_id,
          title: i.title,
          size: i.size,
          color: i.color,
          pricePaise: i.price_paise,
          quantity: i.quantity,
        })),
        createdAt: order.created_at,
        updatedAt: order.updated_at,
      },
    });
  } catch (err) {
    return next(err);
  }
});

export default router;
