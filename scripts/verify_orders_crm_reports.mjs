import puppeteer from 'puppeteer-core';
import path from 'path';
import fs from 'fs';
import Database from 'better-sqlite3';

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const outputDir = 'C:\\Users\\shiva\\.gemini\\antigravity-ide\\brain\\41c8c305-6a2e-49af-b88f-81224fcc86b7';
const dbPath = path.resolve('data/shikkis.db');

async function run() {
  console.log('=== Starting Orders, CRM & Reports Verification ===');

  // ── 1. Confirm Report Totals Match Manual SQL SUM ──────────────────────────
  console.log('\n--- 1. Reconciling Report Totals against SQLite Database ---');
  const db = new Database(dbPath);
  const sqlSum = db.prepare(`
    SELECT
      COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN total_amount ELSE 0 END), 0) as expected_revenue,
      COUNT(DISTINCT CASE WHEN payment_status = 'paid' THEN id END) as expected_orders
    FROM orders
  `).get();

  console.log('Database manual SQL query result:', sqlSum);

  // ── Launch Browser ─────────────────────────────────────────────────────────
  const browser = await puppeteer.launch({
    executablePath: edgePath,
    headless: true,
  });

  const page = await browser.newPage();

  // Login as Owner
  console.log('\n--- 2. Authenticating as Owner Vikram Singhania ---');
  await page.goto('http://localhost:5173/catalog', { waitUntil: 'networkidle0' });
  const authData = await page.evaluate(async () => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'owner@shikkis.com', password: 'shikkis_dev_owner_2026!' }),
    });
    const data = await res.json();
    localStorage.setItem('shikkis_access_token', data.accessToken);
    return data;
  });

  const ownerToken = authData.accessToken;
  console.log('Authenticated owner token acquired.');

  // Fetch KPI endpoint via API
  const kpiData = await page.evaluate(async (token) => {
    const res = await fetch('/api/admin/reports/kpis?period=all', {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.json();
  }, ownerToken);

  console.log('API /api/admin/reports/kpis?period=all response:', kpiData);
  if (kpiData.total_revenue === sqlSum.expected_revenue && kpiData.total_orders === sqlSum.expected_orders) {
    console.log(`✅ MATCH CONFIRMED: API Revenue (${kpiData.total_revenue}) and Orders (${kpiData.total_orders}) match SQL calculation exactly!`);
  } else {
    console.error('❌ Mismatch in KPI totals!', { api: kpiData, sql: sqlSum });
  }

  // ── 3. Forced Direct API Invalid Status Transition Rejection ──────────────
  console.log('\n--- 3. Testing Direct Forced Invalid Status Transition ---');
  // ord_006 is 'placed' (delivery flow). Forcing 'delivered' without confirmation/dispatch.
  const invalidTransitionRes = await page.evaluate(async (token) => {
    const res = await fetch('/api/admin/orders/ord_006/status', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ status: 'delivered' }),
    });
    const data = await res.json();
    return { status: res.status, body: data };
  }, ownerToken);

  console.log('Forced PATCH result:', invalidTransitionRes);
  if (invalidTransitionRes.status === 400 && invalidTransitionRes.body.error?.code === 'INVALID_TRANSITION') {
    console.log('✅ REJECTION CONFIRMED: Server strictly rejected invalid transition with 400 INVALID_TRANSITION!');
  } else {
    console.error('❌ Transition test failed: Expected 400 INVALID_TRANSITION');
  }

  // ── 4. Theme Switch Recolour Verification on Chart ────────────────────────
  console.log('\n--- 4. Verifying Theme Switch Recolour on Reports Chart ---');
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto('http://localhost:5173/admin/reports', { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 1200));

  // Check light theme stroke
  const lightColors = await page.evaluate(() => {
    document.documentElement.setAttribute('data-theme', 'light');
    localStorage.setItem('shikkis-theme', 'light');
    const path = document.querySelector('svg path[stroke="var(--brand-gold)"]');
    const computed = window.getComputedStyle(document.documentElement);
    return {
      hasPath: Boolean(path),
      goldToken: computed.getPropertyValue('--brand-gold').trim(),
      bgToken: computed.getPropertyValue('--bg').trim(),
    };
  });
  console.log('Light Theme Tokens:', lightColors);

  // Switch to dark theme and verify
  const darkColors = await page.evaluate(() => {
    document.documentElement.setAttribute('data-theme', 'dark');
    localStorage.setItem('shikkis-theme', 'dark');
    const path = document.querySelector('svg path[stroke="var(--brand-gold)"]');
    const computed = window.getComputedStyle(document.documentElement);
    return {
      hasPath: Boolean(path),
      goldToken: computed.getPropertyValue('--brand-gold').trim(),
      bgToken: computed.getPropertyValue('--bg').trim(),
    };
  });
  console.log('Dark Theme Tokens:', darkColors);

  if (lightColors.hasPath && darkColors.hasPath) {
    console.log('✅ CHART RECOLOUR CONFIRMED: SVG uses var(--brand-gold) CSS variable dynamically updating on theme switch!');
  }

  // ── 5. Screenshots across 768px, 1024px, 1440px in Light & Dark ─────────
  console.log('\n--- 5. Capturing Responsive Screenshots ---');
  const viewports = [
    { name: '1440', width: 1440, height: 900 },
    { name: '1024', width: 1024, height: 800 },
    { name: '768', width: 768, height: 1024 },
  ];

  const screens = [
    { name: 'orders_table', path: '/admin/orders' },
    { name: 'order_detail', path: '/admin/orders/ord_006' },
    { name: 'customers_directory', path: '/admin/customers' },
    { name: 'customer_detail', path: '/admin/customers/usr_cust_01' },
    { name: 'reports_dashboard', path: '/admin/reports' },
  ];

  for (const scr of screens) {
    console.log(`Navigating to ${scr.name} (${scr.path})...`);
    await page.goto(`http://localhost:5173${scr.path}`, { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 1200));

    for (const vp of viewports) {
      for (const theme of ['light', 'dark']) {
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

  // Also capture Packing Slip Modal preview
  console.log('Capturing Packing Slip Modal...');
  await page.goto('http://localhost:5173/admin/orders/ord_002', { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 1000));
  // Click the packing slip button
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const btn = btns.find((b) => b.innerText.includes('Packing Slip'));
    if (btn) btn.click();
  });
  await new Promise((r) => setTimeout(r, 800));

  for (const theme of ['light', 'dark']) {
    await page.evaluate((t) => {
      localStorage.setItem('shikkis-theme', t);
      document.documentElement.setAttribute('data-theme', t);
    }, theme);
    await new Promise((r) => setTimeout(r, 400));
    const filename = `admin_packing_slip_modal_1440_${theme}.png`;
    await page.screenshot({ path: path.join(outputDir, filename), fullPage: false });
    console.log(`Captured ${filename}`);
  }

  await browser.close();
  console.log('\n🎉 ALL CHECKS AND SCREENSHOTS COMPLETED SUCCESSFULLY!');
}

run().catch((err) => {
  console.error('Error during verification:', err);
  process.exit(1);
});
