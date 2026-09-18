import React, { Suspense, useEffect } from 'react';

import { CartDrawer } from '@/components/cart/CartDrawer';
import { CartLiveRegion } from '@/components/cart/CartLiveRegion';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { PageHeaderSkeleton } from '@/components/ui/Skeleton';
import { ToastContainer } from '@/components/ui/Toast';
import { useAuthStore } from '@/stores/auth.store';
import { useCartStore } from '@/stores/cart.store';
import { Footer } from './Footer';
import { Header } from './Header';

interface AppLayoutProps {
  children: React.ReactNode;
}

/**
 * AppLayout — the root shell for all pages.
 */
export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const fetchCart = useCartStore((s) => s.fetchCart);
  const initAuth = useAuthStore((s) => s.initAuth);
  const initialized = useAuthStore((s) => s.initialized);

  useEffect(() => {
    if (!initialized) {
      initAuth();
    }
  }, [initAuth, initialized]);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  return (
    <div className="min-h-screen flex flex-col bg-bg text-text transition-colors duration-200">
      {/* Skip to Main Content Link for Screen Readers & Keyboard Navigation */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-brand-crimson focus:text-white focus:rounded-md focus:shadow-xl focus:outline-none focus:ring-2 focus:ring-brand-gold font-medium text-xs uppercase tracking-wider"
      >
        Skip to main content
      </a>

      <CartLiveRegion />
      <ToastContainer />
      <CartDrawer />
      <Header />

      <main id="main-content" className="flex-1" tabIndex={-1}>
        <ErrorBoundary>
          <Suspense
            fallback={
              <div className="mx-auto max-w-7xl px-4 py-8 md:px-8">
                <PageHeaderSkeleton />
              </div>
            }
          >
            {children}
          </Suspense>
        </ErrorBoundary>
      </main>

      <Footer />
    </div>
  );
};

