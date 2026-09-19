import 'dotenv/config'; // MUST be first — loads .env before any other module reads process.env
import compression from 'compression';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import morgan from 'morgan';

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { initSchema } from './db/schema.js';
import { errorHandler } from './middleware/error.js';
import healthRouter from './routes/health.js';
import { productsRouter } from './routes/products.js';
import { categoriesRouter } from './routes/categories.js';
import { bannersRouter } from './routes/banners.js';
import { offersRouter } from './routes/offers.js';
import { cartRouter } from './routes/cart.js';
import { authRouter } from './routes/auth.js';
import { ordersRouter } from './routes/orders.js';
import { adminRouter } from './routes/admin.js';
import { webhooksRouter } from './routes/webhooks.js';

// dotenv already loaded via 'dotenv/config' import at the top

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.set('trust proxy', 1);
const PORT = Number(process.env.PORT ?? 3001);
const NODE_ENV = process.env.NODE_ENV ?? 'development';

// ── Database ──────────────────────────────────────────────────────────────────
// Run migrations/schema init synchronously before any requests are served
initSchema();

app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: false,
  }),
);

// Explicitly send a permissive Content-Security-Policy header so browsers allow Razorpay SDK, Google GSI, inline scripts & all images
app.use((_req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    "default-src * 'unsafe-inline' 'unsafe-eval' data: blob:; script-src * 'unsafe-inline' 'unsafe-eval' data: blob: https://checkout.razorpay.com https://accounts.google.com; script-src-elem * 'unsafe-inline' 'unsafe-eval' data: blob: https://checkout.razorpay.com https://accounts.google.com; style-src * 'unsafe-inline' https:; img-src * data: blob: https: http:; connect-src *; frame-src *;"
  );
  next();
});

// ── CORS ──────────────────────────────────────────────────────────────────────
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
  : true; // Allow request origin in dev & single-origin prod

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  }),
);

// ── Global rate limit ─────────────────────────────────────────────────────────
app.use(
  rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: { code: 'RATE_LIMITED', message: 'Too many requests, slow down.' } },
  }),
);

// Stricter rate limit on auth endpoints
const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: NODE_ENV === 'production' ? 10 : 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: { code: 'RATE_LIMITED', message: 'Too many auth attempts. Try again in a minute.' },
  },
});

// Stricter rate limit on coupon validation endpoints to prevent brute-forcing
const couponLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: NODE_ENV === 'production' ? 15 : 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: { code: 'RATE_LIMITED', message: 'Too many coupon attempts. Try again later.' },
  },
});

// ── Body parsing + Compression + Cookies ─────────────────────────────────────
app.use(compression());
app.use(cookieParser(process.env.SESSION_SECRET || 'shikkis_dev_secret_2026'));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Logging ───────────────────────────────────────────────────────────────────
app.use(morgan(NODE_ENV === 'production' ? 'combined' : 'dev'));

// ── Static uploads ────────────────────────────────────────────────────────────
const uploadsDir = path.resolve(__dirname, '../uploads');
app.use('/uploads', express.static(uploadsDir));

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/health', healthRouter);
app.use('/api/products', productsRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/banners', bannersRouter);
app.use('/api/offers', offersRouter);
app.use('/api/cart/coupon', couponLimiter);
app.use('/api/cart', cartRouter);
app.use('/api/auth', authLimiter, authRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/admin', adminRouter);
app.use('/api/webhooks', webhooksRouter);

export { authLimiter, couponLimiter };

// ── Serve Frontend SPA in Production ──────────────────────────────────────────
let frontendDistDir = path.resolve(__dirname, '../../frontend/dist');
if (!fs.existsSync(frontendDistDir)) {
  frontendDistDir = path.resolve(__dirname, '../frontend/dist');
}
if (!fs.existsSync(frontendDistDir)) {
  frontendDistDir = path.resolve(process.cwd(), 'apps/frontend/dist');
}
if (!fs.existsSync(frontendDistDir)) {
  frontendDistDir = path.resolve(process.cwd(), 'dist');
}

if (NODE_ENV === 'production') {
  console.info(`📦 Serving frontend SPA from: ${frontendDistDir}`);
  app.use(express.static(frontendDistDir));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/') || req.path.startsWith('/uploads/')) {
      return next();
    }
    const indexHtmlPath = path.join(frontendDistDir, 'index.html');
    if (fs.existsSync(indexHtmlPath)) {
      res.sendFile(indexHtmlPath);
    } else {
      next();
    }
  });
}

// ── Error handler — must be LAST ──────────────────────────────────────────────
app.use(errorHandler);

// ── Server start + Graceful shutdown ──────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  const server = app.listen(PORT, () => {
    console.info(`🛍  Shikkis backend running at http://localhost:${PORT} [${NODE_ENV}]`);
  });

  process.on('SIGTERM', () => {
    console.info('SIGTERM received — shutting down gracefully');
    server.close(() => {
      console.info('HTTP server closed');
      process.exit(0);
    });
  });

  process.on('SIGINT', () => {
    console.info('SIGINT received — shutting down gracefully');
    server.close(() => {
      console.info('HTTP server closed');
      process.exit(0);
    });
  });
}

export default app;
