import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag, Package, Users, IndianRupee, ShieldAlert, Plus, Layers } from 'lucide-react';
import { useAuthStore } from '../../hooks/useAuthStore.ts';
import { Badge } from '../../components/ui/Badge.tsx';

interface AdminStats {
  totalOrders: number;
  totalRevenuePaise: number;
  totalProducts: number;
  totalCustomers: number;
  pendingOrders: number;
}

export const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const { token } = useAuthStore();

  useEffect(() => {
    async function fetchStats() {
      if (!token) return;
      try {
        const res = await fetch('/api/admin/stats', {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok) {
          const data = await res.json();
          setStats(data.stats);
          setRecentOrders(data.recentOrders);
        }
      } catch (err) {
        console.error('Failed to fetch admin stats:', err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchStats();
  }, [token]);

  if (isLoading) {
    return <div className="max-w-7xl mx-auto px-16 py-64 text-center">Loading Owner Portal...</div>;
  }

  const formattedRevenue = ((stats?.totalRevenuePaise || 0) / 100).toLocaleString('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  });

  return (
    <div className="max-w-7xl mx-auto px-16 sm:px-24 py-32 space-y-32">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-16 border-b border-border pb-16">
        <div>
          <span className="text-[10px] font-bold text-brand-gold uppercase tracking-widest flex items-center gap-4">
            <ShieldAlert className="w-14 h-14" /> Verified Owner Role
          </span>
          <h1 className="font-serif text-32 font-bold text-text uppercase">Shikkis Owner Dashboard</h1>
        </div>

        <div className="flex items-center gap-12">
          <Link to="/admin/products" className="px-16 py-10 bg-brand-crimson text-white rounded-sm text-xs font-bold flex items-center gap-6 min-h-[44px]">
            <Plus className="w-16 h-16" /> Add New Product
          </Link>
          <Link to="/admin/offers" className="px-16 py-10 border border-border text-text rounded-sm text-xs font-bold flex items-center gap-6 min-h-[44px]">
            <Layers className="w-16 h-16" /> Manage Banners
          </Link>
        </div>
      </div>

      {/* Analytics KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-24">
        <div className="p-20 bg-surface border border-border rounded-md space-y-8">
          <div className="flex items-center justify-between text-text-muted">
            <span className="text-xs font-semibold uppercase">Total Revenue</span>
            <IndianRupee className="w-20 h-20 text-brand-gold" />
          </div>
          <p className="font-serif text-28 font-bold text-brand-crimson dark:text-brand-gold">{formattedRevenue}</p>
        </div>

        <div className="p-20 bg-surface border border-border rounded-md space-y-8">
          <div className="flex items-center justify-between text-text-muted">
            <span className="text-xs font-semibold uppercase">Total Orders</span>
            <ShoppingBag className="w-20 h-20 text-brand-gold" />
          </div>
          <p className="font-serif text-28 font-bold text-text">{stats?.totalOrders || 0}</p>
        </div>

        <div className="p-20 bg-surface border border-border rounded-md space-y-8">
          <div className="flex items-center justify-between text-text-muted">
            <span className="text-xs font-semibold uppercase">Active Products</span>
            <Package className="w-20 h-20 text-brand-gold" />
          </div>
          <p className="font-serif text-28 font-bold text-text">{stats?.totalProducts || 0}</p>
        </div>

        <div className="p-20 bg-surface border border-border rounded-md space-y-8">
          <div className="flex items-center justify-between text-text-muted">
            <span className="text-xs font-semibold uppercase">Registered Customers</span>
            <Users className="w-20 h-20 text-brand-gold" />
          </div>
          <p className="font-serif text-28 font-bold text-text">{stats?.totalCustomers || 0}</p>
        </div>
      </div>

      {/* Admin Navigation Quick Links */}
      <div className="flex gap-16 border-b border-border pb-12">
        <Link to="/admin" className="text-xs font-bold text-brand-gold border-b-2 border-brand-gold pb-8">
          Overview
        </Link>
        <Link to="/admin/products" className="text-xs font-bold text-text-muted hover:text-text pb-8">
          Catalog & Inventory
        </Link>
        <Link to="/admin/orders" className="text-xs font-bold text-text-muted hover:text-text pb-8">
          Customer Orders
        </Link>
        <Link to="/admin/offers" className="text-xs font-bold text-text-muted hover:text-text pb-8">
          Banners & Offers
        </Link>
      </div>

      {/* Recent Orders List */}
      <div className="bg-surface border border-border rounded-md p-24 space-y-16">
        <h3 className="font-serif text-20 font-bold text-text">Recent Storefront Orders</h3>
        <div className="space-y-12">
          {recentOrders.map((order) => (
            <div key={order.id} className="p-16 border border-border/60 rounded-sm flex flex-col sm:flex-row sm:items-center justify-between gap-12 text-xs">
              <div>
                <p className="font-bold text-text">{order.order_number} • {order.full_name} ({order.email})</p>
                <p className="text-text-muted mt-2">{new Date(order.created_at).toLocaleString('en-IN')}</p>
              </div>

              <div className="flex items-center gap-12">
                <Badge variant={order.payment_status === 'paid' ? 'success' : 'warning'}>
                  {order.payment_status}
                </Badge>

                <span className="font-serif font-bold text-16 text-text">
                  {((order.total_paise) / 100).toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
