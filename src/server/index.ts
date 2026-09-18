import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import initSchema from './db/schema.ts';
import authRoutes from './routes/auth.routes.ts';
import productRoutes from './routes/product.routes.ts';
import cartRoutes from './routes/cart.routes.ts';
import orderRoutes from './routes/order.routes.ts';
import paymentRoutes from './routes/payment.routes.ts';
import adminRoutes from './routes/admin.routes.ts';
import { errorHandler } from './middleware/error.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize Database Schema on start
initSchema();

// Security Middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disabled for local dev asset loading
}));

app.use(cors({
  origin: true,
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Register API Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/admin', adminRoutes);

// Healthcheck
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', store: 'Shikkis — Curated Style', timestamp: new Date().toISOString() });
});

// Serve frontend build in production
if (process.env.NODE_ENV === 'production') {
  const distPath = path.resolve(__dirname, '../../dist');
  app.use(express.static(distPath));
  app.get('*', (_req, res) => {
    res.sendFile(path.resolve(distPath, 'index.html'));
  });
}

// Error Handler
app.use(errorHandler);

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Shikkis Express Server running at http://localhost:${PORT}`);
  });
}

export default app;
