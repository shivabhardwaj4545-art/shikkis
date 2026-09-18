import { Router } from 'express';
import crypto from 'crypto';
import db from '../db/index.ts';
import { verifyJWT } from '../middleware/auth.middleware.ts';

const router = Router();

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || 'rzp_test_mockkey12345';
const RAZORPAY_WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || 'shikkis_webhook_secret_key';

// POST /api/payment/create-order — Creates Razorpay order
router.post('/create-order', verifyJWT, (req, res, next) => {
  try {
    const userId = req.user!.id;
    const { orderId } = req.body;

    const order = db.prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?').get(orderId, userId) as any;
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (order.payment_status === 'paid') {
      return res.status(400).json({ error: 'Order is already paid' });
    }

    // Generate Razorpay Order ID (or Mock for dev environment)
    const razorpayOrderId = `order_${crypto.randomBytes(8).toString('hex')}`;

    db.prepare('UPDATE orders SET razorpay_order_id = ? WHERE id = ?').run(razorpayOrderId, orderId);

    return res.json({
      razorpayOrderId,
      amountPaise: order.total_paise,
      currency: 'INR',
      keyId: RAZORPAY_KEY_ID,
    });
  } catch (err) {
    return next(err);
  }
});

// POST /api/payment/verify — Dev helper or webhook verifier
router.post('/verify-dev', verifyJWT, (req, res, next) => {
  try {
    const userId = req.user!.id;
    const { orderId, paymentId } = req.body;

    const order = db.prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?').get(orderId, userId) as any;
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Mark as paid
    db.prepare(`
      UPDATE orders 
      SET payment_status = 'paid', status = 'processing', razorpay_payment_id = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(paymentId || `pay_${crypto.randomBytes(8).toString('hex')}`, orderId);

    return res.json({ success: true, message: 'Payment recorded and order processing' });
  } catch (err) {
    return next(err);
  }
});

// POST /api/payment/webhook — Official Razorpay Webhook listener
router.post('/webhook', (req, res) => {
  const signature = req.headers['x-razorpay-signature'] as string;
  const rawBody = JSON.stringify(req.body);

  if (signature) {
    const expectedSignature = crypto
      .createHmac('sha256', RAZORPAY_WEBHOOK_SECRET)
      .update(rawBody)
      .digest('hex');

    if (signature !== expectedSignature) {
      return res.status(400).json({ error: 'Invalid webhook signature' });
    }
  }

  const payload = req.body;
  if (payload.event === 'payment.captured' || payload.event === 'order.paid') {
    const payment = payload.payload.payment.entity;
    const razorpayOrderId = payment.order_id;
    const paymentId = payment.id;

    db.prepare(`
      UPDATE orders 
      SET payment_status = 'paid', status = 'processing', razorpay_payment_id = ?, updated_at = CURRENT_TIMESTAMP
      WHERE razorpay_order_id = ?
    `).run(paymentId, razorpayOrderId);
  }

  return res.json({ status: 'ok' });
});

export default router;
