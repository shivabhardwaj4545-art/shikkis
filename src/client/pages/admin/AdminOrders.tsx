import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../hooks/useAuthStore.ts';
import { useToastStore } from '../../hooks/useToastStore.ts';
import { Badge } from '../../components/ui/Badge.tsx';

export const AdminOrders: React.FC = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { token } = useAuthStore();
  const { addToast } = useToastStore();

  const fetchOrders = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/admin/orders', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders);
      }
    } catch (err) {
      console.error('Failed to fetch admin orders:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [token]);

  const handleUpdateStatus = async (orderId: string, status: string) => {
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });

      if (res.ok) {
        addToast('success', `Order status updated to ${status}`);
        fetchOrders();
      } else {
        const errData = await res.json();
        addToast('error', errData.error || 'Update failed');
      }
    } catch {
      addToast('error', 'Network error');
    }
  };

  if (isLoading) {
    return <div className="max-w-7xl mx-auto px-16 py-64 text-center">Loading orders...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-16 sm:px-24 py-32 space-y-24">
      <div className="flex justify-between items-center border-b border-border pb-16">
        <div>
          <h1 className="font-serif text-32 font-bold text-text uppercase">Manage All Customer Orders</h1>
          <p className="text-xs text-text-muted mt-2">Owner Admin Order Fulfillment Center</p>
        </div>
        <Link to="/admin" className="text-xs font-bold text-brand-gold hover:underline">
          Back to Overview
        </Link>
      </div>

      {/* Desktop Real Table (>= 1024px) */}
      <div className="hidden lg:block overflow-x-auto bg-surface border border-border rounded-md">
        <table className="w-full text-left text-xs text-text">
          <thead className="bg-surface-alt/50 border-b border-border uppercase font-semibold text-text-muted">
            <tr>
              <th className="p-16">Order #</th>
              <th className="p-16">Customer</th>
              <th className="p-16">Items</th>
              <th className="p-16">Total (INR)</th>
              <th className="p-16">Payment</th>
              <th className="p-16">Order Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {orders.map((order) => (
              <tr key={order.id} className="hover:bg-surface-alt/20">
                <td className="p-16 font-bold">{order.orderNumber}</td>
                <td className="p-16">
                  <p className="font-semibold">{order.customerName}</p>
                  <p className="text-text-muted text-[10px]">{order.customerEmail}</p>
                </td>
                <td className="p-16 font-semibold">{order.items?.length || 0} items</td>
                <td className="p-16 font-serif font-bold text-brand-crimson dark:text-brand-gold">
                  {((order.totalPaise) / 100).toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })}
                </td>
                <td className="p-16">
                  <Badge variant={order.paymentStatus === 'paid' ? 'success' : 'warning'}>
                    {order.paymentStatus}
                  </Badge>
                </td>
                <td className="p-16">
                  <select
                    value={order.status}
                    onChange={(e) => handleUpdateStatus(order.id, e.target.value)}
                    className="px-8 py-6 text-xs bg-surface border border-border rounded-sm text-text font-semibold min-h-[44px]"
                  >
                    <option value="pending">Pending</option>
                    <option value="processing">Processing</option>
                    <option value="shipped">Shipped</option>
                    <option value="delivered">Delivered</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile / Tablet Card-Per-Row Layout (< 1024px) */}
      <div className="lg:hidden space-y-16">
        {orders.map((order) => (
          <div key={order.id} className="p-20 bg-surface border border-border rounded-md space-y-12 text-xs">
            <div className="flex justify-between items-center border-b border-border pb-8">
              <span className="font-bold text-16 font-serif text-text">{order.orderNumber}</span>
              <Badge variant={order.paymentStatus === 'paid' ? 'success' : 'warning'}>
                {order.paymentStatus}
              </Badge>
            </div>
            <p><strong className="text-text">Customer:</strong> {order.customerName} ({order.customerEmail})</p>
            <p><strong className="text-text">Total:</strong> {((order.totalPaise) / 100).toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })}</p>

            <div className="pt-8 border-t border-border flex items-center justify-between">
              <span className="font-bold text-text">Status:</span>
              <select
                value={order.status}
                onChange={(e) => handleUpdateStatus(order.id, e.target.value)}
                className="px-8 py-6 text-xs bg-surface border border-border rounded-sm text-text font-semibold min-h-[44px]"
              >
                <option value="pending">Pending</option>
                <option value="processing">Processing</option>
                <option value="shipped">Shipped</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
