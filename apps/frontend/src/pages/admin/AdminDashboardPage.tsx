import {
  AlertTriangle,
  ArrowUpRight,
  Layers,
  Package,
  Plus,
  RefreshCw,
  Tag,
  Warehouse,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { api, type AdminAuditLogItem } from '@/lib/api';

export const AdminDashboardPage: React.FC = () => {
  const [stats, setStats] = useState({
    totalProducts: 0,
    activeProducts: 0,
    lowStockVariants: 0,
    runningOffers: 0,
    activeBanners: 0,
  });
  const [recentAudit, setRecentAudit] = useState<AdminAuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      setLoading(true);
      const [prodRes, invRes, offRes, banRes, auditRes] = await Promise.all([
        api.adminGetProducts({ limit: 100 }),
        api.adminGetInventory({ limit: 100 }),
        api.adminGetOffers(),
        api.adminGetBanners(),
        api.adminGetInventoryAuditLogs(),
      ]);

      const lowStockCount = invRes.data.filter((i) => i.is_low_stock || i.is_out_of_stock).length;
      const runningCount = offRes.data.filter((o) => o.derived_status === 'running').length;
      const activeBannerCount = banRes.data.filter((b) => b.is_active).length;

      setStats({
        totalProducts: prodRes.pagination.total,
        activeProducts: prodRes.data.filter((p) => p.is_active).length,
        lowStockVariants: lowStockCount,
        runningOffers: runningCount,
        activeBanners: activeBannerCount,
      });

      setRecentAudit(auditRes.data.slice(0, 8));
    } catch (err) {
      console.error('Failed to load dashboard metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* ── Page Title & Action Bar ───────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold text-text">Store Overview</h1>
          <p className="text-xs text-text-muted mt-1">
            Real-time catalog metrics, inventory status, and active boutique campaigns.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border bg-surface text-xs font-medium text-text-muted hover:text-text hover:bg-surface-alt transition-colors"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
          <Link
            to="/admin/products/new"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand-crimson text-white text-xs font-semibold shadow hover:bg-brand-crimson/90 transition-colors"
          >
            <Plus size={15} />
            <span>New Product</span>
          </Link>
        </div>
      </div>

      {/* ── Stat Metric Cards ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Products */}
        <Link
          to="/admin/products"
          className="group p-5 rounded-xl bg-surface border border-border hover:border-brand-crimson/40 transition-all shadow-xs"
        >
          <div className="flex items-center justify-between text-text-muted mb-3">
            <span className="text-xs font-medium uppercase tracking-wider">Catalog Products</span>
            <div className="p-2 rounded-lg bg-brand-crimson/10 text-brand-crimson">
              <Package size={18} />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <div className="font-serif text-3xl font-bold text-text">{stats.totalProducts}</div>
            <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
              {stats.activeProducts} Active
            </div>
          </div>
        </Link>

        {/* Inventory Alert */}
        <Link
          to="/admin/inventory"
          className={`group p-5 rounded-xl bg-surface border transition-all shadow-xs ${
            stats.lowStockVariants > 0
              ? 'border-warning/50 bg-warning/5'
              : 'border-border hover:border-brand-gold/40'
          }`}
        >
          <div className="flex items-center justify-between text-text-muted mb-3">
            <span className="text-xs font-medium uppercase tracking-wider">Low / Out of Stock</span>
            <div
              className={`p-2 rounded-lg ${
                stats.lowStockVariants > 0 ? 'bg-warning/20 text-warning' : 'bg-surface-alt text-text-muted'
              }`}
            >
              <AlertTriangle size={18} />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <div className="font-serif text-3xl font-bold text-text">{stats.lowStockVariants}</div>
            <span className="text-xs text-text-muted group-hover:text-brand-crimson flex items-center gap-1 transition-colors">
              Manage &rarr;
            </span>
          </div>
        </Link>

        {/* Active Offers */}
        <Link
          to="/admin/offers"
          className="group p-5 rounded-xl bg-surface border border-border hover:border-brand-gold/40 transition-all shadow-xs"
        >
          <div className="flex items-center justify-between text-text-muted mb-3">
            <span className="text-xs font-medium uppercase tracking-wider">Running Promotions</span>
            <div className="p-2 rounded-lg bg-brand-gold/15 text-brand-gold">
              <Tag size={18} />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <div className="font-serif text-3xl font-bold text-text">{stats.runningOffers}</div>
            <span className="text-xs text-brand-gold font-medium">Live On Store</span>
          </div>
        </Link>

        {/* Carousel Banners */}
        <Link
          to="/admin/banners"
          className="group p-5 rounded-xl bg-surface border border-border hover:border-brand-gold/40 transition-all shadow-xs"
        >
          <div className="flex items-center justify-between text-text-muted mb-3">
            <span className="text-xs font-medium uppercase tracking-wider">Hero Banners</span>
            <div className="p-2 rounded-lg bg-brand-gold/15 text-brand-gold">
              <Layers size={18} />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <div className="font-serif text-3xl font-bold text-text">{stats.activeBanners}</div>
            <span className="text-xs text-text-muted group-hover:text-brand-crimson flex items-center gap-1 transition-colors">
              Configure &rarr;
            </span>
          </div>
        </Link>
      </div>

      {/* ── Quick Actions Strip ───────────────────────────────────────────── */}
      <div className="p-6 rounded-xl bg-surface border border-border">
        <h2 className="font-serif text-lg font-semibold text-text mb-4">Quick Management Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Link
            to="/admin/products/new"
            className="flex items-center justify-between p-4 rounded-lg bg-surface-alt border border-border/60 hover:border-brand-crimson transition-colors group"
          >
            <div>
              <div className="text-xs font-semibold text-text group-hover:text-brand-crimson">Create New Product</div>
              <div className="text-[11px] text-text-muted">Upload photos & build variant SKU matrix</div>
            </div>
            <ArrowUpRight size={16} className="text-text-muted group-hover:text-brand-crimson transition-colors" />
          </Link>

          <Link
            to="/admin/inventory"
            className="flex items-center justify-between p-4 rounded-lg bg-surface-alt border border-border/60 hover:border-brand-gold transition-colors group"
          >
            <div>
              <div className="text-xs font-semibold text-text group-hover:text-brand-gold">Batch Stock Update</div>
              <div className="text-[11px] text-text-muted">Restock multiple items across categories</div>
            </div>
            <ArrowUpRight size={16} className="text-text-muted group-hover:text-brand-gold transition-colors" />
          </Link>

          <Link
            to="/admin/offers"
            className="flex items-center justify-between p-4 rounded-lg bg-surface-alt border border-border/60 hover:border-brand-crimson transition-colors group"
          >
            <div>
              <div className="text-xs font-semibold text-text group-hover:text-brand-crimson">Launch Promotion</div>
              <div className="text-[11px] text-text-muted">Percent, flat discount or free shipping code</div>
            </div>
            <ArrowUpRight size={16} className="text-text-muted group-hover:text-brand-crimson transition-colors" />
          </Link>
        </div>
      </div>

      {/* ── Recent Inventory Audit Trail ──────────────────────────────────── */}
      <div className="rounded-xl bg-surface border border-border p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Warehouse size={16} className="text-brand-gold" />
            <h2 className="font-serif text-lg font-semibold text-text">Recent Inventory Audit Logs</h2>
          </div>
          <Link to="/admin/inventory" className="text-xs text-brand-crimson hover:underline">
            View All Inventory &rarr;
          </Link>
        </div>

        {recentAudit.length === 0 ? (
          <div className="text-center py-8 text-xs text-text-muted">
            No stock adjustments recorded yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border text-text-muted font-medium">
                  <th className="pb-2.5">Time</th>
                  <th className="pb-2.5">Action</th>
                  <th className="pb-2.5">Variant SKU</th>
                  <th className="pb-2.5">Adjustment</th>
                  <th className="pb-2.5 text-right">Modified By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {recentAudit.map((log) => (
                  <tr key={log.id} className="hover:bg-surface-alt/40 transition-colors">
                    <td className="py-2.5 text-text-muted whitespace-nowrap">
                      {new Date(log.created_at).toLocaleTimeString('en-IN', {
                        hour: '2-digit',
                        minute: '2-digit',
                        day: 'numeric',
                        month: 'short',
                      })}
                    </td>
                    <td className="py-2.5">
                      <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-brand-gold/15 text-brand-gold font-semibold">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-2.5 font-mono text-text">
                      {log.changes?.variant_sku || log.entity_id}
                    </td>
                    <td className="py-2.5">
                      <span className="text-text-muted">{log.changes?.old_stock ?? '—'}</span>
                      <span className="mx-1.5 text-brand-crimson">&rarr;</span>
                      <span className="font-semibold text-text">{log.changes?.new_stock ?? '—'}</span>
                    </td>
                    <td className="py-2.5 text-right text-text-muted">
                      {log.first_name ? `${log.first_name} ${log.last_name || ''}` : 'Owner'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
