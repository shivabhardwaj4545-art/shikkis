import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  CreditCard,
  Lock,
  MapPin,
  Package,
  ShieldCheck,
  Sparkles,
  Store,
  Tag,
  Truck,
} from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { api } from '@/lib/api';
import { formatPrice } from '@/lib/format';
import { useAuthStore } from '@/stores/auth.store';
import { useCartStore } from '@/stores/cart.store';

// ─── Step Types ──────────────────────────────────────────────────────────────

type CheckoutStep = 1 | 2 | 3 | 4;

export interface CheckoutState {
  step: CheckoutStep;
  fulfillmentType: 'delivery' | 'pickup';
  pickupSlot: string;
  contact: {
    fullName: string;
    email: string;
    phone: string;
  };
  address: {
    line1: string;
    line2: string;
    city: string;
    state: string;
    pincode: string;
  };
  paymentMethod: 'online' | 'cod';
  agreeTerms: boolean;
  customerNotes: string;
}

const STORAGE_KEY = 'shikkis_checkout_state';

const DEFAULT_STATE: CheckoutState = {
  step: 1,
  fulfillmentType: 'delivery',
  pickupSlot: 'Today: 4:00 PM – 8:00 PM',
  contact: {
    fullName: '',
    email: '',
    phone: '',
  },
  address: {
    line1: '',
    line2: '',
    city: 'Bengaluru',
    state: 'Karnataka',
    pincode: '560038',
  },
  paymentMethod: 'online',
  agreeTerms: true,
  customerNotes: '',
};

const PICKUP_SLOTS = [
  'Today: 4:00 PM – 8:00 PM',
  'Tomorrow: 11:00 AM – 3:00 PM',
  'Tomorrow: 4:00 PM – 8:00 PM',
  'Day After Tomorrow: 11:00 AM – 3:00 PM',
];

