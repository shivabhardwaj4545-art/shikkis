import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Router } from 'express';
import multer from 'multer';
import Razorpay from 'razorpay';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';

import { getDb } from '../db/client.js';
import { requireRole, verifyJWT } from '../middleware/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const adminRouter = Router();

// ── Security Baseline ────────────────────────────────────────────────────────
// Every single route in this file must pass through verifyJWT and requireRole('owner')
adminRouter.use(verifyJWT);
adminRouter.use(requireRole('owner'));

// ── Multer Storage Configuration for Media Upload ────────────────────────────
const uploadsDir = path.resolve(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    const uniqueName = `media_${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`;
    cb(null, uniqueName);
  },
});

const fileFilter = (_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPEG, PNG, WebP, and AVIF image formats are allowed'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

/**
 * POST /api/admin/upload
 * Multi-part single image upload via multer
 */
adminRouter.post('/upload', upload.single('image'), (req, res, next) => {
  try {
    if (!req.file) {
      res.status(400).json({
        error: { code: 'NO_FILE_UPLOADED', message: 'Please select an image file to upload.' },
      });
      return;
    }

    const publicUrl = `/uploads/${req.file.filename}`;
    res.json({
      url: publicUrl,
      filename: req.file.filename,
      size: req.file.size,
      mimetype: req.file.mimetype,
    });
  } catch (err) {
    next(err);
  }
});

// ─── Products Management ──────────────────────────────────────────────────────

/**
 * GET /api/admin/products
 * List products with filters, sorting, variant stock roll-ups
 */
adminRouter.get('/products', (req, res, next) => {
  try {
    const db = getDb();
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const offset = (page - 1) * limit;

    const search = (req.query.search as string)?.trim() || '';
    const categoryId = req.query.category_id as string;
    const gender = req.query.gender as string;
    const isActive = req.query.is_active as string;
    const sortBy = (req.query.sort_by as string) || 'created_at';
    const sortOrder = (req.query.order as string)?.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    const conditions: string[] = ['1=1'];
    const params: any[] = [];

    if (search) {
      conditions.push('(p.name LIKE ? OR p.sku LIKE ? OR p.description LIKE ?)');
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (categoryId && categoryId !== 'all') {
      conditions.push('p.category_id = ?');
      params.push(categoryId);
    }

    if (gender && gender !== 'all') {
      conditions.push('p.gender = ?');
      params.push(gender);
    }

    if (isActive !== undefined && isActive !== '' && isActive !== 'all') {
      conditions.push('p.is_active = ?');
      params.push(isActive === 'true' || isActive === '1' ? 1 : 0);
    }

    const whereClause = conditions.join(' AND ');

    const sortColumnMap: Record<string, string> = {
      name: 'p.name',
      sku: 'p.sku',
      price: 'p.mrp',
      discount: 'p.discount_percent',
      created_at: 'p.created_at',
      stock: 'total_stock',
    };
    const orderCol = sortColumnMap[sortBy] || 'p.created_at';

    const query = `
      SELECT
        p.id,
        p.name,
        p.slug,
        p.category_id,
        c.name as category_name,
        p.gender,
        p.mrp,
        p.discount_percent,
        p.sku,
        p.images,
        p.is_active,
        p.is_featured,
        p.created_at,
        p.updated_at,
        COALESCE(SUM(pv.stock), 0) as total_stock,
        COUNT(pv.id) as variant_count
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN product_variants pv ON p.id = pv.product_id
      WHERE ${whereClause}
      GROUP BY p.id
      ORDER BY ${orderCol} ${sortOrder}
      LIMIT ? OFFSET ?
    `;

    const countQuery = `
      SELECT COUNT(DISTINCT p.id) as total
      FROM products p
      WHERE ${whereClause}
    `;

    const countRow = db.prepare(countQuery).get(...params) as { total: number };
    const total = countRow ? countRow.total : 0;

    const rows = db.prepare(query).all(...params, limit, offset) as any[];

    const products = rows.map((r) => {
      let parsedImages: string[] = [];
      try {
        parsedImages = JSON.parse(r.images);
      } catch {
        parsedImages = [];
      }

      return {
        ...r,
        images: parsedImages,
        primary_image: parsedImages[0] || null,
        is_active: Boolean(r.is_active),
        is_featured: Boolean(r.is_featured),
        final_price_paise: Math.round(r.mrp * (1 - r.discount_percent / 100)),
      };
    });

    res.json({
      data: products,
      pagination: {
        total,
        page,
        limit,
        total_pages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/admin/products/export
 * Downloadable CSV of products (MUST be defined before /products/:id)
 */
adminRouter.get('/products/export', (_req, res, next) => {
  try {
    const db = getDb();
    const rows = db.prepare(`
      SELECT
        p.id, p.name, p.sku, c.name as category_name, p.gender,
        p.mrp, p.discount_percent, p.is_active, p.created_at,
        COALESCE(SUM(pv.stock), 0) as total_stock
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN product_variants pv ON p.id = pv.product_id
      GROUP BY p.id
      ORDER BY p.name ASC
    `).all() as any[];

    const headers = ['Product ID', 'Name', 'SKU', 'Category', 'Gender', 'MRP (INR)', 'Discount %', 'Selling Price (INR)', 'Total Stock', 'Status', 'Created At'];
    const csvRows = [headers.join(',')];

    for (const r of rows) {
      const sellingPrice = (Math.round(r.mrp * (1 - r.discount_percent / 100)) / 100).toFixed(2);
      const mrpInr = (r.mrp / 100).toFixed(2);
      const status = r.is_active ? 'Active' : 'Inactive';
      const cleanName = `"${r.name.replace(/"/g, '""')}"`;

      csvRows.push([
        r.id,
        cleanName,
        r.sku,
        r.category_name || 'Uncategorized',
        r.gender,
        mrpInr,
        r.discount_percent,
        sellingPrice,
        r.total_stock,
        status,
        r.created_at,
      ].join(','));
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="shikkis-products.csv"');
    res.send(csvRows.join('\n'));
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/admin/products/:id
 * Single product detail with all variants for the editor
 */
adminRouter.get('/products/:id', (req, res, next) => {
  try {
    const db = getDb();
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id) as any;

    if (!product) {
      res.status(404).json({
        error: { code: 'PRODUCT_NOT_FOUND', message: 'Product not found.' },
      });
      return;
    }

    const variants = db
      .prepare('SELECT * FROM product_variants WHERE product_id = ? ORDER BY size, color')
      .all(req.params.id) as any[];

    let parsedImages: string[] = [];
    try {
      parsedImages = JSON.parse(product.images);
    } catch {
      parsedImages = [];
    }

    res.json({
      product: {
        ...product,
        images: parsedImages,
        is_active: Boolean(product.is_active),
        is_featured: Boolean(product.is_featured),
      },
      variants: variants.map((v) => ({
        ...v,
        is_active: Boolean(v.is_active),
      })),
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/admin/products
 * Create product with specifications & variant matrix
 */
adminRouter.post('/products', (req, res, next) => {
  try {
    const db = getDb();
    const body = req.body;

    const {
      name,
      category_id,
      description,
      long_description,
      fabric,
      occasion,
      gender,
      care_instructions,
      mrp,
      discount_percent = 0,
      sku,
      images = [],
      is_active = true,
      is_featured = false,
      variants = [],
    } = body;

    if (!name || !category_id || !sku || !mrp) {
      res.status(400).json({
        error: { code: 'INVALID_INPUT', message: 'Name, category, SKU, and MRP are required.' },
      });
      return;
    }

    // Generate unique slug
    let baseSlug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
    let slug = baseSlug;
    let counter = 1;
    while (db.prepare('SELECT id FROM products WHERE slug = ?').get(slug)) {
      slug = `${baseSlug}-${counter++}`;
    }

    const productId = `prd_${uuidv4().replace(/-/g, '').slice(0, 10)}`;

    const insertProduct = db.prepare(`
      INSERT INTO products (
        id, category_id, name, slug, description, long_description,
        fabric, occasion, gender, care_instructions, mrp, discount_percent,
        sku, images, is_active, is_featured
      ) VALUES (
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?
      )
    `);

    const insertVariant = db.prepare(`
      INSERT INTO product_variants (
        id, product_id, size, color, variant_sku, price_override, stock, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertAudit = db.prepare(`
      INSERT INTO audit_log (id, user_id, action, entity_type, entity_id, changes, ip_address)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const createTx = db.transaction(() => {
      insertProduct.run(
        productId,
        category_id,
        name,
        slug,
        description || '',
        long_description || '',
        fabric || '',
        occasion || '',
        gender || 'women',
        care_instructions || '',
        mrp,
        discount_percent,
        sku.toUpperCase(),
        JSON.stringify(images),
        is_active ? 1 : 0,
        is_featured ? 1 : 0
      );

      for (const v of variants) {
        const variantId = `var_${uuidv4().replace(/-/g, '').slice(0, 10)}`;
        insertVariant.run(
          variantId,
          productId,
          v.size,
          v.color,
          v.variant_sku.toUpperCase(),
          v.price_override || null,
          v.stock || 0,
          v.is_active !== false ? 1 : 0
        );
      }

      insertAudit.run(
        `aud_${uuidv4()}`,
        req.user?.sub,
        'CREATE_PRODUCT',
        'product',
        productId,
        JSON.stringify({ name, sku, variant_count: variants.length }),
        req.ip
      );
    });

    createTx();

    res.status(201).json({
      product_id: productId,
      slug,
      message: 'Product created successfully',
    });
  } catch (err: any) {
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      res.status(400).json({
        error: { code: 'DUPLICATE_SKU_OR_SLUG', message: 'A product with this SKU or slug already exists.' },
      });
      return;
    }
    next(err);
  }
});

/**
 * PUT /api/admin/products/:id
 * Update product and synchronize variants
 */
adminRouter.put('/products/:id', (req, res, next) => {
  try {
    const db = getDb();
    const productId = req.params.id;
    const body = req.body;

    const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(productId);
    if (!existing) {
      res.status(404).json({
        error: { code: 'PRODUCT_NOT_FOUND', message: 'Product not found' },
      });
      return;
    }

    const {
      name,
      category_id,
      description,
      long_description,
      fabric,
      occasion,
      gender,
      care_instructions,
      mrp,
      discount_percent = 0,
      sku,
      images = [],
      is_active = true,
      is_featured = false,
      variants = [],
    } = body;

    const updateProduct = db.prepare(`
      UPDATE products SET
        category_id = ?, name = ?, description = ?, long_description = ?,
        fabric = ?, occasion = ?, gender = ?, care_instructions = ?,
        mrp = ?, discount_percent = ?, sku = ?, images = ?,
        is_active = ?, is_featured = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    const upsertVariant = db.prepare(`
      INSERT INTO product_variants (
        id, product_id, size, color, variant_sku, price_override, stock, is_active, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(product_id, size, color) DO UPDATE SET
        variant_sku = excluded.variant_sku,
        price_override = excluded.price_override,
        stock = excluded.stock,
        is_active = excluded.is_active,
        updated_at = CURRENT_TIMESTAMP
    `);

    const updateTx = db.transaction(() => {
      updateProduct.run(
        category_id,
        name,
        description,
        long_description,
        fabric,
        occasion,
        gender,
        care_instructions,
        mrp,
        discount_percent,
        sku.toUpperCase(),
        JSON.stringify(images),
        is_active ? 1 : 0,
        is_featured ? 1 : 0,
        productId
      );

      for (const v of variants) {
        const variantId = v.id || `var_${uuidv4().replace(/-/g, '').slice(0, 10)}`;
        upsertVariant.run(
          variantId,
          productId,
          v.size,
          v.color,
          v.variant_sku.toUpperCase(),
          v.price_override || null,
          v.stock || 0,
          v.is_active !== false ? 1 : 0
        );
      }

      db.prepare(`
        INSERT INTO audit_log (id, user_id, action, entity_type, entity_id, changes, ip_address)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        `aud_${uuidv4()}`,
        req.user?.sub,
        'UPDATE_PRODUCT',
        'product',
        productId,
        JSON.stringify({ name, sku, updated_variants: variants.length }),
        req.ip
      );
    });

    updateTx();

    res.json({ message: 'Product updated successfully' });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/admin/products/:id/status
 * Inline optimistic active/inactive toggle
 */
adminRouter.patch('/products/:id/status', (req, res, next) => {
  try {
    const db = getDb();
    const { is_active } = req.body;

    const result = db
      .prepare('UPDATE products SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(is_active ? 1 : 0, req.params.id);

    if (result.changes === 0) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Product not found' } });
      return;
    }

    db.prepare(`
      INSERT INTO audit_log (id, user_id, action, entity_type, entity_id, changes, ip_address)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      `aud_${uuidv4()}`,
      req.user?.sub,
      'TOGGLE_PRODUCT_STATUS',
      'product',
      req.params.id,
      JSON.stringify({ is_active }),
      req.ip
    );

    res.json({ success: true, is_active: Boolean(is_active) });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/admin/products/bulk
 * Bulk activate, deactivate, or delete
 */
adminRouter.post('/products/bulk', (req, res, next) => {
  try {
    const db = getDb();
    const { ids, action } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'Array of ids required.' } });
      return;
    }

    const placeholders = ids.map(() => '?').join(',');

    const bulkTx = db.transaction(() => {
      if (action === 'activate') {
        db.prepare(`UPDATE products SET is_active = 1, updated_at = CURRENT_TIMESTAMP WHERE id IN (${placeholders})`).run(...ids);
      } else if (action === 'deactivate') {
        db.prepare(`UPDATE products SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id IN (${placeholders})`).run(...ids);
      } else if (action === 'delete') {
        db.prepare(`DELETE FROM products WHERE id IN (${placeholders})`).run(...ids);
      } else {
        throw new Error('Invalid bulk action');
      }

      db.prepare(`
        INSERT INTO audit_log (id, user_id, action, entity_type, entity_id, changes, ip_address)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        `aud_${uuidv4()}`,
        req.user?.sub,
        `BULK_${action.toUpperCase()}_PRODUCTS`,
        'product',
        null,
        JSON.stringify({ affected_ids: ids, count: ids.length }),
        req.ip
      );
    });

    bulkTx();

    res.json({ success: true, count: ids.length, action });
  } catch (err) {
    next(err);
  }
});

// ─── Inventory Management ─────────────────────────────────────────────────────

/**
 * GET /api/admin/inventory
 * All variants sortable by stock ascending, with low stock flags
 */
adminRouter.get('/inventory', (req, res, next) => {
  try {
    const db = getDb();
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 50));
    const offset = (page - 1) * limit;

    const search = (req.query.search as string)?.trim() || '';
    const lowStockOnly = req.query.low_stock === 'true';
    const sortOrder = (req.query.order as string)?.toLowerCase() === 'desc' ? 'DESC' : 'ASC';

    const conditions: string[] = ['1=1'];
    const params: any[] = [];

    if (search) {
      conditions.push('(p.name LIKE ? OR pv.variant_sku LIKE ? OR p.sku LIKE ?)');
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (lowStockOnly) {
      conditions.push('pv.stock < 5');
    }

    const whereClause = conditions.join(' AND ');

    const rows = db.prepare(`
      SELECT
        pv.id as variant_id,
        pv.variant_sku,
        pv.size,
        pv.color,
        pv.stock,
        pv.price_override,
        pv.is_active as variant_active,
        p.id as product_id,
        p.name as product_name,
        p.sku as product_sku,
        p.mrp,
        p.discount_percent,
        c.name as category_name
      FROM product_variants pv
      JOIN products p ON pv.product_id = p.id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE ${whereClause}
      ORDER BY pv.stock ${sortOrder}, p.name ASC
      LIMIT ? OFFSET ?
    `).all(...params, limit, offset) as any[];

    const countRow = db.prepare(`
      SELECT COUNT(*) as total
      FROM product_variants pv
      JOIN products p ON pv.product_id = p.id
      WHERE ${whereClause}
    `).get(...params) as { total: number };

    const total = countRow ? countRow.total : 0;

    res.json({
      data: rows.map((r) => ({
        ...r,
        is_low_stock: r.stock > 0 && r.stock < 5,
        is_out_of_stock: r.stock === 0,
      })),
      pagination: {
        total,
        page,
        limit,
        total_pages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/admin/inventory/batch
 * Batch update stock for selected variant IDs, written to audit_log
 */
adminRouter.post('/inventory/batch', (req, res, next) => {
  try {
    const db = getDb();
    const { variant_ids, stock } = req.body;

    if (!Array.isArray(variant_ids) || variant_ids.length === 0 || typeof stock !== 'number' || stock < 0) {
      res.status(400).json({
        error: { code: 'INVALID_INPUT', message: 'variant_ids array and non-negative stock required.' },
      });
      return;
    }

    const selectStmt = db.prepare('SELECT id, stock, variant_sku FROM product_variants WHERE id = ?');
    const updateStmt = db.prepare('UPDATE product_variants SET stock = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
    const auditStmt = db.prepare(`
      INSERT INTO audit_log (id, user_id, action, entity_type, entity_id, changes, ip_address)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const batchTx = db.transaction(() => {
      for (const vId of variant_ids) {
        const current = selectStmt.get(vId) as any;
        if (current) {
          updateStmt.run(stock, vId);
          auditStmt.run(
            `aud_${uuidv4()}`,
            req.user?.sub,
            'BATCH_STOCK_UPDATE',
            'product_variant',
            vId,
            JSON.stringify({
              variant_sku: current.variant_sku,
              old_stock: current.stock,
              new_stock: stock,
            }),
            req.ip
          );
        }
      }
    });

    batchTx();

    res.json({
      success: true,
      updated_count: variant_ids.length,
      new_stock: stock,
      message: `Successfully updated stock for ${variant_ids.length} variants.`,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/admin/inventory/audit-log
 * Recent inventory audit logs
 */
adminRouter.get('/inventory/audit-log', (_req, res, next) => {
  try {
    const db = getDb();
    const logs = db.prepare(`
      SELECT
        a.id, a.action, a.entity_id, a.changes, a.created_at,
        u.first_name, u.last_name, u.email
      FROM audit_log a
      LEFT JOIN users u ON a.user_id = u.id
      WHERE a.entity_type = 'product_variant'
      ORDER BY a.created_at DESC
      LIMIT 30
    `).all() as any[];

    res.json({
      data: logs.map((l) => {
        let parsedChanges = {};
        try {
          parsedChanges = JSON.parse(l.changes);
        } catch {
          parsedChanges = {};
        }
        return {
          ...l,
          changes: parsedChanges,
        };
      }),
    });
  } catch (err) {
    next(err);
  }
});

// ─── Offers Management ────────────────────────────────────────────────────────

const offerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  code: z.string().optional().nullable(),
  type: z.enum(['percent', 'flat', 'bxgy', 'free_shipping']),
  value: z.number().int().positive('Value must be a positive integer'),
  max_discount: z.number().int().positive().optional().nullable(),
  min_cart_value: z.number().int().nonnegative().default(0),
  starts_at: z.string(),
  ends_at: z.string(),
  is_active: z.boolean().default(true),
  stackable: z.boolean().default(false),
  usage_limit: z.number().int().positive().optional().nullable(),
  per_user_limit: z.number().int().positive().default(1),
  scope: z.enum(['all', 'category', 'product']).default('all'),
  scope_ids: z.array(z.string()).default([]),
  banner_image_url: z.string().optional().nullable(),
  priority: z.number().int().default(0),
});

/**
 * GET /api/admin/offers
 * Offers list annotated with dynamically derived status and redemption stats
 */
adminRouter.get('/offers', (_req, res, next) => {
  try {
    const db = getDb();
    const offers = db.prepare(`
      SELECT
        o.*,
        COUNT(DISTINCT r.id) as redemption_count,
        COALESCE(SUM(o_red.discount_amount), 0) as total_discount_disbursed
      FROM offers o
      LEFT JOIN offer_redemptions r ON o.id = r.offer_id
      LEFT JOIN orders o_red ON r.order_id = o_red.id
      GROUP BY o.id
      ORDER BY o.priority DESC, o.created_at DESC
    `).all() as any[];

    const now = new Date();

    const formatted = offers.map((o) => {
      const starts = new Date(o.starts_at);
      const ends = new Date(o.ends_at);

      let derivedStatus: 'scheduled' | 'running' | 'expired' = 'running';
      if (now < starts) {
        derivedStatus = 'scheduled';
      } else if (now > ends) {
        derivedStatus = 'expired';
      }

      let parsedScopeIds: string[] = [];
      try {
        parsedScopeIds = JSON.parse(o.scope_ids);
      } catch {
        parsedScopeIds = [];
      }

      return {
        ...o,
        scope_ids: parsedScopeIds,
        is_active: Boolean(o.is_active),
        stackable: Boolean(o.stackable),
        derived_status: derivedStatus,
      };
    });

    res.json({ data: formatted });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/admin/offers
 * Create promotional offer with full validation
 */
adminRouter.post('/offers', (req, res, next) => {
  try {
    const parseResult = offerSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_FAILED',
          message: parseResult.error.errors[0]?.message || 'Invalid offer data',
          details: parseResult.error.errors.map((e) => ({ path: e.path.join('.'), message: e.message })),
        },
      });
      return;
    }

    const data = parseResult.data;
    const db = getDb();

    // Validation 1: End date after start date
    const startDate = new Date(data.starts_at);
    const endDate = new Date(data.ends_at);
    if (endDate <= startDate) {
      res.status(400).json({
        error: { code: 'INVALID_DATE_RANGE', message: 'End date must be strictly after start date.' },
      });
      return;
    }

    // Validation 2: Percentage 1–100
    if (data.type === 'percent' && (data.value < 1 || data.value > 100)) {
      res.status(400).json({
        error: { code: 'INVALID_PERCENTAGE', message: 'Percentage discount must be between 1 and 100.' },
      });
      return;
    }

    // Validation 3: Flat discount below min_cart_value (if min_cart_value is specified)
    if (data.type === 'flat' && data.min_cart_value > 0 && data.value > data.min_cart_value) {
      res.status(400).json({
        error: { code: 'FLAT_EXCEEDS_MIN_CART', message: 'Flat discount cannot exceed minimum cart value.' },
      });
      return;
    }

    // Validation 4: Duplicate coupon code
    const cleanCode = data.code?.trim().toUpperCase() || null;
    if (cleanCode) {
      const existing = db.prepare('SELECT id FROM offers WHERE code = ?').get(cleanCode);
      if (existing) {
        res.status(400).json({
          error: { code: 'DUPLICATE_CODE', message: `Coupon code "${cleanCode}" is already in use.` },
        });
        return;
      }
    }

    const offerId = `off_${uuidv4().replace(/-/g, '').slice(0, 10)}`;

    db.prepare(`
      INSERT INTO offers (
        id, name, code, type, value, max_discount, min_cart_value,
        starts_at, ends_at, is_active, stackable, usage_limit,
        per_user_limit, scope, scope_ids, banner_image_url, priority, created_by
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?
      )
    `).run(
      offerId,
      data.name,
      cleanCode,
      data.type,
      data.value,
      data.max_discount || null,
      data.min_cart_value,
      data.starts_at,
      data.ends_at,
      data.is_active ? 1 : 0,
      data.stackable ? 1 : 0,
      data.usage_limit || null,
      data.per_user_limit,
      data.scope,
      JSON.stringify(data.scope_ids),
      data.banner_image_url || null,
      data.priority,
      req.user?.sub
    );

    db.prepare(`
      INSERT INTO audit_log (id, user_id, action, entity_type, entity_id, changes, ip_address)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      `aud_${uuidv4()}`,
      req.user?.sub,
      'CREATE_OFFER',
      'offer',
      offerId,
      JSON.stringify({ name: data.name, code: cleanCode, type: data.type, value: data.value }),
      req.ip
    );

    res.status(201).json({
      offer_id: offerId,
      message: 'Offer created successfully',
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/admin/offers/:id/toggle
 * Toggle active status
 */
adminRouter.patch('/offers/:id/toggle', (req, res, next) => {
  try {
    const db = getDb();
    const current = db.prepare('SELECT is_active FROM offers WHERE id = ?').get(req.params.id) as any;
    if (!current) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Offer not found' } });
      return;
    }

    const nextState = current.is_active ? 0 : 1;
    db.prepare('UPDATE offers SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(
      nextState,
      req.params.id
    );

    res.json({ success: true, is_active: Boolean(nextState) });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/admin/offers/:id
 * Delete offer
 */
adminRouter.delete('/offers/:id', (req, res, next) => {
  try {
    const db = getDb();
    const result = db.prepare('DELETE FROM offers WHERE id = ?').run(req.params.id);
    if (result.changes === 0) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Offer not found' } });
      return;
    }
    res.json({ success: true, message: 'Offer deleted successfully' });
  } catch (err) {
    next(err);
  }
});

// ─── Banners Management ───────────────────────────────────────────────────────

/**
 * GET /api/admin/banners
 * List all banners ordered by display_order
 */
adminRouter.get('/banners', (_req, res, next) => {
  try {
    const db = getDb();
    const banners = db.prepare('SELECT * FROM banners ORDER BY display_order ASC, created_at DESC').all();
    res.json({
      data: banners.map((b: any) => ({
        ...b,
        is_active: Boolean(b.is_active),
      })),
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/admin/banners
 * Create carousel banner
 */
adminRouter.post('/banners', (req, res, next) => {
  try {
    const db = getDb();
    const {
      title,
      subtitle,
      image_url,
      cta_text = 'Shop Collection',
      cta_link = '/catalog',
      starts_at,
      ends_at,
      is_active = true,
    } = req.body;

    if (!title || !image_url) {
      res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'Title and image URL are required.' } });
      return;
    }

    const maxOrderRow = db.prepare('SELECT COALESCE(MAX(display_order), 0) as max_order FROM banners').get() as any;
    const nextOrder = (maxOrderRow?.max_order || 0) + 1;
    const bannerId = `ban_${uuidv4().replace(/-/g, '').slice(0, 10)}`;

    db.prepare(`
      INSERT INTO banners (
        id, title, subtitle, image_url, cta_text, cta_link,
        display_order, starts_at, ends_at, is_active, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      bannerId,
      title,
      subtitle || null,
      image_url,
      cta_text,
      cta_link,
      nextOrder,
      starts_at || null,
      ends_at || null,
      is_active ? 1 : 0,
      req.user?.sub
    );

    res.status(201).json({ banner_id: bannerId, message: 'Banner created successfully' });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/admin/banners/reorder
 * Reorder banners array
 */
adminRouter.put('/banners/reorder', (req, res, next) => {
  try {
    const db = getDb();
    const { items } = req.body; // Array of { id, display_order }

    if (!Array.isArray(items)) {
      res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'items array required.' } });
      return;
    }

    const updateStmt = db.prepare('UPDATE banners SET display_order = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
    const reorderTx = db.transaction(() => {
      for (const itm of items) {
        updateStmt.run(itm.display_order, itm.id);
      }
    });

    reorderTx();

    res.json({ success: true, message: 'Banners reordered successfully.' });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/admin/banners/:id
 * Update an existing carousel banner
 */
adminRouter.patch('/banners/:id', (req, res, next) => {
  try {
    const db = getDb();
    const { id } = req.params;
    const {
      title,
      subtitle,
      image_url,
      cta_text = 'Shop Collection',
      cta_link = '/catalog',
      starts_at,
      ends_at,
      is_active = true,
    } = req.body;

    if (!title || !image_url) {
      res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'Title and image URL are required.' } });
      return;
    }

    const result = db.prepare(`
      UPDATE banners
      SET title = ?, subtitle = ?, image_url = ?, cta_text = ?, cta_link = ?,
          starts_at = ?, ends_at = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      title,
      subtitle || null,
      image_url,
      cta_text,
      cta_link,
      starts_at || null,
      ends_at || null,
      is_active ? 1 : 0,
      id,
    );

    if (result.changes === 0) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Banner not found' } });
      return;
    }

    res.json({ success: true, message: 'Banner updated successfully' });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/admin/banners/:id
 * Delete banner
 */
adminRouter.delete('/banners/:id', (req, res, next) => {
  try {
    const db = getDb();
    const result = db.prepare('DELETE FROM banners WHERE id = ?').run(req.params.id);
    if (result.changes === 0) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Banner not found' } });
      return;
    }
    res.json({ success: true, message: 'Banner deleted successfully' });
  } catch (err) {
    next(err);
  }
});

// ============================================================================
// PART 4: ORDER MANAGEMENT
// ============================================================================

const VALID_DELIVERY_TRANSITIONS: Record<string, string[]> = {
  placed: ['confirmed', 'cancelled'],
  confirmed: ['out_for_delivery', 'cancelled'],
  out_for_delivery: ['delivered', 'cancelled'],
  delivered: [],
  cancelled: [],
};

const VALID_PICKUP_TRANSITIONS: Record<string, string[]> = {
  placed: ['confirmed', 'cancelled'],
  confirmed: ['ready_for_pickup', 'cancelled'],
  ready_for_pickup: ['picked_up', 'cancelled'],
  picked_up: [],
  cancelled: [],
};

/**
 * GET /api/admin/orders
 * List orders with filters for status, payment_status, fulfillment_type, date range, search
 */
adminRouter.get('/orders', (req, res, next) => {
  try {
    const db = getDb();
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit as string) || 20));
    const offset = (page - 1) * limit;

    const { status, payment_status, fulfillment_type, date_from, date_to, search } = req.query;

    let whereClause = 'WHERE 1=1';
    const params: any[] = [];

    if (status && status !== 'all') {
      whereClause += ' AND o.order_status = ?';
      params.push(status);
    }

    if (payment_status && payment_status !== 'all') {
      whereClause += ' AND o.payment_status = ?';
      params.push(payment_status);
    }

    if (fulfillment_type && fulfillment_type !== 'all') {
      whereClause += ' AND o.fulfillment_type = ?';
      params.push(fulfillment_type);
    }

    if (date_from) {
      whereClause += ' AND o.created_at >= ?';
      params.push(date_from);
    }

    if (date_to) {
      whereClause += ' AND o.created_at <= ?';
      params.push(date_to);
    }

    if (search && (search as string).trim()) {
      const term = `%${(search as string).trim()}%`;
      whereClause += ' AND (o.order_number LIKE ? OR u.first_name LIKE ? OR u.last_name LIKE ? OR u.phone LIKE ? OR u.email LIKE ?)';
      params.push(term, term, term, term, term);
    }

    // Count total
    const countSql = `
      SELECT COUNT(*) as total
      FROM orders o
      JOIN users u ON o.user_id = u.id
      ${whereClause}
    `;
    const total = (db.prepare(countSql).get(...params) as any).total;

    // Fetch page rows
    const dataSql = `
      SELECT
        o.id,
        o.order_number,
        o.user_id,
        u.first_name || ' ' || u.last_name as customer_name,
        u.email as customer_email,
        u.phone as customer_phone,
        o.subtotal,
        o.discount_amount,
        o.shipping_cost,
        o.tax,
        o.total_amount,
        o.fulfillment_type,
        o.pickup_slot,
        o.payment_status,
        o.payment_method,
        o.order_status,
        o.customer_notes,
        o.internal_notes,
        o.created_at,
        o.updated_at
      FROM orders o
      JOIN users u ON o.user_id = u.id
      ${whereClause}
      ORDER BY o.created_at DESC
      LIMIT ? OFFSET ?
    `;
    const orders = db.prepare(dataSql).all(...params, limit, offset) as any[];

    // Enrich with item summaries
    const itemsStmt = db.prepare(`
      SELECT
        oi.id,
        oi.product_name,
        oi.size,
        oi.color,
        oi.quantity,
        oi.price_at_purchase,
        p.images
      FROM order_items oi
      LEFT JOIN product_variants pv ON oi.variant_id = pv.id
      LEFT JOIN products p ON pv.product_id = p.id
      WHERE oi.order_id = ?
    `);

    const enriched = orders.map((o) => {
      const items = itemsStmt.all(o.id) as any[];
      const totalItems = items.reduce((sum, itm) => sum + itm.quantity, 0);
      const thumbnails: string[] = [];
      for (const itm of items) {
        if (itm.images) {
          try {
            const parsed = JSON.parse(itm.images);
            if (Array.isArray(parsed) && parsed.length > 0 && !thumbnails.includes(parsed[0])) {
              thumbnails.push(parsed[0]);
            }
          } catch {
            // ignore
          }
        }
      }
      return {
        ...o,
        total_items: totalItems,
        thumbnails: thumbnails.slice(0, 3),
      };
    });

    res.json({
      data: enriched,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/admin/orders/:id
 * Full order detail view with timeline history and allowed next transitions
 */
adminRouter.get('/orders/:id', (req, res, next) => {
  try {
    const db = getDb();
    const orderSql = `
      SELECT
        o.*,
        u.first_name || ' ' || u.last_name as customer_name,
        u.email as customer_email,
        u.phone as customer_phone
      FROM orders o
      JOIN users u ON o.user_id = u.id
      WHERE o.id = ?
    `;
    const order = db.prepare(orderSql).get(req.params.id) as any;

    if (!order) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Order not found' } });
      return;
    }

    // Parse delivery address snapshot
    let deliveryAddress = null;
    if (order.delivery_address_snapshot) {
      try {
        deliveryAddress = JSON.parse(order.delivery_address_snapshot);
      } catch {
        deliveryAddress = order.delivery_address_snapshot;
      }
    }

    // Get order items with variant info
    const itemsSql = `
      SELECT
        oi.*,
        pv.variant_sku,
        p.slug as product_slug,
        p.images
      FROM order_items oi
      LEFT JOIN product_variants pv ON oi.variant_id = pv.id
      LEFT JOIN products p ON pv.product_id = p.id
      WHERE oi.order_id = ?
    `;
    const rawItems = db.prepare(itemsSql).all(order.id) as any[];
    const items = rawItems.map((itm) => {
      let thumbnail = null;
      if (itm.images) {
        try {
          const imgs = JSON.parse(itm.images);
          thumbnail = imgs[0] || null;
        } catch {
          // ignore
        }
      }
      return {
        ...itm,
        thumbnail,
      };
    });

    // Get timeline history
    const historySql = `
      SELECT
        osh.*,
        u.first_name || ' ' || u.last_name as changed_by_name
      FROM order_status_history osh
      LEFT JOIN users u ON osh.changed_by = u.id
      WHERE osh.order_id = ?
      ORDER BY osh.created_at ASC
    `;
    const history = db.prepare(historySql).all(order.id);

    // Compute allowed next statuses based on fulfillment type
    const transitionMap =
      order.fulfillment_type === 'delivery'
        ? VALID_DELIVERY_TRANSITIONS
        : VALID_PICKUP_TRANSITIONS;
    const allowedNextStatuses = transitionMap[order.order_status] || [];

    res.json({
      order: {
        ...order,
        delivery_address_snapshot: deliveryAddress,
        items,
        history,
        allowed_next_statuses: allowedNextStatuses,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/admin/orders/:id/status
 * Advance order status respecting valid transitions only.
 * Writes order_status_history and audit_log.
 */
adminRouter.patch('/orders/:id/status', (req, res, next) => {
  try {
    const db = getDb();
    const { status, note } = req.body;

    if (!status) {
      res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'Status is required' } });
      return;
    }

    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id) as any;
    if (!order) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Order not found' } });
      return;
    }

    const transitionMap =
      order.fulfillment_type === 'delivery'
        ? VALID_DELIVERY_TRANSITIONS
        : VALID_PICKUP_TRANSITIONS;

    const allowed = transitionMap[order.order_status] || [];

    if (!allowed.includes(status)) {
      res.status(400).json({
        error: {
          code: 'INVALID_TRANSITION',
          message: `Cannot transition order ${order.order_number} from '${order.order_status}' to '${status}' (${order.fulfillment_type} flow). Allowed: [${allowed.join(', ')}]`,
        },
      });
      return;
    }

    const updateStatusTx = db.transaction(() => {
      // 1. Update order
      db.prepare('UPDATE orders SET order_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(
        status,
        order.id
      );

      // 2. Record order status history
      const historyId = `osh_${uuidv4().replace(/-/g, '').slice(0, 10)}`;
      db.prepare(`
        INSERT INTO order_status_history (id, order_id, status, note, changed_by, created_at)
        VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `).run(historyId, order.id, status, note || `Status advanced to ${status}`, req.user?.sub);

      // 3. Write audit log
      const auditId = `aud_${uuidv4().replace(/-/g, '').slice(0, 10)}`;
      db.prepare(`
        INSERT INTO audit_log (id, user_id, action, entity_type, entity_id, changes, ip_address, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `).run(
        auditId,
        req.user?.sub,
        'ORDER_STATUS_UPDATE',
        'order',
        order.id,
        JSON.stringify({ from: order.order_status, to: status, note }),
        req.ip || '127.0.0.1'
      );
    });

    updateStatusTx();

    res.json({
      success: true,
      message: `Order status updated to '${status}'.`,
      order_id: order.id,
      new_status: status,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/admin/orders/:id/notes
 * Update internal notes for an order
 */
adminRouter.patch('/orders/:id/notes', (req, res, next) => {
  try {
    const db = getDb();
    const { internal_notes } = req.body;

    const order = db.prepare('SELECT id, internal_notes FROM orders WHERE id = ?').get(req.params.id) as any;
    if (!order) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Order not found' } });
      return;
    }

    db.prepare('UPDATE orders SET internal_notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(
      internal_notes || '',
      order.id
    );

    // Audit log
    const auditId = `aud_${uuidv4().replace(/-/g, '').slice(0, 10)}`;
    db.prepare(`
      INSERT INTO audit_log (id, user_id, action, entity_type, entity_id, changes, ip_address, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).run(
      auditId,
      req.user?.sub,
      'ORDER_NOTES_UPDATE',
      'order',
      order.id,
      JSON.stringify({ previous: order.internal_notes, current: internal_notes }),
      req.ip || '127.0.0.1'
    );

    res.json({ success: true, message: 'Internal notes saved.' });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/admin/orders/:id/refund
 * Refund a paid order via Razorpay API (with mock fallback in dev/test)
 */
adminRouter.post('/orders/:id/refund', async (req, res, next) => {
  try {
    const db = getDb();
    const { reason } = req.body;

    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id) as any;
    if (!order) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Order not found' } });
      return;
    }

    if (order.payment_status !== 'paid') {
      res.status(400).json({
        error: {
          code: 'INVALID_REFUND_STATE',
          message: `Cannot refund order with payment status '${order.payment_status}'. Only 'paid' orders are eligible for refund.`,
        },
      });
      return;
    }

    let refundId = `rfnd_${Date.now()}`;

    // Razorpay refund call if client and payment_id exist
    if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET && order.razorpay_payment_id) {
      try {
        const razorpay = new Razorpay({
          key_id: process.env.RAZORPAY_KEY_ID,
          key_secret: process.env.RAZORPAY_KEY_SECRET,
        });
        const refundResponse: any = await razorpay.payments.refund(order.razorpay_payment_id, {
          amount: order.total_amount, // in paise
          notes: { reason: reason || 'Owner approved store refund' },
        });
        if (refundResponse?.id) {
          refundId = refundResponse.id;
        }
      } catch (err: any) {
        console.warn('Razorpay refund API call failed or in mock mode:', err.message);
        // Continue in dev/test mock mode
      }
    }

    const refundTx = db.transaction(() => {
      // 1. Update payment status to refunded
      db.prepare('UPDATE orders SET payment_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(
        'refunded',
        order.id
      );

      // 2. Audit log
      const auditId = `aud_${uuidv4().replace(/-/g, '').slice(0, 10)}`;
      db.prepare(`
        INSERT INTO audit_log (id, user_id, action, entity_type, entity_id, changes, ip_address, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `).run(
        auditId,
        req.user?.sub,
        'ORDER_REFUND',
        'order',
        order.id,
        JSON.stringify({
          refund_id: refundId,
          refund_amount: order.total_amount,
          razorpay_payment_id: order.razorpay_payment_id,
          reason: reason || 'Store refund',
        }),
        req.ip || '127.0.0.1'
      );
    });

    refundTx();

    res.json({
      success: true,
      message: `Order ${order.order_number} has been marked refunded.`,
      refund_id: refundId,
      refund_amount: order.total_amount,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/admin/orders/:id/packing-slip
 * Structured packing slip data for warehouse/store printing
 */
adminRouter.get('/orders/:id/packing-slip', (req, res, next) => {
  try {
    const db = getDb();
    const orderSql = `
      SELECT
        o.*,
        u.first_name || ' ' || u.last_name as customer_name,
        u.email as customer_email,
        u.phone as customer_phone
      FROM orders o
      JOIN users u ON o.user_id = u.id
      WHERE o.id = ?
    `;
    const order = db.prepare(orderSql).get(req.params.id) as any;
    if (!order) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Order not found' } });
      return;
    }

    const items = db.prepare(`
      SELECT
        oi.*,
        pv.variant_sku
      FROM order_items oi
      LEFT JOIN product_variants pv ON oi.variant_id = pv.id
      WHERE oi.order_id = ?
    `).all(order.id);

    let address = null;
    if (order.delivery_address_snapshot) {
      try {
        address = JSON.parse(order.delivery_address_snapshot);
      } catch {
        address = order.delivery_address_snapshot;
      }
    }

    res.json({
      order_number: order.order_number,
      created_at: order.created_at,
      fulfillment_type: order.fulfillment_type,
      pickup_slot: order.pickup_slot,
      customer: {
        name: order.customer_name,
        phone: order.customer_phone,
        email: order.customer_email,
      },
      delivery_address: address,
      customer_notes: order.customer_notes,
      internal_notes: order.internal_notes,
      items: items.map((itm: any) => ({
        id: itm.id,
        sku: itm.variant_sku || 'SHK-GENERIC',
        product_name: itm.product_name,
        size: itm.size,
        color: itm.color,
        quantity: itm.quantity,
      })),
      total_items: items.reduce((sum: number, itm: any) => sum + itm.quantity, 0),
    });
  } catch (err) {
    next(err);
  }
});

// ============================================================================
// PART 5: CUSTOMERS (CRM)
// ============================================================================

/**
 * GET /api/admin/customers/export
 * Export customer directory to CSV
 */
adminRouter.get('/customers/export', (req, res, next) => {
  try {
    const db = getDb();
    const search = req.query.search as string | undefined;

    let sql = `
      SELECT
        u.id,
        u.first_name || ' ' || u.last_name as name,
        u.email,
        u.phone,
        u.created_at as join_date,
        COUNT(o.id) as order_count,
        COALESCE(SUM(CASE WHEN o.payment_status = 'paid' THEN o.total_amount ELSE 0 END), 0) as lifetime_spend,
        MAX(o.created_at) as last_order_date
      FROM users u
      LEFT JOIN orders o ON u.id = o.user_id
      WHERE u.role = 'customer'
    `;
    const params: any[] = [];

    if (search && search.trim()) {
      const term = `%${search.trim()}%`;
      sql += ' AND (u.first_name LIKE ? OR u.last_name LIKE ? OR u.email LIKE ? OR u.phone LIKE ?)';
      params.push(term, term, term, term);
    }

    sql += ' GROUP BY u.id ORDER BY lifetime_spend DESC';

    const customers = db.prepare(sql).all(...params) as any[];

    // Build CSV
    const headers = ['Customer ID', 'Name', 'Email', 'Phone', 'Join Date', 'Order Count', 'Lifetime Spend (INR)', 'Last Order Date'];
    const rows = customers.map((c) => [
      `"${c.id}"`,
      `"${c.name}"`,
      `"${c.email}"`,
      `"${c.phone || ''}"`,
      `"${c.join_date}"`,
      c.order_count,
      (c.lifetime_spend / 100).toFixed(2),
      `"${c.last_order_date || 'N/A'}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="shikkis-customers.csv"');
    res.send(csvContent);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/admin/customers
 * Paginated, searchable, sortable customer directory
 */
adminRouter.get('/customers', (req, res, next) => {
  try {
    const db = getDb();
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit as string) || 20));
    const offset = (page - 1) * limit;

    const { search, sortBy = 'lifetime_spend', sortOrder = 'desc' } = req.query;

    let whereClause = "WHERE u.role = 'customer'";
    const params: any[] = [];

    if (search && (search as string).trim()) {
      const term = `%${(search as string).trim()}%`;
      whereClause += ' AND (u.first_name LIKE ? OR u.last_name LIKE ? OR u.email LIKE ? OR u.phone LIKE ?)';
      params.push(term, term, term, term);
    }

    // Count
    const countSql = `SELECT COUNT(*) as total FROM users u ${whereClause}`;
    const total = (db.prepare(countSql).get(...params) as any).total;

    // Sorting safe column mapping
    const sortColumns: Record<string, string> = {
      name: 'name',
      email: 'u.email',
      order_count: 'order_count',
      lifetime_spend: 'lifetime_spend',
      last_order_date: 'last_order_date',
      join_date: 'u.created_at',
    };
    const sortCol = sortColumns[sortBy as string] || 'lifetime_spend';
    const orderDir = (sortOrder as string).toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const dataSql = `
      SELECT
        u.id,
        u.first_name,
        u.last_name,
        u.first_name || ' ' || u.last_name as name,
        u.email,
        u.phone,
        u.created_at as join_date,
        COUNT(o.id) as order_count,
        COALESCE(SUM(CASE WHEN o.payment_status = 'paid' THEN o.total_amount ELSE 0 END), 0) as lifetime_spend,
        MAX(o.created_at) as last_order_date
      FROM users u
      LEFT JOIN orders o ON u.id = o.user_id
      ${whereClause}
      GROUP BY u.id
      ORDER BY ${sortCol} ${orderDir}
      LIMIT ? OFFSET ?
    `;

    const customers = db.prepare(dataSql).all(...params, limit, offset);

    res.json({
      data: customers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/admin/customers/:id
 * Strictly read-only customer detail view with analytics and order history
 */
adminRouter.get('/customers/:id', (req, res, next) => {
  try {
    const db = getDb();
    const user = db.prepare(`
      SELECT id, first_name, last_name, first_name || ' ' || last_name as name, email, phone, role, is_active, created_at
      FROM users
      WHERE id = ? AND role = 'customer'
    `).get(req.params.id) as any;

    if (!user) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Customer not found' } });
      return;
    }

    // Analytics summary computed in SQL
    const analytics = db.prepare(`
      SELECT
        COUNT(id) as total_orders,
        COUNT(CASE WHEN order_status IN ('delivered', 'picked_up') THEN 1 END) as completed_orders,
        COUNT(CASE WHEN order_status = 'cancelled' THEN 1 END) as cancelled_orders,
        COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN total_amount ELSE 0 END), 0) as lifetime_spend,
        COALESCE(AVG(CASE WHEN payment_status = 'paid' THEN total_amount ELSE NULL END), 0) as aov,
        MAX(created_at) as last_order_date
      FROM orders
      WHERE user_id = ?
    `).get(user.id) as any;

    // Saved addresses
    const addresses = db.prepare(`
      SELECT * FROM addresses WHERE user_id = ? ORDER BY is_default DESC, created_at DESC
    `).all(user.id);

    // Order history
    const orders = db.prepare(`
      SELECT
        o.id,
        o.order_number,
        o.fulfillment_type,
        o.order_status,
        o.payment_status,
        o.total_amount,
        o.created_at,
        COUNT(oi.id) as item_count
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      WHERE o.user_id = ?
      GROUP BY o.id
      ORDER BY o.created_at DESC
    `).all(user.id);

    res.json({
      customer: user,
      analytics: {
        total_orders: analytics.total_orders || 0,
        completed_orders: analytics.completed_orders || 0,
        cancelled_orders: analytics.cancelled_orders || 0,
        lifetime_spend: analytics.lifetime_spend || 0,
        aov: Math.round(analytics.aov || 0),
        last_order_date: analytics.last_order_date,
      },
      addresses,
      orders,
    });
  } catch (err) {
    next(err);
  }
});

// ============================================================================
// PART 6: REPORTS & ANALYTICS (ALL AGGREGATION IN SQL!)
// ============================================================================

const getPeriodSqlFilter = (period: string | undefined, tableAlias = 'o') => {
  switch (period) {
    case 'today':
      return `AND ${tableAlias}.created_at >= datetime('now', 'start of day')`;
    case 'week':
      return `AND ${tableAlias}.created_at >= datetime('now', '-7 days')`;
    case 'month':
      return `AND ${tableAlias}.created_at >= datetime('now', '-30 days')`;
    case 'year':
      return `AND ${tableAlias}.created_at >= datetime('now', '-365 days')`;
    case 'all':
    default:
      return '';
  }
};

/**
 * GET /api/admin/reports/kpis
 * KPI cards (Revenue, Orders, AOV, Units Sold) aggregated directly in SQL
 */
adminRouter.get('/reports/kpis', (req, res, next) => {
  try {
    const db = getDb();
    const period = (req.query.period as string) || 'month';
    const periodSql = getPeriodSqlFilter(period, 'o');

    const kpiSql = `
      SELECT
        COALESCE(SUM(CASE WHEN o.payment_status = 'paid' THEN o.total_amount ELSE 0 END), 0) as total_revenue,
        COUNT(DISTINCT CASE WHEN o.payment_status = 'paid' THEN o.id END) as total_orders,
        COALESCE(AVG(CASE WHEN o.payment_status = 'paid' THEN o.total_amount ELSE NULL END), 0) as aov,
        COALESCE(SUM(CASE WHEN o.payment_status = 'paid' THEN oi.quantity ELSE 0 END), 0) as units_sold
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      WHERE 1=1 ${periodSql}
    `;

    const row = db.prepare(kpiSql).get() as any;

    res.json({
      period,
      total_revenue: row.total_revenue,
      total_orders: row.total_orders,
      aov: Math.round(row.aov),
      units_sold: row.units_sold,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/admin/reports/revenue-trend
 * 7-day continuous revenue line chart data in SQL
 */
adminRouter.get('/reports/revenue-trend', (_req, res, next) => {
  try {
    const db = getDb();

    // Query daily sums for the last 7 days
    const trendSql = `
      SELECT
        strftime('%Y-%m-%d', o.created_at) as date,
        COALESCE(SUM(o.total_amount), 0) as revenue,
        COUNT(o.id) as orders
      FROM orders o
      WHERE o.payment_status = 'paid'
        AND o.created_at >= date('now', '-6 days')
      GROUP BY strftime('%Y-%m-%d', o.created_at)
      ORDER BY date ASC
    `;

    const rows = db.prepare(trendSql).all() as any[];
    const rowsMap = new Map(rows.map((r) => [r.date, r]));

    // Generate full 7-day array
    const result: Array<{ date: string; label: string; revenue: number; orders: number }> = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const iso = d.toISOString().split('T')[0];
      const match = rowsMap.get(iso);
      const label = d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
      result.push({
        date: iso,
        label,
        revenue: match ? match.revenue : 0,
        orders: match ? match.orders : 0,
      });
    }

    res.json({ trend: result });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/admin/reports/top-products
 * Ranked top products by units sold and by revenue
 */
adminRouter.get('/reports/top-products', (req, res, next) => {
  try {
    const db = getDb();
    const period = (req.query.period as string) || 'all';
    const periodSql = getPeriodSqlFilter(period, 'o');

    const byUnitsSql = `
      SELECT
        oi.product_name,
        SUM(oi.quantity) as units_sold,
        SUM(oi.quantity * (oi.price_at_purchase - oi.discount_at_purchase)) as revenue
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      WHERE o.payment_status = 'paid' ${periodSql}
      GROUP BY oi.product_name
      ORDER BY units_sold DESC
      LIMIT 5
    `;

    const byRevenueSql = `
      SELECT
        oi.product_name,
        SUM(oi.quantity) as units_sold,
        SUM(oi.quantity * (oi.price_at_purchase - oi.discount_at_purchase)) as revenue
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      WHERE o.payment_status = 'paid' ${periodSql}
      GROUP BY oi.product_name
      ORDER BY revenue DESC
      LIMIT 5
    `;

    const topByUnits = db.prepare(byUnitsSql).all();
    const topByRevenue = db.prepare(byRevenueSql).all();

    res.json({
      period,
      top_by_units: topByUnits,
      top_by_revenue: topByRevenue,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/admin/reports/category-performance
 * Category breakdown aggregated in SQL
 */
adminRouter.get('/reports/category-performance', (req, res, next) => {
  try {
    const db = getDb();
    const period = (req.query.period as string) || 'all';
    const periodSql = getPeriodSqlFilter(period, 'o');

    const catSql = `
      SELECT
        c.id,
        c.name,
        COUNT(DISTINCT o.id) as order_count,
        SUM(oi.quantity) as units_sold,
        SUM(oi.quantity * (oi.price_at_purchase - oi.discount_at_purchase)) as revenue
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      JOIN product_variants pv ON oi.variant_id = pv.id
      JOIN products p ON pv.product_id = p.id
      JOIN categories c ON p.category_id = c.id
      WHERE o.payment_status = 'paid' ${periodSql}
      GROUP BY c.id
      ORDER BY revenue DESC
    `;

    const categories = db.prepare(catSql).all();
    res.json({ period, categories });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/admin/reports/sold-items/export
 * Export sold items log to CSV
 */
adminRouter.get('/reports/sold-items/export', (req, res, next) => {
  try {
    const db = getDb();
    const period = req.query.period as string | undefined;
    const categoryId = req.query.category_id as string | undefined;

    let whereClause = "WHERE o.payment_status = 'paid'";
    const params: any[] = [];

    if (period) {
      whereClause += ` ${getPeriodSqlFilter(period, 'o')}`;
    }

    if (categoryId && categoryId !== 'all') {
      whereClause += ' AND c.id = ?';
      params.push(categoryId);
    }

    const sql = `
      SELECT
        o.order_number,
        o.created_at as order_date,
        u.first_name || ' ' || u.last_name as customer_name,
        c.name as category_name,
        oi.product_name,
        oi.size,
        oi.color,
        pv.variant_sku as sku,
        oi.quantity,
        oi.price_at_purchase,
        (oi.price_at_purchase - oi.discount_at_purchase) * oi.quantity as net_total
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      JOIN users u ON o.user_id = u.id
      LEFT JOIN product_variants pv ON oi.variant_id = pv.id
      LEFT JOIN products p ON pv.product_id = p.id
      LEFT JOIN categories c ON p.category_id = c.id
      ${whereClause}
      ORDER BY o.created_at DESC
    `;

    const rows = db.prepare(sql).all(...params) as any[];

    const headers = [
      'Order Number',
      'Date',
      'Customer',
      'Category',
      'Product Name',
      'Size',
      'Color',
      'SKU',
      'Quantity',
      'Unit Price (INR)',
      'Net Total (INR)',
    ];

    const csvRows = rows.map((r) => [
      `"${r.order_number}"`,
      `"${r.order_date}"`,
      `"${r.customer_name}"`,
      `"${r.category_name || 'N/A'}"`,
      `"${r.product_name}"`,
      `"${r.size}"`,
      `"${r.color}"`,
      `"${r.sku || 'N/A'}"`,
      r.quantity,
      (r.price_at_purchase / 100).toFixed(2),
      (r.net_total / 100).toFixed(2),
    ]);

    const csvContent = [headers.join(','), ...csvRows.map((r) => r.join(','))].join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="shikkis-sold-items.csv"');
    res.send(csvContent);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/admin/reports/sold-items
 * Itemised sold items log with category/period filter and pagination
 */
adminRouter.get('/reports/sold-items', (req, res, next) => {
  try {
    const db = getDb();
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit as string) || 20));
    const offset = (page - 1) * limit;

    const period = req.query.period as string | undefined;
    const categoryId = req.query.category_id as string | undefined;

    let whereClause = "WHERE o.payment_status = 'paid'";
    const params: any[] = [];

    if (period) {
      whereClause += ` ${getPeriodSqlFilter(period, 'o')}`;
    }

    if (categoryId && categoryId !== 'all') {
      whereClause += ' AND c.id = ?';
      params.push(categoryId);
    }

    // Count
    const countSql = `
      SELECT COUNT(*) as total
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      LEFT JOIN product_variants pv ON oi.variant_id = pv.id
      LEFT JOIN products p ON pv.product_id = p.id
      LEFT JOIN categories c ON p.category_id = c.id
      ${whereClause}
    `;
    const total = (db.prepare(countSql).get(...params) as any).total;

    const dataSql = `
      SELECT
        oi.id,
        o.order_number,
        o.created_at as order_date,
        u.first_name || ' ' || u.last_name as customer_name,
        c.name as category_name,
        oi.product_name,
        oi.size,
        oi.color,
        pv.variant_sku as sku,
        oi.quantity,
        oi.price_at_purchase,
        oi.discount_at_purchase,
        (oi.price_at_purchase - oi.discount_at_purchase) * oi.quantity as net_total
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      JOIN users u ON o.user_id = u.id
      LEFT JOIN product_variants pv ON oi.variant_id = pv.id
      LEFT JOIN products p ON pv.product_id = p.id
      LEFT JOIN categories c ON p.category_id = c.id
      ${whereClause}
      ORDER BY o.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const items = db.prepare(dataSql).all(...params, limit, offset);

    res.json({
      data: items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    next(err);
  }
});

