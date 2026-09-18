import { motion } from 'framer-motion';
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  Package,
  Search,
  Store,
  Truck,
  UserCheck,
  XCircle,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { api, type OrderListItem } from '@/lib/api';
import { formatPrice } from '@/lib/format';
import { useAuthStore } from '@/stores/auth.store';

const STATUS_TABS = [
  { id: 'all', label: 'All Orders' },
  { id: 'placed', label: 'Placed' },
  { id: 'confirmed', label: 'Confirmed' },
  { id: 'out_for_delivery', label: 'Out for Delivery' },
  { id: 'ready_for_pickup', label: 'Ready for Pickup' },
  { id: 'delivered', label: 'Delivered' },
  { id: 'picked_up', label: 'Picked Up' },
  { id: 'cancelled', label: 'Cancelled' },
];

export const CustomerOrdersPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, initialized, initAuth } = useAuthStore();

  const [orders, setOrders] = useState<OrderListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeStatus, setActiveStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Initialize auth
  useEffect(() => {
    initAuth();
  }, [initAuth]);

  // Fetch orders
  useEffect(() => {
    if (!initialized) return;

    setLoading(true);
    setError(null);

    api
      .getOrders({
        status: activeStatus === 'all' ? undefined : activeStatus,
        search: searchQuery.trim() || undefined,
      })
      .then((res) => {
        setOrders(res.data);
      })
      .catch((err) => {
        console.error('Failed to load orders:', err);
        setError(err.message || 'Unable to load orders. Please try again.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [activeStatus, searchQuery, user, initialized]);

  const getStatusBadge = (status: OrderListItem['order_status']) => {
    switch (status) {
      case 'delivered':
      case 'picked_up':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 size={12} />
            <span className="capitalize">{status.replace('_', ' ')}</span>
          </span>
        );
      case 'out_for_delivery':
      case 'ready_for_pickup':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-brand-gold/15 px-2.5 py-0.5 text-xs font-semibold text-brand-crimson dark:text-brand-gold border border-brand-gold/30">
            <Clock size={12} />
            <span className="capitalize">{status.replace(/_/g, ' ')}</span>
          </span>
        );
      case 'confirmed':
      case 'placed':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-brand-crimson/10 dark:bg-brand-gold/15 px-2.5 py-0.5 text-xs font-semibold text-brand-crimson dark:text-brand-gold border border-brand-crimson/20 dark:border-brand-gold/30">
            <Clock size={12} />
            <span className="capitalize">{status}</span>
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-danger/10 px-2.5 py-0.5 text-xs font-semibold text-danger dark:text-orange-300 border border-danger/20">
            <XCircle size={12} />
            <span>Cancelled</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center rounded-full bg-surface-alt px-2 py-0.5 text-xs font-medium text-text">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-bg py-8 md:py-12">
      <div className="mx-auto max-w-5xl px-4 md:px-8">
        {/* ── Customer Identity Bar ────────────────────────── */}
        <div className="mb-8 rounded-xl border border-brand-gold/30 bg-surface p-4 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-crimson/10 dark:bg-brand-gold/20 text-brand-crimson dark:text-brand-gold">
              <UserCheck size={20} />
            </div>
            <div>
              <p className="text-xs text-text-muted">{user ? 'Authenticated Customer' : 'Guest Account'}</p>
              <h3 className="text-sm font-semibold text-text">
                {user ? `${user.first_name} ${user.last_name || ''} (${user.email})` : 'You are currently browsing as guest'}
              </h3>
            </div>
          </div>
          {!user && (
            <Link
              to="/auth"
              className="inline-flex items-center gap-2 rounded-lg bg-brand-crimson px-4 py-2 text-xs font-semibold text-white shadow hover:bg-brand-crimson/90 transition-colors shrink-0"
            >
              Sign In to View Orders
            </Link>
          )}
        </div>

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="font-serif text-3xl md:text-4xl font-semibold text-text">My Orders</h1>
            <p className="text-xs text-text-muted mt-1 max-w-md">
              View live tracking status, till-slip receipts, tax invoices, and reorder from your Shikkis wardrobe.
            </p>
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-64">
            <Search size={15} className="absolute left-3 top-2.5 text-text-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by order #..."
              className="w-full rounded-lg border border-border bg-surface pl-9 pr-3 py-2 text-xs text-text placeholder:text-text-muted/50 focus:border-brand-gold focus:outline-none"
            />
          </div>
        </div>

        {/* ── Filter Tabs ─────────────────────────────────────────────────── */}
        <div className="mb-8 border-b border-border overflow-x-auto">
          <div className="flex items-center gap-2 min-w-max pb-2">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveStatus(tab.id)}
                className={[
                  'px-3.5 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer',
                  activeStatus === tab.id
                    ? 'bg-brand-crimson text-white shadow-xs'
                    : 'bg-surface border border-border text-text-muted hover:text-text hover:border-brand-gold/60',
                ].join(' ')}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Order List State ────────────────────────────────────────────── */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="h-36 rounded-xl border border-border bg-surface p-6 animate-pulse"
              />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-xl border border-danger/30 bg-danger/10 p-6 text-center text-xs text-danger">
            <AlertCircle size={24} className="mx-auto mb-2" />
            <p>{error}</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="rounded-xl border border-border bg-surface p-12 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-surface-alt text-brand-gold">
              <Package size={28} />
            </div>
            <h3 className="font-serif text-xl font-semibold text-text mb-2">No Orders Found</h3>
            <p className="text-xs text-text-muted max-w-sm mx-auto mb-6">
              {searchQuery || activeStatus !== 'all'
                ? 'No orders match your selected filter criteria. Try clearing search or switching status.'
                : 'You have not placed any orders with this customer account yet.'}
            </p>
            <Link
              to="/catalog"
              className="inline-flex items-center gap-2 rounded-lg bg-brand-crimson px-5 py-2.5 text-xs font-semibold text-white shadow hover:bg-brand-crimson/90 transition-colors"
            >
              <span>Explore Collection</span>
              <ChevronRight size={14} />
            </Link>
          </div>
        ) : (
          /* ── Staggered Entrance List ─────────────────────────────────────── */
          <motion.div
            initial="hidden"
            animate="visible"
            variants={{
              visible: {
                transition: {
                  staggerChildren: 0.08,
                },
              },
            }}
            className="space-y-4"
          >
            {orders.map((ord) => {
              const formattedDate = new Date(ord.created_at).toLocaleDateString('en-IN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              });

              return (
                <motion.div
                  key={ord.id}
                  variants={{
                    hidden: { opacity: 0, y: 12 },
                    visible: { opacity: 1, y: 0 },
                  }}
                  transition={{ duration: 0.25 }}
                  onClick={() => navigate(`/orders/${ord.id}`)}
                  className="group rounded-xl border border-border bg-surface p-5 md:p-6 shadow-xs hover:border-brand-gold/80 hover:shadow-md transition-all cursor-pointer"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border/60">
                    <div>
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="font-mono text-sm font-bold text-text group-hover:text-brand-crimson transition-colors">
                          #{ord.order_number}
                        </span>
                        {getStatusBadge(ord.order_status)}
                        {ord.payment_status === 'pending' && ord.order_status !== 'cancelled' && (
                          <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-600 border border-amber-500/20">
                            PAYMENT PENDING
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-text-muted mt-1">
                        <span className="flex items-center gap-1">
                          <Calendar size={12} />
                          <span>{formattedDate}</span>
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1 capitalize">
                          {ord.fulfillment_type === 'delivery' ? (
                            <>
                              <Truck size={12} className="text-brand-gold" />
                              <span>Doorstep Delivery</span>
                            </>
                          ) : (
                            <>
                              <Store size={12} className="text-brand-gold" />
                              <span>Boutique Pickup</span>
                            </>
                          )}
                        </span>
                      </div>
                    </div>

                    <div className="text-left md:text-right">
                      <span className="text-[11px] text-text-muted block">Order Total</span>
                      <span className="font-serif text-lg font-bold text-brand-crimson dark:text-brand-gold">
                        {formatPrice(ord.total_amount)}
                      </span>
                    </div>
                  </div>

                  {/* Thumbnail Stack & Summary Row */}
                  <div className="pt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      {/* Overlapping Thumbnails Stack */}
                      <div className="flex items-center -space-x-2">
                        {ord.thumbnails.map((thumb, idx) => (
                          <div
                            key={idx}
                            className="h-12 w-12 rounded-lg border-2 border-surface bg-surface-alt overflow-hidden shadow-xs shrink-0"
                          >
                            <img
                              src={thumb || '/placeholder.png'}
                              alt="Item preview"
                              className="h-full w-full object-cover"
                            />
                          </div>
                        ))}
                      </div>
                      <span className="text-xs text-text-muted font-medium">
                        {ord.items_count} {ord.items_count === 1 ? 'item' : 'items'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                      <span className="text-xs font-semibold text-brand-crimson dark:text-brand-gold group-hover:underline inline-flex items-center gap-1">
                        <span>View Tracking & Till Receipt</span>
                        <ChevronRight size={14} />
                      </span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </div>
    </div>
  );
};
