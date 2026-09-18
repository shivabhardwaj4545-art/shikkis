import { motion } from 'framer-motion';
import React from 'react';

import { fadeInUp, useMotionSafe } from '@/lib/motion';

// ─── Placeholder page factory ─────────────────────────────────────────────────
// These stubs will be replaced with real implementations in subsequent tasks.

function makePlaceholderPage(name: string, description: string) {
  const Page: React.FC = () => {
    const variants = useMotionSafe(fadeInUp);
    return (
      <motion.div
        variants={variants}
        initial="hidden"
        animate="visible"
        className="mx-auto max-w-7xl px-4 py-20 md:px-8 text-center"
      >
        <h1 className="font-serif text-4xl text-text mb-3">{name}</h1>
        <p className="text-text-muted">{description}</p>
        <p className="mt-6 text-xs text-text-muted/60 font-sans">
          This page will be implemented in a future task.
        </p>
      </motion.div>
    );
  };
  Page.displayName = name;
  return Page;
}

export { HomePage } from './HomePage';
export { CatalogPage } from './CatalogPage';
export { ProductDetailPage } from './ProductDetailPage';
export { CheckoutPage } from './CheckoutPage';
export { CustomerOrdersPage } from './CustomerOrdersPage';
export { OrderTrackingPage } from './OrderTrackingPage';
export { NotFoundPage } from './NotFoundPage';
export { ServerErrorPage } from './ServerErrorPage';
export { AuthPage } from './AuthPage';
export { PoliciesPage } from './PoliciesPage';
export const AdminDashboard = makePlaceholderPage('Admin Dashboard', 'Sales overview and quick actions.');
export const AdminProducts = makePlaceholderPage('Admin — Products', 'Manage products and inventory.');
export const AdminOrders = makePlaceholderPage('Admin — Orders', 'Manage and update order status.');
export const AdminOffers = makePlaceholderPage('Admin — Offers', 'Manage banners and promotional offers.');

