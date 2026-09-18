import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Package,
  RefreshCw,
  Search,
  ShoppingBag,
  Truck,
  X,
  XCircle,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { api, type AdminOrderItem } from '@/lib/api';
import { formatPrice } from '@/lib/format';

export const AdminOrdersPage: React.FC = () => {
  const navigate = useNavigate();

  const [orders, setOrders] = useState<AdminOrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Filters
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>('all');
  const [paymentStatus, setPaymentStatus] = useState<string>('all');
  const [fulfillmentType, setFulfillmentType] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const loadOrders = async () => {
    try {
      setLoading(true);
      const res = await api.adminGetOrders({
        page,
        limit: 15,
        search: search.trim() || undefined,
        status: status !== 'all' ? status : undefined,
        payment_status: paymentStatus !== 'all' ? paymentStatus : undefined,
        fulfillment_type: fulfillmentType !== 'all' ? fulfillmentType : undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
      });
      setOrders(res.data);
      setTotal(res.pagination.total);
      setTotalPages(res.pagination.totalPages);
    } catch (err) {
      console.error('Failed to load admin orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, [page, status, paymentStatus, fulfillmentType]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadOrders();
  };

  const handleClearFilters = () => {
    setSearch('');
    setStatus('all');
    setPaymentStatus('all');
    setFulfillmentType('all');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  };

  // Status style helpers
  const getStatusBadge = (orderStatus: string) => {
    switch (orderStatus) {
      case 'delivered':
      case 'picked_up':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            {orderStatus === 'delivered' ? 'Delivered' : 'Picked Up'}
          </span>
        );
      case 'out_for_delivery':
      case 'ready_for_pickup':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <Truck className="w-3 h-3 mr-1" />
            {orderStatus === 'out_for_delivery' ? 'Out for Delivery' : 'Ready for Pickup'}
          </span>
        );
      case 'confirmed':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/20">
            <Package className="w-3 h-3 mr-1" />
            Confirmed
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/20">
            <XCircle className="w-3 h-3 mr-1" />
            Cancelled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-[var(--surface-alt)] text-[var(--text)] border border-[var(--border)]">
            <Clock className="w-3 h-3 mr-1 text-[var(--text-muted)]" />
            Placed
          </span>
        );
    }
  };

  const getPaymentBadge = (payStatus: string) => {
    switch (payStatus) {
      case 'paid':
        return (
          <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
            ● Paid
          </span>
        );
      case 'refunded':
        return (
          <span className="text-[11px] font-semibold text-purple-600 dark:text-purple-400">
            ● Refunded
          </span>
        );
      case 'failed':
        return (
          <span className="text-[11px] font-semibold text-rose-600 dark:text-rose-400">
            ● Failed
          </span>
        );
      default:
        return (
          <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">
            ● Pending
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[var(--text)]">
            Orders Management
          </h1>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Track customer orders, advance fulfillment status, handle refunds, and print packing slips.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={loadOrders}
            className="p-2 border border-[var(--border)] rounded-lg text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-alt)] transition"
            title="Refresh Orders"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[var(--brand-gold)]' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-sm space-y-4">
        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Search by Order #, Customer name, phone, or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-[var(--border)] bg-[var(--surface-alt)] text-[var(--text)] focus:outline-none focus:border-[var(--brand-crimson)]"
            />
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            {/* Status Dropdown */}
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 text-xs rounded-lg border border-[var(--border)] bg-[var(--surface-alt)] text-[var(--text)] focus:outline-none focus:border-[var(--brand-crimson)]"
            >
              <option value="all">All Order Statuses</option>
              <option value="placed">Placed</option>
              <option value="confirmed">Confirmed</option>
              <option value="out_for_delivery">Out for Delivery</option>
              <option value="ready_for_pickup">Ready for Pickup</option>
              <option value="delivered">Delivered</option>
              <option value="picked_up">Picked Up</option>
              <option value="cancelled">Cancelled</option>
            </select>

            {/* Payment Dropdown */}
            <select
              value={paymentStatus}
              onChange={(e) => {
                setPaymentStatus(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 text-xs rounded-lg border border-[var(--border)] bg-[var(--surface-alt)] text-[var(--text)] focus:outline-none focus:border-[var(--brand-crimson)]"
            >
              <option value="all">All Payment Statuses</option>
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
              <option value="refunded">Refunded</option>
              <option value="failed">Failed</option>
            </select>

            {/* Fulfillment Dropdown */}
            <select
              value={fulfillmentType}
              onChange={(e) => {
                setFulfillmentType(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 text-xs rounded-lg border border-[var(--border)] bg-[var(--surface-alt)] text-[var(--text)] focus:outline-none focus:border-[var(--brand-crimson)]"
            >
              <option value="all">All Fulfillment</option>
              <option value="delivery">Doorstep Delivery</option>
              <option value="pickup">Boutique Pickup</option>
            </select>

            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-[var(--brand-crimson)] text-white hover:opacity-90 transition"
            >
              Filter
            </button>

            {(search || status !== 'all' || paymentStatus !== 'all' || fulfillmentType !== 'all') && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="p-2 text-xs text-[var(--text-muted)] hover:text-[var(--text)] rounded-lg border border-[var(--border)] flex items-center space-x-1"
                title="Clear Filters"
              >
                <X className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Reset</span>
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Orders Count Summary */}
      <div className="flex justify-between items-center text-xs text-[var(--text-muted)] px-1">
        <span>
          Showing <strong>{orders.length}</strong> of <strong>{total}</strong> orders
        </span>
      </div>

      {/* Responsive Orders Display */}
      {loading ? (
        <div className="py-20 text-center text-xs text-[var(--text-muted)]">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[var(--brand-gold)] mb-3" />
          Loading orders...
        </div>
      ) : orders.length === 0 ? (
        <div className="p-12 text-center rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)]">
          <ShoppingBag className="w-10 h-10 mx-auto mb-3 opacity-40 text-[var(--brand-gold)]" />
          <p className="text-sm font-semibold text-[var(--text)]">No orders found</p>
          <p className="text-xs mt-1">Try adjusting your search or active filter parameters.</p>
        </div>
      ) : (
        <>
          {/* Desktop Table: Visible >= 1024px */}
          <div className="hidden lg:block overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--surface-alt)] text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  <th className="py-3 px-4">Order #</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Items</th>
                  <th className="py-3 px-4">Fulfillment</th>
                  <th className="py-3 px-4">Payment</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Total</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)] text-xs">
                {orders.map((ord) => (
                  <tr
                    key={ord.id}
                    onClick={() => navigate(`/admin/orders/${ord.id}`)}
                    className="hover:bg-[var(--surface-alt)]/60 cursor-pointer transition"
                  >
                    <td className="py-3.5 px-4 font-mono font-bold text-[var(--brand-crimson)]">
                      {ord.order_number}
                    </td>
                    <td className="py-3.5 px-4 text-[var(--text-muted)]">
                      {new Date(ord.created_at).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-[var(--text)]">{ord.customer_name}</div>
                      <div className="text-[11px] text-[var(--text-muted)] font-mono">{ord.customer_phone}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center space-x-1.5">
                        <div className="flex -space-x-2 overflow-hidden">
                          {ord.thumbnails.map((img, idx) => (
                            <img
                              key={idx}
                              src={img}
                              alt="thumb"
                              className="inline-block h-6 w-6 rounded-full ring-2 ring-[var(--surface)] object-cover"
                            />
                          ))}
                        </div>
                        <span className="text-[11px] text-[var(--text-muted)] font-mono">
                          {ord.total_items} {ord.total_items === 1 ? 'item' : 'items'}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="capitalize font-medium text-[var(--text)]">
                        {ord.fulfillment_type === 'pickup' ? '🏪 Pickup' : '🚚 Delivery'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="space-y-0.5">
                        <div>{getPaymentBadge(ord.payment_status)}</div>
                        <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-mono">
                          {ord.payment_method}
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">{getStatusBadge(ord.order_status)}</td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-[var(--text)]">
                      {formatPrice(ord.total_amount)}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <Link
                        to={`/admin/orders/${ord.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="p-1.5 rounded-lg border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--brand-gold)] hover:border-[var(--brand-gold)] inline-flex items-center"
                        title="View Order Details"
                      >
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile/Tablet Card-per-Row: Visible < 1024px */}
          <div className="lg:hidden space-y-3">
            {orders.map((ord) => (
              <div
                key={ord.id}
                onClick={() => navigate(`/admin/orders/${ord.id}`)}
                className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-sm space-y-3 cursor-pointer hover:border-[var(--brand-gold)] transition"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-mono text-sm font-bold text-[var(--brand-crimson)]">
                      {ord.order_number}
                    </span>
                    <p className="text-[11px] text-[var(--text-muted)]">
                      {new Date(ord.created_at).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                  <div>{getStatusBadge(ord.order_status)}</div>
                </div>

                <div className="flex justify-between items-center py-2 border-y border-[var(--border)]/60 text-xs">
                  <div>
                    <p className="font-semibold text-[var(--text)]">{ord.customer_name}</p>
                    <p className="text-[11px] text-[var(--text-muted)] font-mono">{ord.customer_phone}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs uppercase font-medium text-[var(--text)]">
                      {ord.fulfillment_type === 'pickup' ? '🏪 Pickup' : '🚚 Delivery'}
                    </p>
                    <div>{getPaymentBadge(ord.payment_status)}</div>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-1">
                  <div className="flex items-center space-x-2">
                    <div className="flex -space-x-2 overflow-hidden">
                      {ord.thumbnails.map((img, idx) => (
                        <img
                          key={idx}
                          src={img}
                          alt="thumb"
                          className="inline-block h-6 w-6 rounded-full ring-1 ring-[var(--surface)] object-cover"
                        />
                      ))}
                    </div>
                    <span className="text-[11px] text-[var(--text-muted)] font-mono">
                      {ord.total_items} items
                    </span>
                  </div>

                  <div className="text-right font-mono font-bold text-sm text-[var(--brand-crimson)]">
                    {formatPrice(ord.total_amount)}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex justify-between items-center pt-4">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-[var(--border)] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[var(--surface-alt)]"
              >
                Previous
              </button>
              <span className="text-xs text-[var(--text-muted)]">
                Page {page} of {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-[var(--border)] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[var(--surface-alt)]"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};
