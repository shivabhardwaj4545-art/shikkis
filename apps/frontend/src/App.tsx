import { AnimatePresence, motion } from 'framer-motion';
import React from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';

import { AppLayout } from '@/components/layout/AppLayout';
import { fadeIn, useMotionSafe } from '@/lib/motion';
import {
  AuthPage,
  CatalogPage,
  CheckoutPage,
  CustomerOrdersPage,
  HomePage,
  NotFoundPage,
  OrderTrackingPage,
  PoliciesPage,
  ProductDetailPage,
  ServerErrorPage,
} from '@/pages/index';

const AdminRoutes = React.lazy(() => import('@/pages/admin/AdminRoutes'));

const PageTransition: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const variants = useMotionSafe(fadeIn);
  return (
    <motion.div variants={variants} initial="hidden" animate="visible" exit="exit">
      {children}
    </motion.div>
  );
};

const App: React.FC = () => {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith('/admin');

  if (isAdmin) {
    return (
      <React.Suspense
        fallback={
          <div className="min-h-screen bg-bg flex items-center justify-center">
            <div className="text-center space-y-3">
              <div className="h-10 w-10 mx-auto rounded-full border-2 border-brand-gold border-t-transparent animate-spin" />
              <p className="text-xs text-text-muted font-serif">Loading Shikkis Admin Console...</p>
            </div>
          </div>
        }
      >
        <AdminRoutes />
      </React.Suspense>
    );
  }

  return (
    <AppLayout>
      <AnimatePresence mode="wait" initial={false}>
        <Routes location={location} key={location.pathname}>
          {/* ── Customer routes ─────────────────────────────────────────────── */}
          <Route
            path="/"
            element={
              <PageTransition>
                <HomePage />
              </PageTransition>
            }
          />
          <Route
            path="/catalog"
            element={
              <PageTransition>
                <CatalogPage />
              </PageTransition>
            }
          />
          <Route
            path="/products/:slug"
            element={
              <PageTransition>
                <ProductDetailPage />
              </PageTransition>
            }
          />
          <Route
            path="/auth"
            element={
              <PageTransition>
                <AuthPage />
              </PageTransition>
            }
          />
          <Route
            path="/checkout"
            element={
              <PageTransition>
                <CheckoutPage />
              </PageTransition>
            }
          />
          <Route
            path="/orders"
            element={
              <PageTransition>
                <CustomerOrdersPage />
              </PageTransition>
            }
          />
          <Route
            path="/orders/:id"
            element={
              <PageTransition>
                <OrderTrackingPage />
              </PageTransition>
            }
          />
          <Route
            path="/policies"
            element={
              <PageTransition>
                <PoliciesPage />
              </PageTransition>
            }
          />
          <Route
            path="/policies/:tab"
            element={
              <PageTransition>
                <PoliciesPage />
              </PageTransition>
            }
          />

          {/* ── 500 Server Error ─────────────────────────────────────────── */}
          <Route
            path="/500"
            element={
              <PageTransition>
                <ServerErrorPage />
              </PageTransition>
            }
          />

          {/* ── 404 ────────────────────────────────────────────────────────── */}
          <Route
            path="*"
            element={
              <PageTransition>
                <NotFoundPage />
              </PageTransition>
            }
          />
        </Routes>
      </AnimatePresence>
    </AppLayout>
  );
};

export default App;