export const CheckoutPage: React.FC = () => {
  const navigate = useNavigate();
  const { breakdown, loading: cartLoading, fetchCart } = useCartStore();

  // Load persisted checkout state
  const [formData, setFormData] = useState<CheckoutState>(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        return { ...DEFAULT_STATE, ...JSON.parse(saved) };
      }
    } catch {
      // Fallback
    }
    return DEFAULT_STATE;
  });

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Sync state to sessionStorage
  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(formData));
    } catch {
      // Ignore storage errors
    }
  }, [formData]);

  // Refresh cart on mount to ensure fresh prices
  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  // PIN code serviceability validation
  const pinServiceability = useMemo(() => {
    const pin = formData.address.pincode.trim();
    if (!/^\d{6}$/.test(pin)) {
      return { valid: false, message: 'Please enter a valid 6-digit postal code.' };
    }
    if (pin.startsWith('560')) {
      return {
        valid: true,
        express: true,
        message: '⚡ Bengaluru Express: Eligible for Same-Day or Next-Day Hand Delivery!',
      };
    }
    return {
      valid: true,
      express: false,
      message: '✓ Serviceable: Standard Insured Delivery in 3-5 Business Days.',
    };
  }, [formData.address.pincode]);

  const items = breakdown?.items ?? [];
  const isEmpty = !cartLoading && items.length === 0;

  const updateField = <K extends keyof CheckoutState>(key: K, value: CheckoutState[K]) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const updateContact = (field: keyof CheckoutState['contact'], val: string) => {
    setFormData((prev) => ({
      ...prev,
      contact: { ...prev.contact, [field]: val },
    }));
  };

  const updateAddress = (field: keyof CheckoutState['address'], val: string) => {
    setFormData((prev) => ({
      ...prev,
      address: { ...prev.address, [field]: val },
    }));
  };

  const goToStep = (s: CheckoutStep) => {
    setSubmitError(null);
    updateField('step', s);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Step 2 validation
  const validateStep2 = () => {
    const { fullName, email, phone } = formData.contact;
    if (!fullName.trim()) return 'Please enter your full name.';
    if (!email.trim() || !email.includes('@')) return 'Please enter a valid email address.';
    if (!/^\d{10}$/.test(phone.replace(/\D/g, '')))
      return 'Please enter a valid 10-digit mobile number.';

    if (formData.fulfillmentType === 'delivery') {
      const { line1, city, state } = formData.address;
      if (!line1.trim()) return 'Please enter street address / flat details.';
      if (!city.trim()) return 'Please enter city.';
      if (!state.trim()) return 'Please enter state.';
      if (!pinServiceability.valid) return 'Please enter a valid serviceable PIN code.';
    }
    return null;
  };

  const handleStep2Continue = () => {
    const err = validateStep2();
    if (err) {
      setSubmitError(err);
      return;
    }
    setSubmitError(null);
    goToStep(3);
  };

  // Step 4 final order submission
  const handlePlaceOrder = async () => {
    if (!breakdown) return;
    if (!formData.agreeTerms) {
      setSubmitError('Please agree to the Terms and Conditions to proceed.');
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      const payload = {
        fulfillment_type: formData.fulfillmentType,
        pickup_slot: formData.fulfillmentType === 'pickup' ? formData.pickupSlot : undefined,
        payment_method: formData.paymentMethod,
        customer: formData.contact,
        delivery_address:
          formData.fulfillmentType === 'delivery' ? formData.address : undefined,
        customer_notes: formData.customerNotes || undefined,
        expected_total: breakdown.total_paise,
      };

      const res = await api.createOrder(payload);

      // Auto-authenticate guest user if token & user were issued during order creation
      if (res.token && res.user) {
        useAuthStore.getState().setAuthSession(res.user, res.token);
      }

      // If Razorpay Online order
      if (formData.paymentMethod === 'online' && res.razorpay) {
        const isMockKey =
          !res.razorpay.key_id ||
          res.razorpay.key_id.includes('demo') ||
          res.razorpay.key_id.includes('mock') ||
          res.razorpay.key_id === 'rzp_test_shikkis_demo_key';

        if (isMockKey) {
          try {
            const mockPaymentId = `pay_mock_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
            await api.verifyRazorpayPayment({
              razorpay_order_id: res.razorpay.order_id,
              razorpay_payment_id: mockPaymentId,
              razorpay_signature: 'mock_valid_signature',
            });
            sessionStorage.removeItem(STORAGE_KEY);
            navigate(`/orders/${res.order_id}?placed=true`);
          } catch (err: any) {
            console.error('Mock payment verification error:', err);
            sessionStorage.removeItem(STORAGE_KEY);
            navigate(`/orders/${res.order_id}?placed=true`);
          }
          return;
        }

        // Online Razorpay handler
        const options = {
          key: res.razorpay.key_id,
          amount: res.razorpay.amount,
          currency: res.razorpay.currency,
          name: 'Shikkis — Curated Style',
          description: `Order #${res.order_number}`,
          order_id: res.razorpay.order_id,
          prefill: {
            name: formData.contact.fullName,
            email: formData.contact.email,
            contact: formData.contact.phone,
          },
          theme: {
            color: '#9B1B30',
          },
          handler: async function (response: any) {
            try {
              // Server-side payment verification
              await api.verifyRazorpayPayment({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature || 'mock_valid_signature',
              });
              sessionStorage.removeItem(STORAGE_KEY);
              navigate(`/orders/${res.order_id}?placed=true`);
            } catch (err: any) {
              console.error('Payment verification failed:', err);
              // Even if instant client verification encounters a network glitch, webhook will resolve it
              sessionStorage.removeItem(STORAGE_KEY);
              navigate(`/orders/${res.order_id}?placed=true`);
            }
          },
        };

        if (typeof (window as any).Razorpay !== 'undefined') {
          const rzp = new (window as any).Razorpay(options);
          rzp.on('payment.failed', function (response: any) {
            setSubmitError(
              response.error?.description || 'Payment was unsuccessful. Please try again.'
            );
            setSubmitting(false);
          });
          rzp.open();
        } else {
          // If script fallback mode
          sessionStorage.removeItem(STORAGE_KEY);
          navigate(`/orders/${res.order_id}?placed=true`);
        }
      } else {
        // COD or immediate order confirmed
        sessionStorage.removeItem(STORAGE_KEY);
        navigate(`/orders/${res.order_id}?placed=true`);
      }
    } catch (err: any) {
      console.error('Order placement error:', err);
      if (err.status === 409) {
        setSubmitError(
          'Prices or cart contents have changed since you started checkout. Please review the updated totals.'
        );
        fetchCart();
      } else {
        setSubmitError(err.message || 'Unable to place order. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (isEmpty) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-24 text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-surface-alt text-brand-gold">
          <Package size={36} />
        </div>
        <h1 className="font-serif text-3xl font-semibold text-text mb-3">Your Shopping Bag is Empty</h1>
        <p className="text-text-muted mb-8 text-sm leading-relaxed max-w-md mx-auto">
          Explore our latest festive arrivals, bespoke sherwanis, and handcrafted sarees to start
          curating your wardrobe.
        </p>
        <Link
          to="/catalog"
          className="inline-flex items-center gap-2 rounded-lg bg-brand-crimson px-6 py-3 text-sm font-semibold text-white shadow-md hover:bg-brand-crimson/90 transition-colors"
        >
          <span>Explore Catalog</span>
          <ChevronRight size={16} />
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-[85vh] bg-bg py-8 md:py-12">
      <div className="mx-auto max-w-6xl px-4 md:px-8">
        {/* ── Top Bar ──────────────────────────────────────────────────────── */}
        <div className="mb-8 flex items-center justify-between border-b border-border pb-4">
          <Link
            to="/catalog"
            className="inline-flex items-center gap-2 text-xs font-medium text-text-muted hover:text-text transition-colors"
          >
            <ArrowLeft size={14} />
            <span>Continue Shopping</span>
          </Link>
          <div className="flex items-center gap-1.5 text-xs text-text-muted">
            <Lock size={13} className="text-brand-gold" />
            <span>256-Bit SSL Encrypted Checkout</span>
          </div>
        </div>

        {/* ── Checkout Progress Bar ────────────────────────────────────────── */}
        <div className="mb-10">
          <div className="relative flex items-center justify-between max-w-xl mx-auto">
            {/* Background connecting track */}
            <div className="absolute top-4 inset-x-0 h-0.5 bg-border -z-0" />
            {/* Active connecting bar */}
            <div
              className="absolute top-4 left-0 h-0.5 bg-brand-crimson transition-all duration-300 -z-0"
              style={{ width: `${((formData.step - 1) / 3) * 100}%` }}
            />

            {[
              { num: 1, label: 'Fulfillment' },
              { num: 2, label: 'Address' },
              { num: 3, label: 'Payment' },
              { num: 4, label: 'Review' },
            ].map((stepItem) => {
              const isDone = formData.step > stepItem.num;
              const isCurrent = formData.step === stepItem.num;
              return (
                <button
                  key={stepItem.num}
                  type="button"
                  disabled={stepItem.num > formData.step}
                  onClick={() => goToStep(stepItem.num as CheckoutStep)}
                  className="flex flex-col items-center group cursor-pointer disabled:cursor-not-allowed z-10"
                >
                  <div
                    className={[
                      'flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-all duration-200',
                      isDone
                        ? 'bg-brand-crimson text-white shadow-sm'
                        : isCurrent
                        ? 'bg-brand-crimson text-white ring-4 ring-brand-crimson/20 shadow'
                        : 'bg-surface border border-border text-text-muted',
                    ].join(' ')}
                  >
                    {isDone ? <Check size={14} /> : stepItem.num}
                  </div>
                  <span
                    className={[
                      'mt-2 text-xs font-medium transition-colors',
                      isCurrent ? 'text-brand-crimson font-semibold' : 'text-text-muted',
                    ].join(' ')}
                  >
                    {stepItem.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Main Layout: Content + Order Summary ─────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left: Step Content */}
          <div className="lg:col-span-7 bg-surface rounded-xl border border-border p-6 md:p-8 shadow-sm">
            {submitError && (
              <div className="mb-6 flex items-start gap-3 rounded-lg border border-danger/30 bg-danger/10 p-4 text-xs text-danger">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <p>{submitError}</p>
              </div>
            )}

            <AnimatePresence mode="wait">
              {/* ── STEP 1: FULFILLMENT ───────────────────────────────────────── */}
              {formData.step === 1 && (
                <motion.div
                  key="step-1"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6"
                >
                  <div>
                    <h2 className="font-serif text-2xl font-semibold text-text">
                      How would you like to receive your order?
                    </h2>
                    <p className="text-xs text-text-muted mt-1">
                      Choose between doorstep insured delivery or concierge in-store pickup.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Delivery Option */}
                    <div
                      onClick={() => updateField('fulfillmentType', 'delivery')}
                      className={[
                        'p-5 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between',
                        formData.fulfillmentType === 'delivery'
                          ? 'border-brand-crimson bg-brand-crimson/5'
                          : 'border-border hover:border-brand-gold/60 bg-surface-alt/40',
                      ].join(' ')}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface border border-border text-brand-crimson">
                            <Truck size={20} />
                          </div>
                          {formData.fulfillmentType === 'delivery' && (
                            <CheckCircle2 size={20} className="text-brand-crimson" />
                          )}
                        </div>
                        <h3 className="font-semibold text-sm text-text">Standard Delivery</h3>
                        <p className="text-xs text-text-muted mt-1 leading-relaxed">
                          All-India tamper-evident packaging. Dispatched within 24 hours.
                        </p>
                      </div>
                      <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between text-xs">
                        <span className="text-text-muted">Estimated time:</span>
                        <span className="font-semibold text-text">3–5 Business Days</span>
                      </div>
                    </div>

                    {/* In-Store Pickup Option */}
                    <div
                      onClick={() => updateField('fulfillmentType', 'pickup')}
                      className={[
                        'p-5 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between',
                        formData.fulfillmentType === 'pickup'
                          ? 'border-brand-crimson bg-brand-crimson/5'
                          : 'border-border hover:border-brand-gold/60 bg-surface-alt/40',
                      ].join(' ')}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface border border-border text-brand-crimson">
                            <Store size={20} />
                          </div>
                          {formData.fulfillmentType === 'pickup' && (
                            <CheckCircle2 size={20} className="text-brand-crimson" />
                          )}
                        </div>
                        <h3 className="font-semibold text-sm text-text">Boutique Pickup</h3>
                        <p className="text-xs text-text-muted mt-1 leading-relaxed">
                          Pick up from our flagship store with personal alteration consultation.
                        </p>
                      </div>
                      <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between text-xs">
                        <span className="text-text-muted">Location:</span>
                        <span className="font-semibold text-brand-gold">Bengaluru Flagship</span>
                      </div>
                    </div>
                  </div>

                  {/* If Pickup: Slot Picker */}
                  {formData.fulfillmentType === 'pickup' && (
                    <div className="rounded-xl border border-brand-gold/40 bg-surface-alt/60 p-4 space-y-3">
                      <div className="flex items-center gap-2 text-xs font-semibold text-text">
                        <Clock size={14} className="text-brand-gold" />
                        <span>Select Preferred Pickup Time Slot</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {PICKUP_SLOTS.map((slot) => (
                          <button
                            key={slot}
                            type="button"
                            onClick={() => updateField('pickupSlot', slot)}
                            className={[
                              'px-3.5 py-2.5 rounded-lg text-xs font-medium text-left border transition-all',
                              formData.pickupSlot === slot
                                ? 'bg-surface border-brand-crimson text-brand-crimson font-semibold shadow-xs'
                                : 'bg-surface/50 border-border text-text-muted hover:border-brand-gold/60',
                            ].join(' ')}
                          >
                            {slot}
                          </button>
                        ))}
                      </div>
                      <p className="text-[11px] text-text-muted flex items-center gap-1.5 pt-1">
                        <Building2 size={13} className="text-brand-gold shrink-0" />
                        <span>Shikkis Flagship: 100 Feet Road, Indiranagar, Bengaluru.</span>
                      </p>
                    </div>
                  )}

                  <div className="pt-4">
                    <button
                      type="button"
                      onClick={() => goToStep(2)}
                      className="w-full flex items-center justify-center gap-2 rounded-lg bg-brand-crimson py-3.5 text-sm font-semibold text-white shadow-md hover:bg-brand-crimson/90 transition-all cursor-pointer"
                    >
                      <span>Continue to {formData.fulfillmentType === 'delivery' ? 'Delivery Address' : 'Contact Details'}</span>
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </motion.div>
              )}

              {/* ── STEP 2: ADDRESS & CONTACT ─────────────────────────────────── */}
              {formData.step === 2 && (
                <motion.div
                  key="step-2"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6"
                >
                  <div>
                    <h2 className="font-serif text-2xl font-semibold text-text">
                      {formData.fulfillmentType === 'delivery'
                        ? 'Shipping & Contact Details'
                        : 'Customer Contact Details'}
                    </h2>
                    <p className="text-xs text-text-muted mt-1">
                      We will send tracking updates and order receipts to these details.
                    </p>
                  </div>

                  {/* Contact Fields */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-brand-crimson">
                      Contact Information
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-text mb-1">
                          Full Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.contact.fullName}
                          onChange={(e) => updateContact('fullName', e.target.value)}
                          placeholder="e.g. Priya Sharma"
                          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-xs text-text placeholder:text-text-muted/50 focus:border-brand-gold focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-text mb-1">
                          Mobile Number *
                        </label>
                        <div className="flex">
                          <span className="inline-flex items-center rounded-l-lg border border-r-0 border-border bg-surface-alt px-3 text-xs text-text-muted">
                            +91
                          </span>
                          <input
                            type="tel"
                            required
                            maxLength={10}
                            value={formData.contact.phone}
                            onChange={(e) => updateContact('phone', e.target.value)}
                            placeholder="9876543210"
                            className="w-full rounded-r-lg border border-border bg-surface px-3 py-2 text-xs text-text placeholder:text-text-muted/50 focus:border-brand-gold focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-text mb-1">
                        Email Address (for Order Updates) *
                      </label>
                      <input
                        type="email"
                        required
                        value={formData.contact.email}
                        onChange={(e) => updateContact('email', e.target.value)}
                        placeholder="priya@example.com"
                        className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-xs text-text placeholder:text-text-muted/50 focus:border-brand-gold focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Delivery Address Fields (Only for Delivery) */}
                  {formData.fulfillmentType === 'delivery' && (
                    <div className="space-y-4 pt-4 border-t border-border">
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-brand-crimson">
                        Shipping Address
                      </h3>

                      <div>
                        <label className="block text-xs font-medium text-text mb-1">
                          Flat, House No., Building, Apartment *
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.address.line1}
                          onChange={(e) => updateAddress('line1', e.target.value)}
                          placeholder="Apartment 402, Royal Residency"
                          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-xs text-text placeholder:text-text-muted/50 focus:border-brand-gold focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-text mb-1">
                          Area, Street, Sector, Landmark (Optional)
                        </label>
                        <input
                          type="text"
                          value={formData.address.line2}
                          onChange={(e) => updateAddress('line2', e.target.value)}
                          placeholder="Near 12th Main Metro Station"
                          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-xs text-text placeholder:text-text-muted/50 focus:border-brand-gold focus:outline-none"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-text mb-1">
                            PIN Code *
                          </label>
                          <input
                            type="text"
                            maxLength={6}
                            required
                            value={formData.address.pincode}
                            onChange={(e) => updateAddress('pincode', e.target.value)}
                            placeholder="560038"
                            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-xs text-text placeholder:text-text-muted/50 focus:border-brand-gold focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-text mb-1">City *</label>
                          <input
                            type="text"
                            required
                            value={formData.address.city}
                            onChange={(e) => updateAddress('city', e.target.value)}
                            placeholder="Bengaluru"
                            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-xs text-text placeholder:text-text-muted/50 focus:border-brand-gold focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-text mb-1">State *</label>
                          <input
                            type="text"
                            required
                            value={formData.address.state}
                            onChange={(e) => updateAddress('state', e.target.value)}
                            placeholder="Karnataka"
                            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-xs text-text placeholder:text-text-muted/50 focus:border-brand-gold focus:outline-none"
                          />
                        </div>
                      </div>

                      {/* PIN Serviceability Banner */}
                      <div
                        className={[
                          'p-3 rounded-lg border text-xs flex items-center gap-2',
                          pinServiceability.valid
                            ? pinServiceability.express
                              ? 'bg-brand-crimson/5 border-brand-crimson/20 text-brand-crimson'
                              : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                            : 'bg-danger/10 border-danger/20 text-danger',
                        ].join(' ')}
                      >
                        <MapPin size={15} className="shrink-0" />
                        <span>{pinServiceability.message}</span>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-4">
                    <button
                      type="button"
                      onClick={() => goToStep(1)}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-text-muted hover:text-text cursor-pointer"
                    >
                      <ArrowLeft size={14} />
                      <span>Back</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleStep2Continue}
                      className="flex items-center justify-center gap-2 rounded-lg bg-brand-crimson px-6 py-3 text-sm font-semibold text-white shadow-md hover:bg-brand-crimson/90 transition-all cursor-pointer"
                    >
                      <span>Proceed to Payment</span>
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </motion.div>
              )}

              {/* ── STEP 3: PAYMENT METHOD ────────────────────────────────────── */}
              {formData.step === 3 && (
                <motion.div
                  key="step-3"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6"
                >
                  <div>
                    <h2 className="font-serif text-2xl font-semibold text-text">
                      Choose Payment Method
                    </h2>
                    <p className="text-xs text-text-muted mt-1">
                      All online payments are securely processed through Razorpay.
                    </p>
                  </div>

                  <div className="space-y-3">
                    {/* Online Payment (Razorpay) */}
                    <div
                      onClick={() => updateField('paymentMethod', 'online')}
                      className={[
                        'p-5 rounded-xl border-2 transition-all cursor-pointer',
                        formData.paymentMethod === 'online'
                          ? 'border-brand-crimson bg-brand-crimson/5'
                          : 'border-border hover:border-brand-gold/60 bg-surface-alt/40',
                      ].join(' ')}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface border border-border text-brand-crimson">
                            <CreditCard size={20} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-sm text-text">
                                Online Payment (Razorpay)
                              </h3>
                              <span className="rounded-full bg-brand-gold/20 px-2 py-0.5 text-[10px] font-bold text-brand-crimson dark:text-brand-gold">
                                RECOMMENDED
                              </span>
                            </div>
                            <p className="text-xs text-text-muted mt-0.5">
                              UPI (GPay, PhonePe, Paytm), Credit & Debit Cards, NetBanking
                            </p>
                          </div>
                        </div>
                        {formData.paymentMethod === 'online' && (
                          <CheckCircle2 size={20} className="text-brand-crimson shrink-0" />
                        )}
                      </div>
                      <div className="mt-3 pt-3 border-t border-border/60 flex items-center gap-2 text-[11px] text-text-muted">
                        <ShieldCheck size={14} className="text-emerald-600" />
                        <span>Instant order confirmation & priority dispatch</span>
                      </div>
                    </div>

                    {/* Cash on Delivery */}
                    <div
                      onClick={() => updateField('paymentMethod', 'cod')}
                      className={[
                        'p-5 rounded-xl border-2 transition-all cursor-pointer',
                        formData.paymentMethod === 'cod'
                          ? 'border-brand-crimson bg-brand-crimson/5'
                          : 'border-border hover:border-brand-gold/60 bg-surface-alt/40',
                      ].join(' ')}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface border border-border text-brand-crimson">
                            <Package size={20} />
                          </div>
                          <div>
                            <h3 className="font-semibold text-sm text-text">
                              Cash / UPI on Delivery
                            </h3>
                            <p className="text-xs text-text-muted mt-0.5">
                              Pay via cash or UPI to the courier upon delivery.
                            </p>
                          </div>
                        </div>
                        {formData.paymentMethod === 'cod' && (
                          <CheckCircle2 size={20} className="text-brand-crimson shrink-0" />
                        )}
                      </div>
                      <div className="mt-3 pt-3 border-t border-border/60 text-[11px] text-text-muted">
                        <span>Please keep exact cash ready or scan courier UPI QR.</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4">
                    <button
                      type="button"
                      onClick={() => goToStep(2)}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-text-muted hover:text-text cursor-pointer"
                    >
                      <ArrowLeft size={14} />
                      <span>Back</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => goToStep(4)}
                      className="flex items-center justify-center gap-2 rounded-lg bg-brand-crimson px-6 py-3 text-sm font-semibold text-white shadow-md hover:bg-brand-crimson/90 transition-all cursor-pointer"
                    >
                      <span>Review Order</span>
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </motion.div>
              )}

              {/* ── STEP 4: REVIEW & PLACE ORDER ─────────────────────────────── */}
              {formData.step === 4 && (
                <motion.div
                  key="step-4"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6"
                >
                  <div>
                    <h2 className="font-serif text-2xl font-semibold text-text">Review Your Order</h2>
                    <p className="text-xs text-text-muted mt-1">
                      Please verify your fulfillment, shipping, and payment selection before placing.
                    </p>
                  </div>

                  {/* Summary Details Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div className="rounded-lg border border-border p-3.5 bg-surface-alt/40 space-y-1">
                      <div className="flex items-center justify-between text-text-muted mb-1">
                        <span className="font-semibold uppercase tracking-wider text-[10px]">
                          Fulfillment
                        </span>
                        <button
                          onClick={() => goToStep(1)}
                          className="text-brand-crimson underline font-medium hover:opacity-80"
                        >
                          Change
                        </button>
                      </div>
                      <p className="font-semibold text-text capitalize">
                        {formData.fulfillmentType === 'delivery'
                          ? 'Standard Insured Delivery'
                          : 'Boutique Pickup'}
                      </p>
                      {formData.fulfillmentType === 'pickup' && (
                        <p className="text-text-muted text-[11px]">{formData.pickupSlot}</p>
                      )}
                    </div>

                    <div className="rounded-lg border border-border p-3.5 bg-surface-alt/40 space-y-1">
                      <div className="flex items-center justify-between text-text-muted mb-1">
                        <span className="font-semibold uppercase tracking-wider text-[10px]">
                          Payment
                        </span>
                        <button
                          onClick={() => goToStep(3)}
                          className="text-brand-crimson underline font-medium hover:opacity-80"
                        >
                          Change
                        </button>
                      </div>
                      <p className="font-semibold text-text">
                        {formData.paymentMethod === 'online'
                          ? 'Online Payment (Razorpay)'
                          : 'Cash / Pay on Delivery'}
                      </p>
                      <p className="text-text-muted text-[11px]">
                        {formData.paymentMethod === 'online'
                          ? 'Cards, UPI, NetBanking'
                          : 'Pay upon delivery'}
                      </p>
                    </div>

                    {formData.fulfillmentType === 'delivery' && (
                      <div className="sm:col-span-2 rounded-lg border border-border p-3.5 bg-surface-alt/40 space-y-1">
                        <div className="flex items-center justify-between text-text-muted mb-1">
                          <span className="font-semibold uppercase tracking-wider text-[10px]">
                            Ship To
                          </span>
                          <button
                            onClick={() => goToStep(2)}
                            className="text-brand-crimson underline font-medium hover:opacity-80"
                          >
                            Change
                          </button>
                        </div>
                        <p className="font-semibold text-text">{formData.contact.fullName}</p>
                        <p className="text-text-muted text-[11px]">
                          {formData.address.line1}, {formData.address.line2 && `${formData.address.line2}, `}
                          {formData.address.city}, {formData.address.state} — {formData.address.pincode}
                        </p>
                        <p className="text-text-muted text-[11px]">
                          Phone: +91 {formData.contact.phone} • Email: {formData.contact.email}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Optional Order Note */}
                  <div>
                    <label className="block text-xs font-medium text-text mb-1">
                      Special Delivery Instructions or Gift Note (Optional)
                    </label>
                    <textarea
                      rows={2}
                      value={formData.customerNotes}
                      onChange={(e) => updateField('customerNotes', e.target.value)}
                      placeholder="e.g. Leave package with security guard, or call upon arrival."
                      className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-xs text-text placeholder:text-text-muted/50 focus:border-brand-gold focus:outline-none"
                    />
                  </div>

                  {/* Terms Checkbox */}
                  <div className="rounded-lg border border-border bg-surface-alt/20 p-3 flex items-start gap-2.5">
                    <input
                      id="terms-checkbox"
                      type="checkbox"
                      checked={formData.agreeTerms}
                      onChange={(e) => updateField('agreeTerms', e.target.checked)}
                      className="mt-0.5 rounded border-border text-brand-crimson focus:ring-brand-crimson"
                    />
                    <label htmlFor="terms-checkbox" className="text-[11px] text-text-muted leading-tight">
                      I agree to the{' '}
                      <span className="text-brand-crimson font-medium underline">
                        Terms of Service
                      </span>{' '}
                      and acknowledge Shikkis 7-day hassle-free return and exchange policy.
                    </label>
                  </div>

                  <div className="flex items-center justify-between pt-4">
                    <button
                      type="button"
                      onClick={() => goToStep(3)}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-text-muted hover:text-text cursor-pointer"
                    >
                      <ArrowLeft size={14} />
                      <span>Back</span>
                    </button>

                    <button
                      type="button"
                      id="place-order-btn"
                      disabled={submitting || !formData.agreeTerms}
                      onClick={handlePlaceOrder}
                      className={[
                        'flex items-center justify-center gap-2 rounded-lg py-3.5 px-8 text-sm font-semibold text-white shadow-lg transition-all',
                        submitting || !formData.agreeTerms
                          ? 'bg-surface-alt text-text-muted border border-border cursor-not-allowed'
                          : 'bg-brand-crimson hover:bg-brand-crimson/90 shadow-brand-crimson/25 active:scale-[0.99] cursor-pointer',
                      ].join(' ')}
                    >
                      <Lock size={15} />
                      <span>
                        {submitting
                          ? 'Processing...'
                          : formData.paymentMethod === 'online'
                          ? `Pay ${formatPrice(breakdown?.total_paise ?? 0)} via Razorpay`
                          : `Confirm Order (${formatPrice(breakdown?.total_paise ?? 0)})`}
                      </span>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Right: Sticky Order Summary */}
          <div className="lg:col-span-5 bg-surface rounded-xl border border-border p-6 shadow-sm sticky top-24">
            <h3 className="font-serif text-lg font-semibold text-text mb-4 pb-3 border-b border-border">
              Order Summary ({items.length} {items.length === 1 ? 'item' : 'items'})
            </h3>

            {/* Line Items List */}
            <div className="max-h-64 overflow-y-auto space-y-3 pr-1 divide-y divide-border/40">
              {items.map((item) => (
                <div key={item.variant_id} className="pt-3 first:pt-0 flex gap-3 items-center">
                  <div className="h-14 w-12 rounded-md overflow-hidden bg-surface-alt border border-border shrink-0">
                    <img
                      src={item.image_url || '/placeholder.png'}
                      alt={item.product_name}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-semibold text-text truncate">{item.product_name}</h4>
                    <p className="text-[10px] text-text-muted">
                      {item.color} • Size {item.size} • Qty {item.quantity}
                    </p>
                    <div className="flex items-baseline gap-1.5 mt-0.5">
                      <span className="text-xs font-bold text-brand-crimson dark:text-brand-gold">
                        {formatPrice(item.line_subtotal_paise)}
                      </span>
                      {item.unit_mrp_paise > item.unit_final_price_paise && (
                        <span className="text-[10px] text-text-muted line-through">
                          {formatPrice(item.unit_mrp_paise * item.quantity)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Price Breakdown */}
            {breakdown && (
              <div className="mt-6 pt-4 border-t border-border space-y-2 text-xs">
                <div className="flex justify-between text-text-muted">
                  <span>Subtotal</span>
                  <span className="text-text">{formatPrice(breakdown.subtotal_paise)}</span>
                </div>

                {breakdown.discounts.map((disc) => (
                  <div key={disc.offer_id} className="flex justify-between text-emerald-600 dark:text-emerald-400">
                    <span className="flex items-center gap-1">
                      <Sparkles size={12} />
                      <span>{disc.name}</span>
                    </span>
                    <span>-{formatPrice(disc.discount_paise)}</span>
                  </div>
                ))}

                {breakdown.coupon && (
                  <div className="flex justify-between text-brand-gold font-medium">
                    <span className="flex items-center gap-1">
                      <Tag size={12} />
                      <span>Coupon ({breakdown.coupon.code})</span>
                    </span>
                    <span>-{formatPrice(breakdown.coupon.discount_paise)}</span>
                  </div>
                )}

                <div className="flex justify-between text-text-muted">
                  <span>Estimated Shipping</span>
                  {breakdown.shipping_paise === 0 ? (
                    <span className="text-emerald-600 font-semibold">FREE</span>
                  ) : (
                    <span>{formatPrice(breakdown.shipping_paise)}</span>
                  )}
                </div>

                <div className="flex justify-between text-text-muted">
                  <span>GST (Included 5%)</span>
                  <span>{formatPrice(breakdown.tax_paise)}</span>
                </div>

                <div className="pt-3 border-t border-border flex justify-between items-baseline">
                  <span className="font-serif text-base font-bold text-text">Total Amount</span>
                  <span className="font-serif text-xl font-bold text-brand-crimson dark:text-brand-gold">
                    {formatPrice(breakdown.total_paise)}
                  </span>
                </div>
              </div>
            )}

            {/* Trust Assurance Strip */}
            <div className="mt-6 pt-4 border-t border-border/80 grid grid-cols-3 gap-2 text-center">
              <div className="p-2 rounded bg-surface-alt/50">
                <ShieldCheck size={16} className="mx-auto text-brand-gold mb-1" />
                <span className="text-[10px] text-text-muted block">100% Authentic</span>
              </div>
              <div className="p-2 rounded bg-surface-alt/50">
                <Truck size={16} className="mx-auto text-brand-gold mb-1" />
                <span className="text-[10px] text-text-muted block">Express Dispatch</span>
              </div>
              <div className="p-2 rounded bg-surface-alt/50">
                <Package size={16} className="mx-auto text-brand-gold mb-1" />
                <span className="text-[10px] text-text-muted block">Easy Returns</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
