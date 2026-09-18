import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/index.ts';
import { verifyJWT, requireRole } from '../middleware/auth.middleware.ts';
import { validate } from '../middleware/validate.ts';
import { createProductSchema } from '../../shared/schemas/product.schema.ts';
import { createBannerSchema } from '../../shared/schemas/banner.schema.ts';
import { updateOrderStatusSchema } from '../../shared/schemas/order.schema.ts';

const router = Router();

// MANDATORY SECURITY RULE: All /api/admin/* routes MUST pass through verifyJWT and requireRole('owner')
router.use(verifyJWT);
router.use(requireRole('owner'));

// GET /api/admin/stats — Dashboard Analytics
router.get('/stats', (_req, res, next) => {
  try {
    const totalOrdersRow = db.prepare("SELECT COUNT(*) as count, SUM(total_paise) as total_revenue FROM orders WHERE payment_status = 'paid'").get() as any;
    const totalProductsRow = db.prepare('SELECT COUNT(*) as count FROM products').get() as any;
    const totalCustomersRow = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'customer'").get() as any;
    const pendingOrdersRow = db.prepare("SELECT COUNT(*) as count FROM orders WHERE status = 'pending' OR status = 'processing'").get() as any;

    const recentOrders = db.prepare(`
      SELECT o.id, o.order_number, o.status, o.total_paise, o.payment_status, o.created_at, u.full_name, u.email
      FROM orders o
      JOIN users u ON o.user_id = u.id
      ORDER BY o.created_at DESC
      LIMIT 10
    `).all();

    res.json({
      stats: {
        totalOrders: totalOrdersRow.count || 0,
        totalRevenuePaise: totalOrdersRow.total_revenue || 0,
        totalProducts: totalProductsRow.count || 0,
        totalCustomers: totalCustomersRow.count || 0,
        pendingOrders: pendingOrdersRow.count || 0,
      },
      recentOrders,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/products — All products including inactive
router.get('/products', (_req, res, next) => {
  try {
    const products = db.prepare(`
      SELECT p.*, c.name as category_name
      FROM products p
      JOIN categories c ON p.category_id = c.id
      ORDER BY p.created_at DESC
    `).all() as any[];

    const fullProducts = products.map((p) => {
      const images = db.prepare('SELECT * FROM product_images WHERE product_id = ? ORDER BY display_order ASC').all(p.id);
      const variants = db.prepare('SELECT * FROM product_variants WHERE product_id = ?').all(p.id);

      return {
        id: p.id,
        title: p.title,
        slug: p.slug,
        categoryId: p.category_id,
        categoryName: p.category_name,
        description: p.description,
        fabric: p.fabric,
        craft: p.craft,
        pricePaise: p.price_paise,
        discountPricePaise: p.discount_price_paise,
        isFeatured: Boolean(p.is_featured),
        isActive: Boolean(p.is_active),
        images,
        variants,
        createdAt: p.created_at,
      };
    });

    res.json({ products: fullProducts });
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/products — Create Product
router.post('/products', validate(createProductSchema), (req, res, next) => {
  try {
    const { title, slug, categoryId, description, fabric, craft, pricePaise, discountPricePaise, isFeatured, isActive, images, variants } = req.body;

    const productId = uuidv4();

    const insertProductTx = db.transaction(() => {
      db.prepare(`
        INSERT INTO products (id, title, slug, category_id, description, fabric, craft, price_paise, discount_price_paise, is_featured, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        productId,
        title,
        slug,
        categoryId,
        description,
        fabric,
        craft,
        pricePaise,
        discountPricePaise || null,
        isFeatured ? 1 : 0,
        isActive ? 1 : 0
      );

      // Insert Images
      const insertImgStmt = db.prepare(`
        INSERT INTO product_images (id, product_id, image_url, alt_text, is_primary, display_order)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      images.forEach((img: any, idx: number) => {
        insertImgStmt.run(uuidv4(), productId, img.imageUrl, img.altText || title, img.isPrimary ? 1 : (idx === 0 ? 1 : 0), idx);
      });

      // Insert Variants
      const insertVarStmt = db.prepare(`
        INSERT INTO product_variants (id, product_id, size, color, stock_quantity, sku)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      variants.forEach((v: any) => {
        insertVarStmt.run(uuidv4(), productId, v.size, v.color, v.stockQuantity, v.sku);
      });
    });

    insertProductTx();

    res.status(201).json({ id: productId, message: 'Product created successfully' });
  } catch (err) {
    next(err);
  }
});

// PUT /api/admin/products/:id — Update Product
router.put('/products/:id', (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, description, fabric, craft, pricePaise, discountPricePaise, isFeatured, isActive } = req.body;

    db.prepare(`
      UPDATE products
      SET title = COALESCE(?, title),
          description = COALESCE(?, description),
          fabric = COALESCE(?, fabric),
          craft = COALESCE(?, craft),
          price_paise = COALESCE(?, price_paise),
          discount_price_paise = ?,
          is_featured = COALESCE(?, is_featured),
          is_active = COALESCE(?, is_active)
      WHERE id = ?
    `).run(title, description, fabric, craft, pricePaise, discountPricePaise !== undefined ? discountPricePaise : null, isFeatured !== undefined ? (isFeatured ? 1 : 0) : null, isActive !== undefined ? (isActive ? 1 : 0) : null, id);

    res.json({ message: 'Product updated successfully' });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/admin/products/:id
router.delete('/products/:id', (req, res, next) => {
  try {
    const { id } = req.params;
    db.prepare('DELETE FROM products WHERE id = ?').run(id);
    res.json({ message: 'Product deleted' });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/orders — All Orders
router.get('/orders', (_req, res, next) => {
  try {
    const orders = db.prepare(`
      SELECT o.*, u.full_name, u.email
      FROM orders o
      JOIN users u ON o.user_id = u.id
      ORDER BY o.created_at DESC
    `).all() as any[];

    const formatted = orders.map((o) => {
      const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(o.id);
      return {
        id: o.id,
        orderNumber: o.order_number,
        customerName: o.full_name,
        customerEmail: o.email,
        status: o.status,
        subtotalPaise: o.subtotal_paise,
        taxPaise: o.tax_paise,
        totalPaise: o.total_paise,
        paymentStatus: o.payment_status,
        shippingAddress: JSON.parse(o.shipping_address_json),
        items,
        createdAt: o.created_at,
      };
    });

    res.json({ orders: formatted });
  } catch (err) {
    next(err);
  }
});

// PUT /api/admin/orders/:id/status — Update status
router.put('/orders/:id/status', validate(updateOrderStatusSchema), (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    db.prepare('UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(status, id);
    res.json({ message: `Order status updated to ${status}` });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/banners
router.get('/banners', (_req, res, next) => {
  try {
    const banners = db.prepare('SELECT * FROM banners').all();
    res.json({ banners });
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/banners
router.post('/banners', validate(createBannerSchema), (req, res, next) => {
  try {
    const { title, subtitle, ctaText, ctaLink, badgeText, isActive } = req.body;
    const bannerId = uuidv4();

    db.prepare(`
      INSERT INTO banners (id, title, subtitle, cta_text, cta_link, badge_text, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(bannerId, title, subtitle || null, ctaText, ctaLink, badgeText || null, isActive ? 1 : 0);

    res.status(201).json({ id: bannerId, message: 'Banner created' });
  } catch (err) {
    next(err);
  }
});

// PUT /api/admin/banners/:id
router.put('/banners/:id', (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, subtitle, ctaText, ctaLink, badgeText, isActive } = req.body;

    db.prepare(`
      UPDATE banners
      SET title = COALESCE(?, title),
          subtitle = COALESCE(?, subtitle),
          cta_text = COALESCE(?, cta_text),
          cta_link = COALESCE(?, cta_link),
          badge_text = COALESCE(?, badge_text),
          is_active = COALESCE(?, is_active)
      WHERE id = ?
    `).run(title, subtitle, ctaText, ctaLink, badgeText, isActive !== undefined ? (isActive ? 1 : 0) : null, id);

    res.json({ message: 'Banner updated' });
  } catch (err) {
    next(err);
  }
});

export default router;
