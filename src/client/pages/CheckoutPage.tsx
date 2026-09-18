import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { ShieldCheck, CreditCard, ArrowRight } from 'lucide-react';
import { useCartStore } from '../hooks/useCartStore.ts';
import { useAuthStore } from '../hooks/useAuthStore.ts';
import { useToastStore } from '../hooks/useToastStore.ts';
import { Button } from '../components/ui/Button.tsx';

export const CheckoutPage: React.FC = () => {
  const { items, totalPaise, clearCart } = useCartStore();
  const { user, token } = useAuthStore();
  const { addToast } = useToastStore();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState(user?.fullName || '');
  const [addressLine1, setAddressLine1] = useState('42 Rambagh Palace Road');
  const [addressLine2, setAddressLine2] = useState('Suite 102');
  const [city, setCity] = useState('Jaipur');
  const [state, setState] = useState('Rajasthan');
  const [pincode, setPincode] = useState('302005');
  const [phone, setPhone] = useState(user?.phone || '9876543210');
  const [isProcessing, setIsProcessing] = useState(false);

  const subtotalPaise = totalPaise();
  const taxPaise = Math.round(subtotalPaise * 0.05);
  const totalAmountPaise = subtotalPaise + taxPaise;

  const subtotalFormatted = (subtotalPaise / 100).toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
  const taxFormatted = (taxPaise / 100).toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
  const grandTotalFormatted = (totalAmountPaise / 100).toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      addToast('info', 'Please sign in to complete your checkout');
      navigate('/auth?redirect=/checkout');
      return;
    }

    if (items.length === 0) {
      addToast('error', 'Your shopping bag is empty');
      return;
    }

    setIsProcessing(true);

    try {
      // 1. Create Order on Server with server-side price computation & idempotency
      const idempotencyKey = uuidv4();
      const orderPayload = {
        items: items.map((i) => ({ productId: i.productId, variantId: i.variantId, quantity: i.quantity })),
        shippingAddress: { fullName, addressLine1, addressLine2, city, state, pincode, phone },
        idempotencyKey,
      };

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(orderPayload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to place order');
      }

      const createdOrder = data.order;

      // 2. Initiate Razorpay Payment Order
      await fetch('/api/payment/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ orderId: createdOrder.id }),
      });

      // 3. Trigger Payment completion (in dev mode, simulate via /api/payment/verify-dev)
      const payRes = await fetch('/api/payment/verify-dev', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ orderId: createdOrder.id, paymentId: `pay_${uuidv4().substring(0, 8)}` }),
      });

      if (payRes.ok) {
        clearCart();
        addToast('success', 'Payment successful! Order confirmed.');
        navigate(`/orders/${createdOrder.id}`);
      } else {
        throw new Error('Payment processing failed');
      }
    } catch (err: any) {
      addToast('error', err.message || 'An error occurred during checkout');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-16 sm:px-24 py-32 space-y-32">
      <div className="border-b border-border pb-16">
        <h1 className="font-serif text-32 font-bold text-text uppercase">Luxury Checkout</h1>
        <p className="text-xs text-text-muted mt-4">Insured Express Shipping & Razorpay Payment</p>
      </div>

      <form onSubmit={handlePlaceOrder} className="grid grid-cols-1 lg:grid-cols-3 gap-32 items-start">
        {/* Shipping Form */}
        <div className="lg:col-span-2 space-y-24 bg-surface border border-border p-24 rounded-md">
          <h2 className="font-serif text-20 font-bold text-text flex items-center gap-8 border-b border-border pb-12">
            <ShieldCheck className="w-20 h-20 text-brand-gold" /> Shipping Address & Recipient
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-16">
            <div>
              <label className="block text-xs font-semibold text-text uppercase mb-4">Full Name</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-12 py-10 text-sm bg-surface border border-border rounded-sm text-text focus:outline-none focus:ring-2 focus:ring-brand-gold min-h-[44px]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-text uppercase mb-4">Phone Number</label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-12 py-10 text-sm bg-surface border border-border rounded-sm text-text focus:outline-none focus:ring-2 focus:ring-brand-gold min-h-[44px]"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-text uppercase mb-4">Address Line 1</label>
              <input
                type="text"
                required
                value={addressLine1}
                onChange={(e) => setAddressLine1(e.target.value)}
                className="w-full px-12 py-10 text-sm bg-surface border border-border rounded-sm text-text focus:outline-none focus:ring-2 focus:ring-brand-gold min-h-[44px]"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-text uppercase mb-4">Address Line 2 (Optional)</label>
              <input
                type="text"
                value={addressLine2}
                onChange={(e) => setAddressLine2(e.target.value)}
                className="w-full px-12 py-10 text-sm bg-surface border border-border rounded-sm text-text focus:outline-none focus:ring-2 focus:ring-brand-gold min-h-[44px]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-text uppercase mb-4">City</label>
              <input
                type="text"
                required
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-12 py-10 text-sm bg-surface border border-border rounded-sm text-text focus:outline-none focus:ring-2 focus:ring-brand-gold min-h-[44px]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-text uppercase mb-4">State</label>
              <input
                type="text"
                required
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="w-full px-12 py-10 text-sm bg-surface border border-border rounded-sm text-text focus:outline-none focus:ring-2 focus:ring-brand-gold min-h-[44px]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-text uppercase mb-4">Pincode (6 digits)</label>
              <input
                type="text"
                required
                pattern="\d{6}"
                value={pincode}
                onChange={(e) => setPincode(e.target.value)}
                className="w-full px-12 py-10 text-sm bg-surface border border-border rounded-sm text-text focus:outline-none focus:ring-2 focus:ring-brand-gold min-h-[44px]"
              />
            </div>
          </div>
        </div>

        {/* Order Summary & Payment Button */}
        <div className="bg-surface border border-border p-24 rounded-md space-y-20">
          <h2 className="font-serif text-20 font-bold text-text border-b border-border pb-12 flex items-center gap-8">
            <CreditCard className="w-20 h-20 text-brand-gold" /> Order Summary
          </h2>

          <div className="space-y-12 max-h-60 overflow-y-auto pr-4">
            {items.map((item) => (
              <div key={item.id} className="flex justify-between text-xs py-4">
                <div>
                  <p className="font-bold text-text">{item.title}</p>
                  <p className="text-text-muted">Size: {item.size} x {item.quantity}</p>
                </div>
                <p className="font-serif font-bold text-text">
                  {(( (item.discountPricePaise || item.pricePaise) * item.quantity) / 100).toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })}
                </p>
              </div>
            ))}
          </div>

          <div className="pt-16 border-t border-border space-y-8 text-xs">
            <div className="flex justify-between text-text-muted">
              <span>Subtotal</span>
              <span className="font-bold text-text">{subtotalFormatted}</span>
            </div>
            <div className="flex justify-between text-text-muted">
              <span>GST (5%)</span>
              <span className="font-bold text-text">{taxFormatted}</span>
            </div>
            <div className="flex justify-between text-text-muted">
              <span>Express Insured Shipping</span>
              <span className="font-bold text-success uppercase">FREE</span>
            </div>
            <div className="flex justify-between text-base font-bold text-text pt-12 border-t border-border">
              <span>Grand Total</span>
              <span className="font-serif text-20 text-brand-crimson dark:text-brand-gold">{grandTotalFormatted}</span>
            </div>
          </div>

          <Button fullWidth size="lg" type="submit" disabled={isProcessing} className="flex items-center justify-center gap-8">
            {isProcessing ? 'Processing Payment...' : 'Pay via Razorpay'} <ArrowRight className="w-18 h-18" />
          </Button>

          <p className="text-[10px] text-text-muted text-center leading-relaxed">
            Encrypted with 256-bit SSL via Razorpay. Certified handloom authenticity guarantee included.
          </p>
        </div>
      </form>
    </div>
  );
};
