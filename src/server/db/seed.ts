import db from './index.ts';
import initSchema from './schema.ts';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

export async function seedDatabase() {
  initSchema();

  console.log('Seeding Shikkis database...');

  // 1. Seed Owner Account
  const ownerPasswordHash = await bcrypt.hash('OwnerSecret123!', 10);
  const ownerStmt = db.prepare(`
    INSERT OR REPLACE INTO users (id, email, password_hash, full_name, phone, role)
    VALUES (?, ?, ?, ?, ?, 'owner')
  `);
  ownerStmt.run(uuidv4(), 'admin@shikkis.in', ownerPasswordHash, 'Shikki Administrator', '9876543210');

  // Seed Test Customer Account
  const customerPasswordHash = await bcrypt.hash('Customer123!', 10);
  const customerStmt = db.prepare(`
    INSERT OR REPLACE INTO users (id, email, password_hash, full_name, phone, role)
    VALUES (?, ?, ?, ?, ?, 'customer')
  `);
  customerStmt.run(uuidv4(), 'customer@shikkis.in', customerPasswordHash, 'Aarav Sharma', '9123456789');

  // 2. Clear old catalog & seed Categories
  db.exec(`
    DELETE FROM cart_items;
    DELETE FROM carts;
    DELETE FROM order_items;
    DELETE FROM orders;
    DELETE FROM product_images;
    DELETE FROM product_variants;
    DELETE FROM products;
    DELETE FROM categories;
    DELETE FROM banners;
  `);

  const categories = [
    { id: 'cat-women-sarees', name: 'Heritage Sarees', slug: 'heritage-sarees', gender: 'women', description: 'Banarasi, Kanjeevaram & Handcrafted Silk Sarees' },
    { id: 'cat-women-lehengas', name: 'Fusion Lehengas', slug: 'fusion-lehengas', gender: 'women', description: 'Contemporary & Royal Wedding Couture' },
    { id: 'cat-women-suits', name: 'Anarkalis & Suits', slug: 'anarkalis-suits', gender: 'women', description: 'Regal Silk & Chikankari Kurta Sets' },
    { id: 'cat-men-kurtas', name: 'Silk Kurtas', slug: 'silk-kurtas', gender: 'men', description: 'Artisanal Handwoven Men\'s Kurtas' },
    { id: 'cat-men-sherwanis', name: 'Sherwanis & Bandhgalas', slug: 'sherwanis-bandhgalas', gender: 'men', description: 'Groom & Ceremonial Heritage Wear' },
    { id: 'cat-men-jackets', name: 'Nehru Jackets', slug: 'nehru-jackets', gender: 'men', description: 'Bespoke Silk & Velvet Layering' },
  ];

  const insertCategoryStmt = db.prepare(`
    INSERT INTO categories (id, name, slug, gender, description) VALUES (?, ?, ?, ?, ?)
  `);

  for (const c of categories) {
    insertCategoryStmt.run(c.id, c.name, c.slug, c.gender, c.description);
  }

  // 3. Seed Products
  const productsData = [
    {
      id: 'prod-crimson-saree',
      title: 'Imperial Crimson Banarasi Zardozi Saree',
      slug: 'imperial-crimson-banarasi-zardozi-saree',
      categoryId: 'cat-women-sarees',
      description: 'Handcrafted in pure Katan Silk, featuring opulent antique gold zari bootis and intricate border filigree woven by master artisans of Varanasi.',
      fabric: '100% Pure Katan Silk',
      craft: 'Banarasi Zardozi & Handloom Weave',
      pricePaise: 2499900, // ₹24,999
      discountPricePaise: 2199900, // ₹21,999
      isFeatured: 1,
      images: [
        'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&w=800&q=80'
      ]
    },
    {
      id: 'prod-gold-lehenga',
      title: 'Royal Ivory & Gold Gota Patti Lehenga',
      slug: 'royal-ivory-gold-gota-patti-lehenga',
      categoryId: 'cat-women-lehengas',
      description: 'Sculpted raw silk lehenga with hand-embellished Gota Patti artwork, voluminous kali flare, and a net dupatta framed with velvet borders.',
      fabric: 'Raw Silk & Dupion Silk',
      craft: 'Mathura Gota Patti & Dabka Work',
      pricePaise: 3899900, // ₹38,999
      discountPricePaise: 3499900, // ₹34,999
      isFeatured: 1,
      images: [
        'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=800&q=80'
      ]
    },
    {
      id: 'prod-ruby-anarkali',
      title: 'Deep Ruby Silk Velvet Anarkali Set',
      slug: 'deep-ruby-silk-velvet-anarkali-set',
      categoryId: 'cat-women-suits',
      description: 'Regal velvet floor-length Anarkali adorned with antique gold tilla embroidery along the sweetheart neckline and cuff wrists.',
      fabric: 'Micro Velvet & Organza',
      craft: 'Kashmiri Tilla & Aari Embroidery',
      pricePaise: 1899900, // ₹18,999
      discountPricePaise: 1649900, // ₹16,499
      isFeatured: 1,
      images: [
        'https://images.unsplash.com/photo-1609357605129-26f69add5d6e?auto=format&fit=crop&w=800&q=80'
      ]
    },
    {
      id: 'prod-emerald-kurta-men',
      title: 'Emerald Silk Tussar Kurta with Churidar',
      slug: 'emerald-silk-tussar-kurta-churidar',
      categoryId: 'cat-men-kurtas',
      description: 'Hand-woven Tussar silk kurta tailored with a tailored mandarin collar, concealed button placket, and subtle zari piping detail.',
      fabric: 'Raw Tussar Silk',
      craft: 'Handloom Weave & Zari Piping',
      pricePaise: 899900, // ₹8,999
      discountPricePaise: 749900, // ₹7,499
      isFeatured: 1,
      images: [
        'https://images.unsplash.com/photo-1622122201714-77da0ca8e5d2?auto=format&fit=crop&w=800&q=80'
      ]
    },
    {
      id: 'prod-royal-sherwani',
      title: 'Bespoke Pearl Ivory & Gold Heritage Sherwani',
      slug: 'bespoke-pearl-ivory-gold-heritage-sherwani',
      categoryId: 'cat-men-sherwanis',
      description: 'Structural grooms sherwani encrusted with intricate threadwork and Marodi gold embroidery, accompanied by an embroidered stolen sash.',
      fabric: 'Heritage Raw Silk',
      craft: 'Marodi & Zardozi Hand Crafting',
      pricePaise: 4599900, // ₹45,999
      discountPricePaise: 4199900, // ₹41,999
      isFeatured: 1,
      images: [
        'https://images.unsplash.com/photo-1597983073493-88cd35cf03b0?auto=format&fit=crop&w=800&q=80'
      ]
    },
    {
      id: 'prod-nehru-jacket',
      title: 'Midnight Burgundy Velvet Brocade Nehru Jacket',
      slug: 'midnight-burgundy-velvet-brocade-nehru-jacket',
      categoryId: 'cat-men-jackets',
      description: 'Sophisticated Nehru jacket crafted from handloom brocade silk velvet with custom gold crest metal buttons.',
      fabric: 'Silk Brocade Velvet',
      craft: 'Woven Jacquard Brocade',
      pricePaise: 1199900, // ₹11,999
      discountPricePaise: null,
      isFeatured: 0,
      images: [
        'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=800&q=80'
      ]
    }
  ];

  const insertProductStmt = db.prepare(`
    INSERT INTO products (id, title, slug, category_id, description, fabric, craft, price_paise, discount_price_paise, is_featured, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
  `);

  const insertVariantStmt = db.prepare(`
    INSERT INTO product_variants (id, product_id, size, color, stock_quantity, sku)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const insertImageStmt = db.prepare(`
    INSERT INTO product_images (id, product_id, image_url, alt_text, is_primary, display_order)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const sizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL'] as const;

  for (const p of productsData) {
    insertProductStmt.run(
      p.id,
      p.title,
      p.slug,
      p.categoryId,
      p.description,
      p.fabric,
      p.craft,
      p.pricePaise,
      p.discountPricePaise,
      p.isFeatured
    );

    // Insert Images
    p.images.forEach((imgUrl, idx) => {
      insertImageStmt.run(uuidv4(), p.id, imgUrl, p.title, idx === 0 ? 1 : 0, idx);
    });

    // Insert Variants
    sizes.forEach((sz) => {
      insertVariantStmt.run(
        uuidv4(),
        p.id,
        sz,
        p.id.includes('crimson') ? 'Crimson Red' : p.id.includes('gold') ? 'Ivory Gold' : p.id.includes('emerald') ? 'Emerald Green' : 'Royal Burgundy',
        15,
        `SKU-${p.id.substring(5).toUpperCase()}-${sz}`
      );
    });
  }

  // 4. Seed Banners
  const insertBannerStmt = db.prepare(`
    INSERT INTO banners (id, title, subtitle, cta_text, cta_link, badge_text, is_active)
    VALUES (?, ?, ?, ?, ?, ?, 1)
  `);

  insertBannerStmt.run(
    'banner-festive-hero',
    'The Heritage Festive Collection \'26',
    'Exquisite Handcrafted Indian & Fusion Couture for Weddings and Celebrations',
    'Explore Collection',
    '/catalog',
    'FESTIVE OFFER — FLAT 15% OFF WITH CODE: SHIKKIS15'
  );

  console.log('Database seeded successfully!');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  seedDatabase().catch((err) => {
    console.error('Failed to seed database:', err);
    process.exit(1);
  });
}
