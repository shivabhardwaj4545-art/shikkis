import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';

import { AdminBannersPage } from './AdminBannersPage';
import { AdminCustomerDetailPage } from './AdminCustomerDetailPage';
import { AdminCustomersPage } from './AdminCustomersPage';
import { AdminDashboardPage } from './AdminDashboardPage';
import { AdminInventoryPage } from './AdminInventoryPage';
import { AdminLayout } from './AdminLayout';
import { AdminOrderDetailPage } from './AdminOrderDetailPage';
import { AdminOrdersPage } from './AdminOrdersPage';
import { AdminOffersPage } from './AdminOffersPage';
import { AdminProductsPage } from './AdminProductsPage';
import { AdminReportsPage } from './AdminReportsPage';
import { ProductEditorPage } from './ProductEditorPage';

export const AdminRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<AdminDashboardPage />} />
        <Route path="orders" element={<AdminOrdersPage />} />
        <Route path="orders/:id" element={<AdminOrderDetailPage />} />
        <Route path="customers" element={<AdminCustomersPage />} />
        <Route path="customers/:id" element={<AdminCustomerDetailPage />} />
        <Route path="products" element={<AdminProductsPage />} />
        <Route path="products/new" element={<ProductEditorPage />} />
        <Route path="products/:id" element={<ProductEditorPage />} />
        <Route path="inventory" element={<AdminInventoryPage />} />
        <Route path="offers" element={<AdminOffersPage />} />
        <Route path="banners" element={<AdminBannersPage />} />
        <Route path="reports" element={<AdminReportsPage />} />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Route>
    </Routes>
  );
};

export default AdminRoutes;
