import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import db from './client.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Initializes the SQLite database schema by reading and executing schema.sql.
 * Safe to call repeatedly due to CREATE TABLE IF NOT EXISTS / CREATE INDEX IF NOT EXISTS.
 */
import bcrypt from 'bcryptjs';

export function initSchema(): void {
  let schemaPath = path.resolve(__dirname, 'schema.sql');
  if (!fs.existsSync(schemaPath)) {
    schemaPath = path.resolve(__dirname, '../../../src/db/schema.sql');
  }
  if (!fs.existsSync(schemaPath)) {
    schemaPath = path.resolve(__dirname, '../../src/db/schema.sql');
  }
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');
  db.exec(schemaSql);

  seedIfEmpty();
}

function seedIfEmpty(): void {
  try {
    const userCount = (db.prepare('SELECT COUNT(*) as cnt FROM users').get() as any)?.cnt || 0;
    if (userCount > 0) return;

    console.log('🌱 Empty database detected. Seeding default admin, categories, banners & products...');

    // 1. Owner account
    const ownerHash = bcrypt.hashSync('Owner123!', 10);
    db.prepare(`
      INSERT INTO users (id, email, password_hash, first_name, last_name, phone, role, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1)
    `).run('usr_owner_01', 'owner@shikkis.com', ownerHash, 'Shikkis', 'Owner', '+919876543210', 'owner');

    // 2. Categories
    const categories = [
      { id: 'cat_sarees', name: 'Sarees', slug: 'sarees', description: 'Handcrafted Varanasi & Kanjeevaram silk sarees' },
      { id: 'cat_lehengas', name: 'Lehengas', slug: 'lehengas', description: 'Designer bridal & festive lehengas' },
      { id: 'cat_kurtas', name: 'Kurtas & Suits', slug: 'kurtas', description: 'Traditional & contemporary kurta sets' },
      { id: 'cat_sherwanis', name: 'Sherwanis', slug: 'sherwanis', description: 'Regal groom & festive sherwanis' },
      { id: 'cat_accessories', name: 'Accessories', slug: 'accessories', description: 'Dupattas, jewelry & royal accessories' },
    ];
    const catStmt = db.prepare('INSERT OR IGNORE INTO categories (id, name, slug, description, display_order) VALUES (?, ?, ?, ?, ?)');
    categories.forEach((c, i) => catStmt.run(c.id, c.name, c.slug, c.description, i + 1));

    // 3. Hero Banners
    const banners = [
      {
        id: 'ban_01',
        title: 'The Royal Weaves of Varanasi',
        subtitle: 'Handcrafted Silk Sarees & Heritage Zari Craftsmanship',
        image_url: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?q=80&w=1600&auto=format&fit=crop',
        cta_text: 'Explore Sarees',
        cta_link: '/catalog?category=sarees',
        display_order: 1
      },
      {
        id: 'ban_02',
        title: 'Bespoke Festive Elegance',
        subtitle: 'Scarlet Bridal Lehengas & Hand-Embroidered Anarkalis',
        image_url: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?q=80&w=1600&auto=format&fit=crop',
        cta_text: 'Shop Festive Edit',
        cta_link: '/catalog?occasion=Festive',
        display_order: 2
      },
      {
        id: 'ban_03',
        title: 'Regal Heritage for Men',
        subtitle: 'Hand-woven Raw Silk Sherwanis & Bandhgalas',
        image_url: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?q=80&w=1600&auto=format&fit=crop',
        cta_text: 'Shop Men\'s Collection',
        cta_link: '/catalog?gender=men',
        display_order: 3
      }
    ];
    const banStmt = db.prepare('INSERT OR IGNORE INTO banners (id, title, subtitle, image_url, cta_text, cta_link, display_order, is_active, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)');
    banners.forEach((b) => banStmt.run(b.id, b.title, b.subtitle, b.image_url, b.cta_text, b.cta_link, b.display_order, 'usr_owner_01'));

    // 4. Sample Products
    const prdStmt = db.prepare(`
      INSERT OR IGNORE INTO products (id, name, slug, description, category_id, gender, price, sale_price, sku, is_active, is_featured, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1, 'usr_owner_01')
    `);
    const varStmt = db.prepare(`
      INSERT OR IGNORE INTO product_variants (id, product_id, sku, size, color, stock, price, sale_price)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const products = [
      {
        id: 'prd_01',
        name: 'Varanasi Zari Brocade Silk Saree',
        slug: 'varanasi-zari-brocade-silk-saree',
        desc: 'Handcrafted pure Katan silk saree with gold kadwa zari weave.',
        cat: 'cat_sarees',
        gender: 'women',
        price: 2499900,
        sale: 2199900,
        sku: 'SAR-VAR-001',
        size: 'Free Size',
        color: 'Crimson Red'
      },
      {
        id: 'prd_02',
        name: 'Scarlet Red Zardosi Bridal Lehenga',
        slug: 'scarlet-red-zardosi-bridal-lehenga',
        desc: 'Velvet lehenga with heavy metallic zardosi embroidery and double dupatta.',
        cat: 'cat_lehengas',
        gender: 'women',
        price: 8999900,
        sale: 7999900,
        sku: 'LEH-RED-001',
        size: 'M',
        color: 'Ruby Red'
      },
      {
        id: 'prd_03',
        name: 'Royal Raw Silk Sherwani in Royal Blue',
        slug: 'royal-raw-silk-sherwani-blue',
        desc: 'Hand-embroidered raw silk sherwani paired with churidar and stolen dupatta.',
        cat: 'cat_sherwanis',
        gender: 'men',
        price: 4599900,
        sale: 3999900,
        sku: 'SHR-BLU-001',
        size: '40',
        color: 'Royal Blue'
      }
    ];

    products.forEach((p) => {
      prdStmt.run(p.id, p.name, p.slug, p.desc, p.cat, p.gender, p.price, p.sale, p.sku);
      varStmt.run(`var_${p.id}_1`, p.id, `${p.sku}-V1`, p.size, p.color, 15, p.price, p.sale);
    });

    console.log('✅ Default Database Seeding Complete!');
  } catch (err) {
    console.error('Error auto-seeding database:', err);
  }
}

export default initSchema;
