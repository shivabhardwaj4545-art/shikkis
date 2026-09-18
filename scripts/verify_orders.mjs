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
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'tablet', width: 768, height: 1024 },
    { name: 'mobile', width: 375, height: 812 },
  ];

  const themes = ['light', 'dark'];

  // ── 1. Orders List Page (Priya Sharma) ───────────────────────────────────
  console.log('--- 1. Capturing Orders List ---');
  await page.goto('http://localhost:5173/orders', { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 1200));

  for (const vp of viewports) {
    for (const theme of themes) {
      await page.setViewport({ width: vp.width, height: vp.height });
      await page.evaluate((t) => {
        localStorage.setItem('shikkis-theme', t);
        document.documentElement.setAttribute('data-theme', t);
      }, theme);

      await new Promise((r) => setTimeout(r, 400));
      const filename = `orders_list_${vp.name}_${theme}.png`;
      await page.screenshot({ path: path.join(outputDir, filename), fullPage: false });
      console.log(`Captured ${filename}`);
    }
  }

  // ── 2. Order Detail & Till-Slip Receipt (ord_001) ─────────────────────────
  console.log('--- 2. Capturing Order Detail & Till-Slip Receipt (ord_001) ---');
  await page.goto('http://localhost:5173/orders/ord_001', { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 1500));

  for (const vp of viewports) {
    for (const theme of themes) {
      await page.setViewport({ width: vp.width, height: vp.height });
      await page.evaluate((t) => {
        localStorage.setItem('shikkis-theme', t);
        document.documentElement.setAttribute('data-theme', t);
      }, theme);

      await new Promise((r) => setTimeout(r, 400));
      const filename = `order_detail_${vp.name}_${theme}.png`;
      await page.screenshot({ path: path.join(outputDir, filename), fullPage: false });
      console.log(`Captured ${filename}`);
    }
  }

  // ── 3. Print Stylesheet Preview ─────────────────────────────────────────
  console.log('--- 3. Capturing Print Media Emulation (A4 Till-Slip) ---');
  await page.emulateMediaType('print');
  await page.setViewport({ width: 794, height: 1123 }); // A4 at 96 DPI
  const printFilename = 'order_print_preview.png';
  await page.screenshot({ path: path.join(outputDir, printFilename), fullPage: true });
  console.log(`Captured ${printFilename}`);
  await page.emulateMediaType('screen');

  // ── 4. Security Check: Customer A accessing Customer B's order (ord_002) ──
  console.log('--- 4. Testing 404 Security Isolation (Customer A accessing ord_002) ---');
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto('http://localhost:5173/orders/ord_002', { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 1500));

  const pageText = await page.evaluate(() => document.body.innerText);
  if (pageText.includes('Order Not Found')) {
    console.log('✅ Security Check Passed: Customer A received 404 "Order Not Found" for ord_002!');
  } else {
    console.error('❌ Security Check Failed: Expected Order Not Found for ord_002. Found text:', pageText.slice(0, 100));
  }

  const securityFilename = `order_404_isolation.png`;
  await page.screenshot({ path: path.join(outputDir, securityFilename), fullPage: false });
  console.log(`Captured ${securityFilename}`);

  // ── 5. Cancelled Order State: Switch to Customer B Rahul Verma (ord_007) ──
  console.log('--- 5. Capturing Cancelled Order State (ord_007) ---');
  await page.evaluate(async () => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'rahul@example.com', password: 'shikkis_dev_cust_2026!' }),
    });
    const data = await res.json();
    localStorage.setItem('shikkis_access_token', data.accessToken);
  });

  await page.goto('http://localhost:5173/orders/ord_007', { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 1500));

  const cancelledLightFilename = 'order_cancelled_desktop_light.png';
  await page.evaluate(() => {
    localStorage.setItem('shikkis-theme', 'light');
    document.documentElement.setAttribute('data-theme', 'light');
  });
  await new Promise((r) => setTimeout(r, 300));
  await page.screenshot({ path: path.join(outputDir, cancelledLightFilename), fullPage: false });
  console.log(`Captured ${cancelledLightFilename}`);

  const cancelledDarkFilename = 'order_cancelled_desktop_dark.png';
  await page.evaluate(() => {
    localStorage.setItem('shikkis-theme', 'dark');
    document.documentElement.setAttribute('data-theme', 'dark');
  });
  await new Promise((r) => setTimeout(r, 300));
  await page.screenshot({ path: path.join(outputDir, cancelledDarkFilename), fullPage: false });
  console.log(`Captured ${cancelledDarkFilename}`);

  await browser.close();
  console.log('🎉 All order screenshots and security verifications completed!');
}

run().catch((err) => {
  console.error('Error running verification:', err);
  process.exit(1);
});
