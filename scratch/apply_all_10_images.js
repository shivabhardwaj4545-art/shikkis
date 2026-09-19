import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import pkg from 'pg';

dotenv.config({ path: path.resolve('apps/backend/.env') });

const { Pool } = pkg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:Shiva@123@localhost:5432/shikkis',
});

const userUploadedDir = 'C:\\Users\\shiva\\.gemini\\antigravity-ide\\brain\\74a30b79-6860-40e4-ba66-0d7f588a3781\\.user_uploaded';
const targetDir = path.resolve('apps/frontend/public/images/products');

fs.mkdirSync(targetDir, { recursive: true });

const imageMapping = [
  // BATCH 1
  {
    src: 'media_1789839437485.jpg',
    destName: 'peach-cape-set.jpg',
    url: '/images/products/peach-cape-set.jpg',
    id: 'prd_07',
    slug: 'blush-peach-cape-set',
    name: 'Blush Peach Embellished Cape & Palazzo Set',
    category_id: 'cat_salwar_suits',
    gender: 'women',
    fabric: 'Pure Georgette & Organza',
    occasion: 'Cocktail & Party, Festive',
    mrp: 2499900,
    discount_percent: 15,
  },
  {
    src: 'media_1789839437504.jpg',
    destName: 'champagne-drape-saree.jpg',
    url: '/images/products/champagne-drape-saree.jpg',
    id: 'prd_01',
    slug: 'champagne-drape-saree',
    name: 'Champagne Floral Corset Pre-Draped Saree',
    category_id: 'cat_sarees',
    gender: 'women',
    fabric: 'Tissue Silk & Satin',
    occasion: 'Cocktail & Party, Weddings',
    mrp: 2899900,
    discount_percent: 10,
  },
  {
    src: 'media_1789839437547.jpg',
    destName: 'wine-embellished-gown.jpg',
    url: '/images/products/wine-embellished-gown.jpg',
    id: 'prd_13',
    slug: 'wine-sequin-cape-gown',
    name: 'Royal Wine Sequin Mermaid Gown with Cape',
    category_id: 'cat_lehengas',
    gender: 'women',
    fabric: 'Net Tulle & Sequins',
    occasion: 'Sangeet & Mehendi, Cocktail',
    mrp: 3499900,
    discount_percent: 20,
  },
  {
    src: 'media_1789839437555.jpg',
    destName: 'metallic-saree-gown.jpg',
    url: '/images/products/metallic-saree-gown.jpg',
    id: 'prd_02',
    slug: 'metallic-bronze-saree-gown',
    name: 'Bronze Metallic Embellished Pre-Draped Saree Gown',
    category_id: 'cat_sarees',
    gender: 'women',
    fabric: 'Metallic Satin Silk & Sequin Mesh',
    occasion: 'Weddings, Reception',
    mrp: 3249900,
    discount_percent: 15,
  },
  {
    src: 'media_1789839437607.jpg',
    destName: 'magenta-bridal-lehenga.jpg',
    url: '/images/products/magenta-bridal-lehenga.jpg',
    id: 'prd_14',
    slug: 'rani-pink-bridal-lehenga',
    name: 'Rani Pink Zardozi Hand-Embroidered Bridal Lehenga',
    category_id: 'cat_lehengas',
    gender: 'women',
    fabric: 'Raw Silk & Fine Net',
    occasion: 'Bridal & Festive, Weddings',
    mrp: 5499900,
    discount_percent: 10,
  },

  // BATCH 2 (NEW)
  {
    src: 'media_1789840203830.jpg',
    destName: 'olive-sequin-co-ord.jpg',
    url: '/images/products/olive-sequin-co-ord.jpg',
    id: 'prd_08',
    slug: 'olive-sequin-co-ord-set',
    name: 'Olive Gold Embroidered Vest & Sequin Flared Co-Ord Set',
    category_id: 'cat_salwar_suits',
    gender: 'women',
    fabric: 'Sequin Georgette & Velvet Vest',
    occasion: 'Cocktail & Party, Sangeet & Mehendi',
    mrp: 2299900,
    discount_percent: 12,
  },
  {
    src: 'media_1789840203862.jpg',
    destName: 'mens-festive-trio.jpg',
    url: '/images/products/mens-festive-trio.jpg',
    id: 'prd_26',
    slug: 'mens-festive-kurta-set',
    name: 'Pastel Mint & Emerald Hand-Embroidered Kurta Set',
    category_id: 'cat_mens_ethnic',
    gender: 'men',
    fabric: 'Chanderi Silk & Raw Silk',
    occasion: 'Weddings, Sangeet & Mehendi',
    mrp: 2799900,
    discount_percent: 15,
  },
  {
    src: 'media_1789840203891.jpg',
    destName: 'mens-shadi-fits.jpg',
    url: '/images/products/mens-shadi-fits.jpg',
    id: 'prd_27',
    slug: 'mens-shadi-fits-sherwani',
    name: 'Royal Ivory & Sage Embroidered Sherwani & Bandhgala Set',
    category_id: 'cat_mens_ethnic',
    gender: 'men',
    fabric: 'Pure Raw Silk & Zari Threads',
    occasion: 'Bridal & Festive, Weddings',
    mrp: 4299900,
    discount_percent: 10,
  },
  {
    src: 'media_1789840203934.jpg',
    destName: 'emerald-halter-saree.jpg',
    url: '/images/products/emerald-halter-saree.jpg',
    id: 'prd_03',
    slug: 'emerald-halter-corset-saree',
    name: 'Deep Emerald Teal Halter Corset Draped Saree',
    category_id: 'cat_sarees',
    gender: 'women',
    fabric: 'Fluid Satin Silk & Sequin Bustier',
    occasion: 'Cocktail & Party, Reception',
    mrp: 2699900,
    discount_percent: 15,
  },
  {
    src: 'media_1789840203989.jpg',
    destName: 'dusty-rose-mirror-lehenga.jpg',
    url: '/images/products/dusty-rose-mirror-lehenga.jpg',
    id: 'prd_15',
    slug: 'dusty-rose-mirror-lehenga',
    name: 'Dusty Rose Mirror-Work & Cutdana Bridal Lehenga',
    category_id: 'cat_lehengas',
    gender: 'women',
    fabric: 'Fine Net Tulle & Mirror Work',
    occasion: 'Weddings, Sangeet & Mehendi',
    mrp: 4899900,
    discount_percent: 10,
  },
];

