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
  {
    src: 'media_1789839437485.jpg',
    destName: 'peach-cape-set.jpg',
    url: '/images/products/peach-cape-set.jpg',
    productSlug: 'blush-peach-cape-set',
    name: 'Blush Peach Embellished Cape & Palazzo Set',
    category_id: 'cat_salwar_suits',
    gender: 'women',
    fabric: 'Pure Georgette & Organza',
    occasion: 'Cocktail & Party, Festive',
    mrp: 2499900, // ₹24,999
    discount_percent: 15,
  },
  {
    src: 'media_1789839437504.jpg',
    destName: 'champagne-drape-saree.jpg',
    url: '/images/products/champagne-drape-saree.jpg',
    productSlug: 'champagne-drape-saree',
    name: 'Champagne Floral Corset Pre-Draped Saree',
    category_id: 'cat_sarees',
    gender: 'women',
    fabric: 'Tissue Silk & Satin',
    occasion: 'Cocktail & Party, Weddings',
    mrp: 2899900, // ₹28,999
    discount_percent: 10,
  },
  {
    src: 'media_1789839437547.jpg',
    destName: 'wine-embellished-gown.jpg',
    url: '/images/products/wine-embellished-gown.jpg',
    productSlug: 'wine-sequin-cape-gown',
    name: 'Royal Wine Sequin Mermaid Gown with Cape',
    category_id: 'cat_lehengas',
    gender: 'women',
    fabric: 'Net Tulle & Sequins',
    occasion: 'Sangeet & Mehendi, Cocktail',
    mrp: 3499900, // ₹34,999
    discount_percent: 20,
  },
  {
    src: 'media_1789839437555.jpg',
    destName: 'metallic-saree-gown.jpg',
    url: '/images/products/metallic-saree-gown.jpg',
    productSlug: 'metallic-bronze-saree-gown',
    name: 'Bronze Metallic Embellished Pre-Draped Saree Gown',
    category_id: 'cat_sarees',
    gender: 'women',
    fabric: 'Metallic Satin Silk & Sequin Mesh',
    occasion: 'Weddings, Reception',
    mrp: 3249900, // ₹32,499
    discount_percent: 15,
  },
  {
    src: 'media_1789839437607.jpg',
    destName: 'magenta-bridal-lehenga.jpg',
    url: '/images/products/magenta-bridal-lehenga.jpg',
    productSlug: 'rani-pink-bridal-lehenga',
    name: 'Rani Pink Zardozi Hand-Embroidered Bridal Lehenga',
    category_id: 'cat_lehengas',
    gender: 'women',
    fabric: 'Raw Silk & Fine Net',
    occasion: 'Bridal & Festive, Weddings',
    mrp: 5499900, // ₹54,999
    discount_percent: 10,
  },
];

async function main() {
  console.log('Copying images...');
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

  console.log('Updating database products with new custom images...');
  for (const item of imageMapping) {
    // Check if product exists by slug
    const checkRes = await pool.query('SELECT id FROM products WHERE slug = $1', [item.productSlug]);
    const imagesJson = JSON.stringify([item.url]);

    if (checkRes.rows.length > 0) {
      const prodId = checkRes.rows[0].id;
      await pool.query(
        `UPDATE products SET name = $1, category_id = $2, fabric = $3, occasion = $4, mrp = $5, discount_percent = $6, images = $7, is_featured = 1 WHERE id = $8`,
        [item.name, item.category_id, item.fabric, item.occasion, item.mrp, item.discount_percent, imagesJson, prodId]
      );
      console.log(`Updated product ${item.productSlug} (id: ${prodId})`);
    } else {
      // Create new product or update first product in category
      const catProdRes = await pool.query('SELECT id FROM products WHERE category_id = $1 LIMIT 1', [item.category_id]);
      if (catProdRes.rows.length > 0) {
        // Update product images for the existing top products
        const targetProdId = catProdRes.rows[0].id;
        await pool.query(
          `UPDATE products SET name = $1, slug = $2, fabric = $3, occasion = $4, mrp = $5, discount_percent = $6, images = $7, is_featured = 1 WHERE id = $8`,
          [item.name, item.productSlug, item.fabric, item.occasion, item.mrp, item.discount_percent, imagesJson, targetProdId]
        );
        console.log(`Updated category top product id ${targetProdId} to ${item.name}`);
      } else {
        // Insert new
        const id = 'prd_custom_' + Date.now() + Math.floor(Math.random()*1000);
        await pool.query(
          `INSERT INTO products (id, category_id, name, slug, description, fabric, occasion, gender, mrp, discount_percent, sku, images, is_featured, is_active)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 1, 1)`,
          [id, item.category_id, item.name, item.productSlug, item.name, item.fabric, item.occasion, item.gender, item.mrp, item.discount_percent, 'SKU-' + item.productSlug, imagesJson]
        );
        console.log(`Inserted custom product ${item.name}`);
      }
    }
  }

  // Also update featured products in database so the 5 uploaded image products are the top 5 featured items on the homepage & catalog
  console.log('Database updated successfully!');
  await pool.end();
}

main().catch(console.error);
