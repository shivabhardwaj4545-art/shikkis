import { Router } from 'express';
import type { Request, Response } from 'express';
import crypto from 'crypto';
import db from '../db/client.js';
import { calculateCart, type CartBreakdown } from '../services/pricing.js';

export const cartRouter = Router();

const SESSION_COOKIE = 'shikkis_session';

interface CartRow {
  id: string;
  user_id: string | null;
  session_id: string | null;
  coupon_code: string | null;
}

interface CartItemRow {
  id: string;
  cart_id: string;
  variant_id: string;
  quantity: number;
}

/**
 * Retrieves existing cart or creates a new guest/user cart.
 * Automatically sets signed httpOnly cookie for guests.
 */
export async function getOrCreateCart(req: Request, res: Response): Promise<{ cart: CartRow; userId?: string }> {
  const userId = (req as any).user?.userId as string | undefined;

  if (userId) {
    let cart = (await db
      .prepare('SELECT id, user_id, session_id, coupon_code FROM carts WHERE user_id = ?')
      .get(userId)) as CartRow | undefined;

    if (!cart) {
      const cartId = `crt_${crypto.randomUUID()}`;
      await db.prepare('INSERT INTO carts (id, user_id) VALUES (?, ?)').run(cartId, userId);
      cart = { id: cartId, user_id: userId, session_id: null, coupon_code: null };
    }

    // Merge guest session cart if present
    const guestSessionId = req.signedCookies?.[SESSION_COOKIE] || req.cookies?.[SESSION_COOKIE];
    if (guestSessionId) {
      const guestCart = (await db
        .prepare('SELECT id, coupon_code FROM carts WHERE session_id = ? AND user_id IS NULL')
        .get(guestSessionId)) as { id: string; coupon_code: string | null } | undefined;

      if (guestCart && guestCart.id !== cart.id) {
        await mergeGuestCart(guestCart.id, cart.id);
        if (guestCart.coupon_code && !cart.coupon_code) {
          await db.prepare('UPDATE carts SET coupon_code = ? WHERE id = ?').run(guestCart.coupon_code, cart.id);
          cart.coupon_code = guestCart.coupon_code;
        }
        res.clearCookie(SESSION_COOKIE);
      }
    }

    return { cart, userId };
  }

  // Guest Cart
  let sessionId = req.signedCookies?.[SESSION_COOKIE] || req.cookies?.[SESSION_COOKIE];

  if (!sessionId) {
    sessionId = crypto.randomUUID();
    res.cookie(SESSION_COOKIE, sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      signed: true,
      maxAge: 30 * 86400 * 1000, // 30 days
    });
  }

  let cart = (await db
    .prepare('SELECT id, user_id, session_id, coupon_code FROM carts WHERE session_id = ?')
    .get(sessionId)) as CartRow | undefined;

  if (!cart) {
    const cartId = `crt_${crypto.randomUUID()}`;
    await db.prepare('INSERT INTO carts (id, session_id) VALUES (?, ?)').run(cartId, sessionId);
    cart = { id: cartId, user_id: null, session_id: sessionId, coupon_code: null };
  }

  return { cart };
}

/**
 * Merges items from guest cart into authenticated user's cart
 * Sums quantities and clamps to available variant stock
 */
async function mergeGuestCart(fromCartId: string, toCartId: string): Promise<void> {
  const guestItems = (await db
    .prepare('SELECT variant_id, quantity FROM cart_items WHERE cart_id = ?')
    .all(fromCartId)) as Array<{ variant_id: string; quantity: number }>;

  const upsertItem = db.prepare(`
    INSERT INTO cart_items (id, cart_id, variant_id, quantity)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(cart_id, variant_id) DO UPDATE SET
      quantity = cart_items.quantity + excluded.quantity
  `);

  for (const item of guestItems) {
    const itemId = `cit_${crypto.randomUUID()}`;
    await upsertItem.run(itemId, toCartId, item.variant_id, item.quantity);
  }

  // Delete old guest cart
  await db.prepare('DELETE FROM carts WHERE id = ?').run(fromCartId);
}

/**
 * Loads and validates cart items against stock, then calculates authoritative breakdown
 */
export async function buildCartResponse(cart: CartRow, userId?: string): Promise<{
  cart_id: string;
  breakdown: CartBreakdown;
}> {
  const items = (await db
    .prepare(`
      SELECT ci.id, ci.variant_id, ci.quantity, pv.stock
      FROM cart_items ci
      JOIN product_variants pv ON pv.id = ci.variant_id
      WHERE ci.cart_id = ?
    `)
    .all(cart.id)) as Array<{ id: string; variant_id: string; quantity: number | string; stock: number | string }>;

  // Revalidate stock and clamp quantities if needed
  const validItems: Array<{ variant_id: string; quantity: number }> = [];

  for (const it of items) {
    const stock = Number(it.stock);
    const quantity = Number(it.quantity);

    if (stock <= 0) {
      // Out of stock — remove from cart
      await db.prepare('DELETE FROM cart_items WHERE id = ?').run(it.id);
    } else if (quantity > stock) {
      // Clamp to available stock
      await db.prepare('UPDATE cart_items SET quantity = ? WHERE id = ?').run(stock, it.id);
      validItems.push({ variant_id: it.variant_id, quantity: stock });
    } else {
      validItems.push({ variant_id: it.variant_id, quantity: quantity });
    }
  }

  const breakdown = await calculateCart(validItems, userId, cart.coupon_code || undefined);

  // If coupon code stored on cart is no longer valid, clear it
  if (cart.coupon_code && breakdown.coupon_error) {
    await db.prepare('UPDATE carts SET coupon_code = NULL WHERE id = ?').run(cart.id);
  }

  return {
    cart_id: cart.id,
    breakdown,
  };
}

