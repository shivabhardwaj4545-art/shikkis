import crypto from 'crypto';
import { Router } from 'express';
import { getDb } from '../db/client.js';

export const webhooksRouter = Router();

const WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || 'rzp_test_webhook_secret_2026';

/**
 * POST /api/webhooks/razorpay
 * Server-to-server webhook endpoint for Razorpay payment lifecycle events.
 * Strictly verifies the HMAC-SHA256 signature in `x-razorpay-signature`.
 * Orders are marked 'paid' ONLY from this verified webhook per AGENTS.md.
 */
webhooksRouter.post('/razorpay', (req, res) => {
  const signature = req.headers['x-razorpay-signature'] as string | undefined;

  if (!signature) {
    res.status(400).json({
      error: {
        code: 'MISSING_SIGNATURE',
        message: 'Missing x-razorpay-signature header',
      },
    });
    return;
  }

  // Get raw body or JSON stringified body
  const payload = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);

  const expectedSignature = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(payload)
    .digest('hex');

  // Constant-time comparison to prevent timing attacks
  let isValid = false;
  try {
    isValid = crypto.timingSafeEqual(
      Buffer.from(signature, 'utf8'),
      Buffer.from(expectedSignature, 'utf8')
    );
  } catch {
    isValid = false;
  }

  if (!isValid) {
    res.status(400).json({
      error: {
        code: 'INVALID_SIGNATURE',
        message: 'Invalid webhook signature',
      },
    });
    return;
  }

  // Signature is cryptographically verified
  const event = req.body;
  const eventType = event.event;

  if (eventType === 'order.paid' || eventType === 'payment.captured') {
    const paymentEntity = event.payload?.payment?.entity;
    const orderEntity = event.payload?.order?.entity;

    const razorpayOrderId = orderEntity?.id || paymentEntity?.order_id;
    const razorpayPaymentId = paymentEntity?.id;

    if (razorpayOrderId) {
      const db = getDb();
      const order = db
        .prepare('SELECT id, user_id, order_status, payment_status FROM orders WHERE razorpay_order_id = ?')
        .get(razorpayOrderId) as any;

      if (order && order.payment_status !== 'paid') {
        const updateTx = db.transaction(() => {
          db.prepare(
            `UPDATE orders 
             SET payment_status = 'paid', 
                 razorpay_payment_id = ?, 
                 updated_at = CURRENT_TIMESTAMP 
             WHERE id = ?`
          ).run(razorpayPaymentId || 'pay_verified_webhook', order.id);

          // Append status history
          db.prepare(
            `INSERT INTO order_status_history (id, order_id, from_status, to_status, note, changed_by)
             VALUES (?, ?, ?, ?, ?, ?)`
          ).run(
            `osh_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            order.id,
            order.order_status,
            order.order_status,
            'Payment verified via Razorpay webhook',
            'system_webhook'
          );

          // Append audit log
          db.prepare(
            `INSERT INTO audit_log (id, user_id, action, entity_type, entity_id, new_values)
             VALUES (?, ?, ?, ?, ?, ?)`
          ).run(
            `audit_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            order.user_id,
            'payment_captured_webhook',
            'order',
            order.id,
            JSON.stringify({ payment_status: 'paid', razorpay_payment_id: razorpayPaymentId })
          );
        });

        updateTx();
      }
    }
  }

  res.status(200).json({ received: true });
});
