import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/index.ts';
import { verifyJWT } from '../middleware/auth.middleware.ts';

const router = Router();

// GET /api/cart
router.get('/', verifyJWT, (req, res, next) => {
  try {
    const userId = req.user!.id;
    let cart = db.prepare('SELECT * FROM carts WHERE user_id = ?').get(userId) as any;

    if (!cart) {
      const cartId = uuidv4();
      db.prepare('INSERT INTO carts (id, user_id) VALUES (?, ?)').run(cartId, userId);
      cart = { id: cartId, user_id: userId };
    }

    const items = db.prepare(`
      SELECT ci.*, p.title, p.price_paise, p.discount_price_paise, p.slug,
             pv.size, pv.color, pv.stock_quantity,
             (SELECT image_url FROM product_images WHERE product_id = p.id AND is_primary = 1 LIMIT 1) as image_url
      FROM cart_items ci
      JOIN products p ON ci.product_id = p.id
      JOIN product_variants pv ON ci.variant_id = pv.id
      WHERE ci.cart_id = ?
    `).all(cart.id) as any[];

    return res.json({ cartId: cart.id, items });
  } catch (err) {
    return next(err);
  }
});

// POST /api/cart/items
router.post('/items', verifyJWT, (req, res, next) => {
  try {
    const userId = req.user!.id;
    const { productId, variantId, quantity } = req.body;

    if (!productId || !variantId || !quantity || quantity <= 0) {
      return res.status(400).json({ error: 'Valid productId, variantId, and positive quantity required' });
    }

    let cart = db.prepare('SELECT id FROM carts WHERE user_id = ?').get(userId) as any;
    if (!cart) {
      const cartId = uuidv4();
      db.prepare('INSERT INTO carts (id, user_id) VALUES (?, ?)').run(cartId, userId);
      cart = { id: cartId };
    }

    const existingItem = db.prepare('SELECT id, quantity FROM cart_items WHERE cart_id = ? AND variant_id = ?').get(cart.id, variantId) as any;

    if (existingItem) {
      const newQty = existingItem.quantity + quantity;
      db.prepare('UPDATE cart_items SET quantity = ? WHERE id = ?').run(newQty, existingItem.id);
    } else {
      db.prepare('INSERT INTO cart_items (id, cart_id, product_id, variant_id, quantity) VALUES (?, ?, ?, ?, ?)')
        .run(uuidv4(), cart.id, productId, variantId, quantity);
    }

    return res.status(201).json({ success: true });
  } catch (err) {
    return next(err);
  }
});

// PUT /api/cart/items/:itemId
router.put('/items/:itemId', verifyJWT, (req, res, next) => {
  try {
    const userId = req.user!.id;
    const { itemId } = req.params;
    const { quantity } = req.body;

    const cart = db.prepare('SELECT id FROM carts WHERE user_id = ?').get(userId) as any;
    if (!cart) return res.status(404).json({ error: 'Cart not found' });

    if (quantity <= 0) {
      db.prepare('DELETE FROM cart_items WHERE id = ? AND cart_id = ?').run(itemId, cart.id);
    } else {
      db.prepare('UPDATE cart_items SET quantity = ? WHERE id = ? AND cart_id = ?').run(quantity, itemId, cart.id);
    }

    return res.json({ success: true });
  } catch (err) {
    return next(err);
  }
});

// DELETE /api/cart/items/:itemId
router.delete('/items/:itemId', verifyJWT, (req, res, next) => {
  try {
    const userId = req.user!.id;
    const { itemId } = req.params;

    const cart = db.prepare('SELECT id FROM carts WHERE user_id = ?').get(userId) as any;
    if (!cart) return res.status(404).json({ error: 'Cart not found' });

    db.prepare('DELETE FROM cart_items WHERE id = ? AND cart_id = ?').run(itemId, cart.id);
    return res.json({ success: true });
  } catch (err) {
    return next(err);
  }
});

export default router;
