import {
  AlertCircle,
  ArrowLeft,
  ExternalLink,
  Lock,
  Mail,
  Phone,
  RefreshCw,
  ShoppingBag,
  User,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { api, type AdminCustomerDetail } from '@/lib/api';
import { formatPrice } from '@/lib/format';

export const AdminCustomerDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [data, setData] = useState<AdminCustomerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCustomer = async () => {
      if (!id) return;
      try {
        setLoading(true);
        setError(null);
        const res = await api.adminGetCustomerById(id);
        setData(res);
      } catch (err: any) {
        setError(err.message || 'Failed to load customer profile');
      } finally {
        setLoading(false);
      }
    };
    fetchCustomer();
  }, [id]);

  if (loading) {
    return (
      <div className="py-24 text-center text-xs text-[var(--text-muted)]">
        <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[var(--brand-gold)] mb-3" />
        Loading customer CRM profile...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 max-w-lg mx-auto text-center rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)]">
        <AlertCircle className="w-10 h-10 mx-auto text-[var(--brand-crimson)] mb-3" />
        <h2 className="text-lg font-semibold text-[var(--text)]">Customer Profile Not Found</h2>
        <p className="text-xs mt-1">{error || 'Could not locate customer records.'}</p>
        <button
          onClick={() => navigate('/admin/customers')}
          className="mt-4 px-4 py-2 text-xs font-semibold rounded-lg bg-[var(--brand-crimson)] text-white"
        >
          Back to Directory
        </button>
      </div>
    );
  }

  const { customer, analytics, addresses, orders } = data;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Back Button & Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[var(--border)] pb-4">
        <div className="flex items-center space-x-3">
          <Link
            to="/admin/customers"
            className="p-2 border border-[var(--border)] rounded-lg text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-alt)] transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-serif font-bold text-[var(--text)]">{customer.name}</h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded border border-[var(--border)] bg-[var(--surface-alt)] text-[var(--text-muted)]">
                {customer.id}
              </span>
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Customer since{' '}
              {new Date(customer.created_at).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </p>
          </div>
        </div>

        {/* Read-Only Banner Badge */}
        <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300 text-xs">
          <Lock className="w-3.5 h-3.5" />
          <span className="font-semibold">Read-Only CRM</span>
          <span className="text-[10px] opacity-80">(Customer data protected)</span>
        </div>
      </div>

      {/* ── Analytics KPI Cards ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] block">
            Lifetime Spend
          </span>
          <p className="text-xl sm:text-2xl font-serif font-bold text-[var(--brand-crimson)] mt-1">
            {formatPrice(analytics.lifetime_spend)}
          </p>
          <span className="text-[10px] text-[var(--text-muted)]">Across paid purchases</span>
        </div>

        <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] block">
            Total Orders
          </span>
          <p className="text-xl sm:text-2xl font-serif font-bold text-[var(--text)] mt-1">
            {analytics.total_orders}
          </p>
          <div className="flex items-center space-x-2 text-[10px] text-[var(--text-muted)]">
            <span className="text-emerald-600">{analytics.completed_orders} completed</span>
            <span>•</span>
            <span className="text-rose-600">{analytics.cancelled_orders} cancelled</span>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] block">
            Average Order Value
          </span>
          <p className="text-xl sm:text-2xl font-serif font-bold text-[var(--brand-gold)] mt-1">
            {formatPrice(analytics.aov)}
          </p>
          <span className="text-[10px] text-[var(--text-muted)]">Net average per checkout</span>
        </div>

        <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] block">
            Last Order Date
          </span>
          <p className="text-base sm:text-lg font-serif font-bold text-[var(--text)] mt-1">
            {analytics.last_order_date
              ? new Date(analytics.last_order_date).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })
              : 'No orders yet'}
          </p>
          <span className="text-[10px] text-[var(--text-muted)] font-mono">Recent activity</span>
        </div>
      </div>

      {/* ── 2 Columns: Contact & Addresses (Left) vs Order History (Right) ─ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Contact & Addresses */}
        <div className="space-y-6">
          {/* Contact Card */}
          <div className="p-5 rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-sm space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] border-b border-[var(--border)] pb-2">
              Personal Information
            </h3>
            <div className="space-y-2 text-xs">
              <div className="flex items-center space-x-2">
                <User className="w-4 h-4 text-[var(--text-muted)]" />
                <span className="font-semibold text-[var(--text)]">{customer.name}</span>
              </div>
              <div className="flex items-center space-x-2 text-[var(--text-muted)]">
                <Mail className="w-4 h-4 text-[var(--text-muted)]" />
                <span>{customer.email}</span>
              </div>
              <div className="flex items-center space-x-2 text-[var(--text-muted)] font-mono">
                <Phone className="w-4 h-4 text-[var(--text-muted)]" />
                <span>{customer.phone || 'No phone recorded'}</span>
              </div>
            </div>
          </div>

          {/* Saved Addresses */}
          <div className="p-5 rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-sm space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] border-b border-[var(--border)] pb-2">
              Saved Addresses ({addresses.length})
            </h3>
            {addresses.length === 0 ? (
              <p className="text-xs text-[var(--text-muted)] italic">No saved addresses found.</p>
            ) : (
              <div className="space-y-3">
                {addresses.map((addr) => (
                  <div
                    key={addr.id}
                    className="p-3 rounded-lg border border-[var(--border)] bg-[var(--surface-alt)] text-xs space-y-1"
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-semibold uppercase tracking-wider text-[10px] text-[var(--brand-crimson)]">
                        {addr.label || 'Home'}
                      </span>
                      {addr.is_default === 1 && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-emerald-500/15 text-emerald-600">
                          Default
                        </span>
                      )}
                    </div>
                    <p className="font-medium text-[var(--text)]">{addr.full_name}</p>
                    <p className="text-[var(--text-muted)]">
                      {addr.line1}, {addr.line2 ? `${addr.line2}, ` : ''}
                    </p>
                    <p className="text-[var(--text-muted)]">
                      {addr.city}, {addr.state} - <span className="font-mono">{addr.pincode}</span>
                    </p>
                    <p className="text-[var(--text-muted)] font-mono">Phone: {addr.phone}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Customer Orders History */}
        <div className="lg:col-span-2 space-y-4">
          <div className="p-6 rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-sm space-y-4">
            <h3 className="text-base font-serif font-bold text-[var(--text)] border-b border-[var(--border)] pb-3">
              Order History ({orders.length})
            </h3>

            {orders.length === 0 ? (
              <div className="py-12 text-center text-xs text-[var(--text-muted)]">
                <ShoppingBag className="w-8 h-8 mx-auto mb-2 opacity-40 text-[var(--brand-gold)]" />
                No orders placed yet.
              </div>
            ) : (
              <div className="divide-y divide-[var(--border)]">
                {orders.map((ord) => (
                  <div
                    key={ord.id}
                    onClick={() => navigate(`/admin/orders/${ord.id}`)}
                    className="py-3.5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 hover:bg-[var(--surface-alt)]/40 p-2 rounded-lg cursor-pointer transition"
                  >
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-xs font-bold text-[var(--brand-crimson)]">
                          {ord.order_number}
                        </span>
                        <span className="text-[11px] text-[var(--text-muted)]">
                          • {ord.item_count} {ord.item_count === 1 ? 'item' : 'items'}
                        </span>
                        <span className="text-[10px] uppercase tracking-wider font-semibold text-[var(--text-muted)]">
                          ({ord.fulfillment_type})
                        </span>
                      </div>
                      <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                        {new Date(ord.created_at).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </p>
                    </div>

                    <div className="flex items-center space-x-3 w-full sm:w-auto justify-between sm:justify-end">
                      <div className="text-right">
                        <p className="font-mono font-bold text-xs text-[var(--text)]">
                          {formatPrice(ord.total_amount)}
                        </p>
                        <span className="text-[10px] capitalize font-medium text-[var(--text-muted)]">
                          {ord.order_status.replace(/_/g, ' ')}
                        </span>
                      </div>

                      <Link
                        to={`/admin/orders/${ord.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="p-1.5 rounded-lg border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--brand-gold)]"
                        title="View Receipt"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