async function main() {
  console.log('Copying all 10 user photos...');
  for (const item of imageMapping) {
    const srcPath = path.join(userUploadedDir, item.src);
    const destPath = path.join(targetDir, item.destName);
    if (fs.existsSync(srcPath)) {
      fs.copyFileSync(srcPath, destPath);
      console.log(`Copied ${item.src} -> ${destPath}`);
    } else {
      console.error(`Source file not found: ${srcPath}`);
    }
  }

  console.log('Updating database products with all 10 custom images...');
  for (const item of imageMapping) {
    const imagesJson = JSON.stringify([item.url]);

    const checkRes = await pool.query('SELECT id FROM products WHERE id = $1 OR slug = $2', [item.id, item.slug]);

    if (checkRes.rows.length > 0) {
      const prodId = checkRes.rows[0].id;
      await pool.query(
        `UPDATE products SET name = $1, slug = $2, category_id = $3, fabric = $4, occasion = $5, gender = $6, mrp = $7, discount_percent = $8, images = $9, is_featured = 1 WHERE id = $10`,
        [item.name, item.slug, item.category_id, item.fabric, item.occasion, item.gender, item.mrp, item.discount_percent, imagesJson, prodId]
      );
      console.log(`Updated product ID ${prodId} (${item.name})`);
    } else {
      await pool.query(
        `INSERT INTO products (id, category_id, name, slug, description, fabric, occasion, gender, mrp, discount_percent, sku, images, is_featured, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 1, 1)`,
        [item.id, item.category_id, item.name, item.slug, item.name, item.fabric, item.occasion, item.gender, item.mrp, item.discount_percent, 'SKU-' + item.id, imagesJson]
      );
      console.log(`Inserted product ID ${item.id} (${item.name})`);
    }
  }

  console.log('Database updated with all 10 custom photos successfully!');
  await pool.end();
}

main().catch(console.error);
