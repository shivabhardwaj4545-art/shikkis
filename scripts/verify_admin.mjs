import puppeteer from 'puppeteer-core';
import path from 'path';
import fs from 'fs';

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const outputDir = 'C:\\Users\\shiva\\.gemini\\antigravity-ide\\brain\\41c8c305-6a2e-49af-b88f-81224fcc86b7';

async function run() {
  const browser = await puppeteer.launch({
    executablePath: edgePath,
    headless: true,
  });

  const page = await browser.newPage();

  const viewports = [
    { name: 'desktop_1440', width: 1440, height: 900 },
    { name: 'desktop_1024', width: 1024, height: 800 },
    { name: 'tablet_768', width: 768, height: 1024 },
  ];

  const themes = ['light', 'dark'];

  // ── 1. Code Splitting Verification ────────────────────────────────────────
  console.log('--- 1. Verifying Route-Level Code Splitting ---');
  let adminChunkLoadedOnStorefront = false;
  page.on('request', (req) => {
    const url = req.url();
    if (url.includes('AdminRoutes') || url.includes('AdminProductsPage') || url.includes('ProductEditorPage')) {
      adminChunkLoadedOnStorefront = true;
      console.log('Detected admin chunk request:', url);
    }
  });

  await page.goto('http://localhost:5173/catalog', { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 1000));

  if (!adminChunkLoadedOnStorefront) {
    console.log('✅ Code Splitting Verified: Zero admin chunks loaded on customer /catalog route!');
  } else {
    console.warn('⚠️ Warning: Admin chunk loaded on customer storefront route.');
  }

  // ── 2. Security 403 Authorization Verification ────────────────────────────
  console.log('--- 2. Verifying 403 Security on Customer Accessing /admin ---');
  // Log in as Customer Priya Sharma
  await page.evaluate(async () => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'priya@example.com', password: 'shikkis_dev_cust_2026!' }),
    });
    const data = await res.json();
    localStorage.setItem('shikkis_access_token', data.accessToken);
  });

  await page.goto('http://localhost:5173/admin', { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 1000));

  const customerText = await page.evaluate(() => document.body.innerText);
  if (customerText.includes('403') || customerText.includes('Owner Access Required')) {
    console.log('✅ Security Check Passed: Customer received 403 Access Denied on /admin!');
  } else {
    console.error('❌ Security Check Failed: Expected 403 for customer on /admin');
  }

  await page.screenshot({ path: path.join(outputDir, 'admin_403_customer_denied.png'), fullPage: false });
  console.log('Captured admin_403_customer_denied.png');

  // ── 3. Owner Login ────────────────────────────────────────────────────────
  console.log('--- 3. Authenticating as Owner Vikram Singhania ---');
  await page.evaluate(async () => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'owner@shikkis.com', password: 'shikkis_dev_owner_2026!' }),
    });
    const data = await res.json();
    localStorage.setItem('shikkis_access_token', data.accessToken);
  });

  // ── 4. Capture Screens Across 768px, 1024px, 1440px in Light & Dark ─────────
  const screens = [
    { name: 'dashboard', path: '/admin' },
    { name: 'products', path: '/admin/products' },
    { name: 'product_editor', path: '/admin/products/new' },
    { name: 'inventory', path: '/admin/inventory' },
    { name: 'offers', path: '/admin/offers' },
    { name: 'banners', path: '/admin/banners' },
  ];

  for (const scr of screens) {
    console.log(`--- Capturing ${scr.name} (${scr.path}) ---`);
    await page.goto(`http://localhost:5173${scr.path}`, { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 1200));

    for (const vp of viewports) {
      for (const theme of themes) {
        await page.setViewport({ width: vp.width, height: vp.height });
        await page.evaluate((t) => {
          localStorage.setItem('shikkis-theme', t);
          document.documentElement.setAttribute('data-theme', t);
        }, theme);

        await new Promise((r) => setTimeout(r, 400));
        const filename = `admin_${scr.name}_${vp.name}_${theme}.png`;
        await page.screenshot({ path: path.join(outputDir, filename), fullPage: false });
        console.log(`Captured ${filename}`);
      }
    }
  }

  // ── 5. Create an Offer & Confirm It Appears on Storefront ──────────────────
  console.log('--- 5. Verifying Storefront Offer Sync ---');
  const promoCode = `VINTAGE${Date.now().toString().slice(-4)}`;
  const offerRes = await page.evaluate(async (code) => {
    const token = localStorage.getItem('shikkis_access_token');
    const res = await fetch('/api/admin/offers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        name: 'Heritage Silk Special',
        code,
        type: 'percent',
        value: 20,
        max_discount: 200000,
        min_cart_value: 300000,
        starts_at: new Date().toISOString(),
        ends_at: new Date(Date.now() + 7 * 86400000).toISOString(),
        is_active: true,
        scope: 'all',
      }),
    });
    return res.json();
  }, promoCode);

  console.log('Created promotion via admin API:', offerRes);

  // Check public storefront offers endpoint
  const publicOffers = await page.evaluate(async () => {
    const res = await fetch('/api/offers/active');
    return res.json();
  });

  const matched = publicOffers.data?.find((o) => o.code === promoCode);
  if (matched) {
    console.log(`✅ Storefront Offer Sync Verified: Offer ${promoCode} is live on customer storefront!`);
  } else {
    console.log('Public offers received:', publicOffers);
  }

  await browser.close();
  console.log('🎉 All Admin verification checks and screenshots completed!');
}

run().catch((err) => {
  console.error('Error running admin verification:', err);
  process.exit(1);
});
