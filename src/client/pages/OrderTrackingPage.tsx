import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle2, Clock, PackageCheck, Truck, Home, ArrowLeft } from 'lucide-react';
import { Order } from '../../shared/types/index.ts';
import { useAuthStore } from '../hooks/useAuthStore.ts';
import { Badge } from '../components/ui/Badge.tsx';

export const OrderTrackingPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const { token } = useAuthStore();

  useEffect(() => {
    async function fetchOrder() {
      if (!token || !id) return;
      try {
        const res = await fetch(`/api/orders/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.status === 404) {
          setError('Order not found or access denied');
        } else if (res.ok) {
          const data = await res.json();
          setOrder(data.order);
        } else {
          setError('Could not retrieve order details');
        }
      } catch (err) {
        setError('Network error');
      } finally {
        setIsLoading(false);
      }
    }

    fetchOrder();
  }, [id, token]);

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-16 py-64 text-center">
        <p className="text-sm font-serif">Loading order status timeline...</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="max-w-md mx-auto px-16 py-64 text-center space-y-16">
        <h2 className="font-serif text-28 font-bold text-text">Order Not Found</h2>
        <p className="text-xs text-text-muted">{error}</p>
        <Link to="/orders" className="inline-block text-xs font-bold text-brand-gold hover:underline">
          Return to My Orders
        </Link>
      </div>
    );
  }

  const steps = [
    { key: 'pending', label: 'Order Placed', icon: Clock },
    { key: 'processing', label: 'Atelier Processing', icon: PackageCheck },
    { key: 'shipped', label: 'Express Shipped', icon: Truck },
    { key: 'delivered', label: 'Delivered', icon: Home },
  ];

  const statusOrder = ['pending', 'processing', 'shipped', 'delivered'];
  const currentStepIndex = statusOrder.indexOf(order.status);

  const formattedTotal = (order.totalPaise / 100).toLocaleString('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  });

  return (
    <div className="max-w-4xl mx-auto px-16 sm:px-24 py-32 space-y-32">
      <Link to="/orders" className="inline-flex items-center gap-6 text-xs text-brand-gold hover:underline font-bold">
        <ArrowLeft className="w-14 h-14" /> Back to My Orders
      </Link>

      <div className="bg-surface border border-border p-24 sm:p-32 rounded-md space-y-24">
        {/* Order Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-12 border-b border-border pb-16">
          <div>
            <span className="text-[10px] font-bold tracking-widest text-brand-gold uppercase">Order Confirmation</span>
            <h1 className="font-serif text-28 font-bold text-text">{order.orderNumber}</h1>
            <p className="text-xs text-text-muted mt-2">
              Placed on {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>

          <div className="flex items-center gap-12">
            <Badge variant={order.paymentStatus === 'paid' ? 'success' : 'warning'}>
              Payment: {order.paymentStatus.toUpperCase()}
            </Badge>
            <Badge variant="gold">Status: {order.status.toUpperCase()}</Badge>
          </div>
        </div>

        {/* Animated Order Status Timeline filling in sequence */}
        <div className="py-24">
          <div className="grid grid-cols-4 gap-8 relative">
            {steps.map((step, idx) => {
              const isCompleted = idx <= currentStepIndex;
              const Icon = step.icon;

              return (
                <div key={step.key} className="flex flex-col items-center text-center space-y-8 relative z-10">
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: idx * 0.15, duration: 0.3 }}
                    className={`w-40 h-40 rounded-full flex items-center justify-center border-2 transition-colors ${
                      isCompleted
                        ? 'bg-brand-crimson text-white border-brand-crimson dark:bg-brand-gold dark:text-text dark:border-brand-gold'
                        : 'bg-surface text-text-muted border-border'
                    }`}
                  >
                    {isCompleted ? <CheckCircle2 className="w-20 h-20" /> : <Icon className="w-18 h-18" />}
                  </motion.div>
                  <span className={`text-xs font-bold ${isCompleted ? 'text-text' : 'text-text-muted'}`}>
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Item Summary */}
        <div className="space-y-12 border-t border-border pt-20">
          <h3 className="font-serif text-18 font-bold text-text">Ordered Items</h3>
          <div className="space-y-8">
            {order.items?.map((item) => (
              <div key={item.id} className="flex justify-between items-center text-xs py-8 border-b border-border/50">
                <div>
                  <p className="font-bold text-text">{item.title}</p>
                  <p className="text-text-muted">Size: {item.size} | Color: {item.color} | Qty: {item.quantity}</p>
                </div>
                <p className="font-serif font-bold text-text">
                  {((item.pricePaise * item.quantity) / 100).toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })}
                </p>
              </div>
            ))}
          </div>

          <div className="flex justify-between items-center text-sm font-bold text-text pt-12">
            <span>Total Paid</span>
            <span className="font-serif text-20 text-brand-crimson dark:text-brand-gold">{formattedTotal}</span>
          </div>
        </div>

        {/* Shipping Destination */}
        <div className="border-t border-border pt-16 text-xs text-text-muted space-y-4">
          <p className="font-bold text-text">Delivery Destination:</p>
          <p>{order.shippingAddress.fullName} — {order.shippingAddress.phone}</p>
          <p>{order.shippingAddress.addressLine1}, {order.shippingAddress.addressLine2 || ''}</p>
          <p>{order.shippingAddress.city}, {order.shippingAddress.state} — {order.shippingAddress.pincode}</p>
        </div>
      </div>
    </div>
  );
};

export const CustomerOrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { token } = useAuthStore();

  useEffect(() => {
    async function fetchOrders() {
      if (!token) return;
      try {
        const res = await fetch('/api/orders', {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok) {
          const data = await res.json();
          setOrders(data.orders);
        }
      } catch (err) {
        console.error('Failed to fetch orders:', err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchOrders();
  }, [token]);

  if (isLoading) {
    return <div className="max-w-4xl mx-auto px-16 py-64 text-center">Loading orders...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto px-16 sm:px-24 py-32 space-y-24">
      <h1 className="font-serif text-32 font-bold text-text uppercase">My Orders & Trackers</h1>

      {orders.length === 0 ? (
        <div className="text-center py-48 bg-surface border border-border rounded-md p-24">
          <p className="text-sm text-text-muted">You have no active or previous orders.</p>
          <Link to="/catalog" className="inline-block mt-12">
            <Badge variant="gold">Explore Collections</Badge>
          </Link>
        </div>
      ) : (
        <div className="space-y-16">
          {orders.map((order) => {
            const formattedTotal = (order.totalPaise / 100).toLocaleString('en-IN', {
              style: 'currency',
              currency: 'INR',
              maximumFractionDigits: 0,
            });

            return (
              <div key={order.id} className="p-20 bg-surface border border-border rounded-md flex flex-col sm:flex-row sm:items-center justify-between gap-16">
                <div>
                  <div className="flex items-center gap-8">
                    <span className="font-serif font-bold text-18 text-text">{order.orderNumber}</span>
                    <Badge variant={order.paymentStatus === 'paid' ? 'success' : 'warning'}>{order.paymentStatus}</Badge>
                  </div>
                  <p className="text-xs text-text-muted mt-4">
                    {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} • {order.items?.length || 0} items
                  </p>
                </div>

                <div className="flex items-center gap-16">
                  <span className="font-serif text-18 font-bold text-brand-crimson dark:text-brand-gold">{formattedTotal}</span>
                  <Link to={`/orders/${order.id}`}>
                    <Badge variant="outline">Track Order</Badge>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
