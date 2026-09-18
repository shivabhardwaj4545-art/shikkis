import React, { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Navbar } from './components/common/Navbar.tsx';
import { Footer } from './components/common/Footer.tsx';
import { ToastContainer } from './components/ui/Toast.tsx';
import { CartDrawer } from './components/cart/CartDrawer.tsx';
import { HomePage } from './pages/HomePage.tsx';
import { CatalogPage } from './pages/CatalogPage.tsx';
import { ProductDetailPage } from './pages/ProductDetailPage.tsx';
import { AuthPage } from './pages/AuthPage.tsx';
import { CheckoutPage } from './pages/CheckoutPage.tsx';
import { OrderTrackingPage, CustomerOrdersPage } from './pages/OrderTrackingPage.tsx';
import { AdminDashboard } from './pages/admin/AdminDashboard.tsx';
import { AdminProducts } from './pages/admin/AdminProducts.tsx';
import { AdminOrders } from './pages/admin/AdminOrders.tsx';
import { AdminOffers } from './pages/admin/AdminOffers.tsx';
import { useAuthStore } from './hooks/useAuthStore.ts';
import { useCartStore } from './hooks/useCartStore.ts';

export const App: React.FC = () => {
  const { initialize: initAuth } = useAuthStore();
  const { fetchCart } = useCartStore();

  useEffect(() => {
    initAuth();
    fetchCart();
  }, [initAuth, fetchCart]);

  return (
    <div className="min-h-screen flex flex-col bg-bg text-text selection:bg-brand-gold selection:text-text transition-colors duration-200">
      <ToastContainer />
      <Navbar />
      <CartDrawer />

      <main className="flex-1">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/catalog" element={<CatalogPage />} />
          <Route path="/products/:slug" element={<ProductDetailPage />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/orders" element={<CustomerOrdersPage />} />
          <Route path="/orders/:id" element={<OrderTrackingPage />} />

          {/* Owner Admin Routes */}
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/products" element={<AdminProducts />} />
          <Route path="/admin/orders" element={<AdminOrders />} />
          <Route path="/admin/offers" element={<AdminOffers />} />
        </Routes>
      </main>

      <Footer />
    </div>
  );
};

export default App;
