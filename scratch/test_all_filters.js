import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve('apps/backend/.env') });

const BASE = 'http://localhost:3001/api';

async function testFilter(name, url) {
  const res = await fetch(url);
  const json = await res.json();
  const count = json.data?.length ?? 0;
  const total = json.pagination?.total ?? count;
  console.log(`Filter [${name}]: ${total} total matching products (${count} on page)`);
  return total;
}

async function run() {
  console.log('--- TESTING GENDERS ---');
  await testFilter('Gender: Women', `${BASE}/products?gender=women`);
  await testFilter('Gender: Men', `${BASE}/products?gender=men`);
  await testFilter('Gender: Unisex', `${BASE}/products?gender=unisex`);
  await testFilter('Gender: Women (Caps)', `${BASE}/products?gender=Women`);

  console.log('\n--- TESTING CATEGORIES ---');
  await testFilter('Category: sarees', `${BASE}/products?category=sarees`);
  await testFilter('Category: salwar-suits', `${BASE}/products?category=salwar-suits`);
  await testFilter('Category: lehengas', `${BASE}/products?category=lehengas`);
  await testFilter('Category: kurtis', `${BASE}/products?category=kurtis`);
  await testFilter('Category: dupattas', `${BASE}/products?category=dupattas`);
  await testFilter('Category: mens-ethnic', `${BASE}/products?category=mens-ethnic`);

  console.log('\n--- TESTING OCCASIONS ---');
  await testFilter('Occasion: Bridal & Festive', `${BASE}/products?occasion=${encodeURIComponent('Bridal & Festive')}`);
  await testFilter('Occasion: Weddings', `${BASE}/products?occasion=${encodeURIComponent('Weddings')}`);
  await testFilter('Occasion: Cocktail & Party', `${BASE}/products?occasion=${encodeURIComponent('Cocktail & Party')}`);
  await testFilter('Occasion: Sangeet & Mehendi', `${BASE}/products?occasion=${encodeURIComponent('Sangeet & Mehendi')}`);
  await testFilter('Occasion: Haldi', `${BASE}/products?occasion=${encodeURIComponent('Haldi')}`);
  await testFilter('Occasion: Casual & Office', `${BASE}/products?occasion=${encodeURIComponent('Casual & Office')}`);

  console.log('\n--- TESTING PRICE RANGES ---');
  await testFilter('Price: Under ₹5,000', `${BASE}/products?max_price=500000`);
  await testFilter('Price: ₹5k - ₹15k', `${BASE}/products?min_price=500000&max_price=1500000`);
  await testFilter('Price: ₹15k - ₹35k', `${BASE}/products?min_price=1500000&max_price=3500000`);
  await testFilter('Price: Above ₹35k', `${BASE}/products?min_price=3500000`);
}

run().catch(console.error);