/**
 * GET /api/cart
 * Returns current cart and live price breakdown
 */
cartRouter.get('/', async (req, res) => {
  const { cart, userId } = await getOrCreateCart(req, res);
  const response = await buildCartResponse(cart, userId);
  return res.json(response);
});

/**
 * POST /api/cart/items
 * Body: { variant_id: string, quantity: number }
 * Validates stock and adds/increments item
 */
cartRouter.post('/items', async (req, res) => {
  const { variant_id, quantity = 1 } = req.body;

  if (!variant_id || typeof variant_id !== 'string') {
    return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'variant_id is required' } });
  }

  const parsedQty = Math.max(1, parseInt(quantity, 10) || 1);

  // Check variant existence and stock
  const variant = (await db
    .prepare('SELECT id, stock, is_active FROM product_variants WHERE id = ?')
    .get(variant_id)) as { id: string; stock: number | string; is_active: number } | undefined;

  if (!variant || !variant.is_active) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Product variant not found' } });
  }

  const variantStock = Number(variant.stock);
  if (variantStock <= 0) {
    return res.status(400).json({ error: { code: 'OUT_OF_STOCK', message: 'This variant is currently out of stock' } });
  }

  const { cart, userId } = await getOrCreateCart(req, res);

  // Check existing quantity in cart
  const existing = (await db
    .prepare('SELECT id, quantity FROM cart_items WHERE cart_id = ? AND variant_id = ?')
    .get(cart.id, variant_id)) as CartItemRow | undefined;

  const currentQty = existing ? Number(existing.quantity) : 0;
  const targetQty = Math.min(variantStock, currentQty + parsedQty);

  if (existing) {
    await db.prepare('UPDATE cart_items SET quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(
      targetQty,
      existing.id
    );
  } else {
    const itemId = `cit_${crypto.randomUUID()}`;
    await db.prepare(`
      INSERT INTO cart_items (id, cart_id, variant_id, quantity)
      VALUES (?, ?, ?, ?)
    `).run(itemId, cart.id, variant_id, targetQty);
  }

  const response = await buildCartResponse(cart, userId);
  return res.json(response);
});

/**
 * PATCH /api/cart/items/:id
 * Body: { quantity: number }
 * Updates item quantity, clamped to stock
 */
cartRouter.patch('/items/:id', async (req, res) => {
  const { id } = req.params;
  const { quantity } = req.body;

  if (quantity === undefined) {
    return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'quantity is required' } });
  }

  const { cart, userId } = await getOrCreateCart(req, res);

  const cartItem = (await db
    .prepare(`
      SELECT ci.id, ci.variant_id, ci.quantity, pv.stock
      FROM cart_items ci
      JOIN product_variants pv ON pv.id = ci.variant_id
      WHERE ci.id = ? AND ci.cart_id = ?
    `)
    .get(id, cart.id)) as { id: string; variant_id: string; quantity: number | string; stock: number | string } | undefined;

  if (!cartItem) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Cart item not found' } });
  }

  const parsedQty = parseInt(quantity, 10);
  const itemStock = Number(cartItem.stock);

  if (parsedQty <= 0) {
    await db.prepare('DELETE FROM cart_items WHERE id = ?').run(id);
  } else {
    const clampedQty = Math.min(itemStock, parsedQty);
    await db.prepare('UPDATE cart_items SET quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(
      clampedQty,
      id
    );
  }

  const response = await buildCartResponse(cart, userId);
  return res.json(response);
});

/**
 * DELETE /api/cart/items/:id
 * Removes item from cart
 */
cartRouter.delete('/items/:id', async (req, res) => {
  const { id } = req.params;
  const { cart, userId } = await getOrCreateCart(req, res);

  await db.prepare('DELETE FROM cart_items WHERE id = ? AND cart_id = ?').run(id, cart.id);

  const response = await buildCartResponse(cart, userId);
  return res.json(response);
});

/**
 * POST /api/cart/coupon
 * Body: { code: string }
 * Validates and applies promotional coupon
 */
cartRouter.post('/coupon', async (req, res) => {
  const { code } = req.body;

  if (!code || typeof code !== 'string') {
    return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Coupon code is required' } });
  }

  const { cart, userId } = await getOrCreateCart(req, res);

  // Test apply via calculateCart
  const items = (await db
    .prepare('SELECT variant_id, quantity FROM cart_items WHERE cart_id = ?')
    .all(cart.id)) as Array<{ variant_id: string; quantity: number | string }>;

  const formattedItems = items.map((it) => ({ variant_id: it.variant_id, quantity: Number(it.quantity) }));

  const testBreakdown = await calculateCart(formattedItems, userId, code.trim());

  if (testBreakdown.coupon_error) {
    return res.status(400).json({
      error: { code: 'INVALID_COUPON', message: testBreakdown.coupon_error },
    });
  }

  // Valid coupon — save to cart
  await db.prepare('UPDATE carts SET coupon_code = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(
    code.trim().toUpperCase(),
    cart.id
  );
  cart.coupon_code = code.trim().toUpperCase();

  const response = await buildCartResponse(cart, userId);
  return res.json(response);
});

/**
 * DELETE /api/cart/coupon
 * Removes applied promotional coupon
 */
cartRouter.delete('/coupon', async (req, res) => {
  const { cart, userId } = await getOrCreateCart(req, res);

  await db.prepare('UPDATE carts SET coupon_code = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(cart.id);
  cart.coupon_code = null;

  const response = await buildCartResponse(cart, userId);
  return res.json(response);
});
