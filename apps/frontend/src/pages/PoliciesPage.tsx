import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, HelpCircle, Lock, LucideIcon, RefreshCw, ShieldCheck, Truck } from 'lucide-react';
import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { fadeIn, useMotionSafe } from '@/lib/motion';

export type PolicyTab = 'shipping' | 'returns' | 'faq' | 'privacy' | 'terms';

interface TabItem {
  id: PolicyTab;
  label: string;
  icon: LucideIcon;
}

const TABS: TabItem[] = [
  { id: 'shipping', label: 'Shipping & Delivery', icon: Truck },
  { id: 'returns', label: 'Returns & Exchanges', icon: RefreshCw },
  { id: 'faq', label: 'FAQ', icon: HelpCircle },
  { id: 'privacy', label: 'Privacy Policy', icon: Lock },
  { id: 'terms', label: 'Terms & Conditions', icon: ShieldCheck },
];

// ─── FAQ Accordion Item Component ─────────────────────────────────────────────

interface FAQItemProps {
  question: string;
  answer: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  id: string;
}

const FAQAccordionItem: React.FC<FAQItemProps> = ({ question, answer, isOpen, onToggle, id }) => (
  <div className="border-b border-border/80 last:border-0">
    <button
      type="button"
      id={`faq-btn-${id}`}
      aria-expanded={isOpen}
      aria-controls={`faq-panel-${id}`}
      onClick={onToggle}
      className="flex w-full items-center justify-between py-4 text-left transition-colors hover:text-brand-crimson dark:hover:text-brand-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold rounded-sm"
    >
      <span className="font-serif text-base font-medium text-text">{question}</span>
      <motion.div
        animate={{ rotate: isOpen ? 180 : 0 }}
        transition={{ duration: 0.2 }}
        className="shrink-0 text-text-muted ml-4"
      >
        <ChevronDown size={18} />
      </motion.div>
    </button>
    <AnimatePresence initial={false}>
      {isOpen && (
        <motion.div
          id={`faq-panel-${id}`}
          role="region"
          aria-labelledby={`faq-btn-${id}`}
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
          className="overflow-hidden"
        >
          <div className="pb-5 text-sm text-text-muted leading-relaxed font-sans">{answer}</div>
        </motion.div>
      )}
    </AnimatePresence>
  </div>
);

// ─── Main Policies Page ───────────────────────────────────────────────────────

export const PoliciesPage: React.FC = () => {
  const { tab } = useParams<{ tab?: string }>();
  const navigate = useNavigate();
  const variants = useMotionSafe(fadeIn);

  // Validate active tab or default to 'shipping'
  const activeTab: PolicyTab = TABS.some((t) => t.id === tab) ? (tab as PolicyTab) : 'shipping';

  // FAQ Accordion expanded state
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const handleTabChange = (newTab: PolicyTab) => {
    navigate(`/policies/${newTab}`);
  };

  return (
    <motion.div
      variants={variants}
      initial="hidden"
      animate="visible"
      className="mx-auto max-w-7xl px-4 py-10 md:px-8"
    >
      {/* ── Page Header ────────────────────────────────────────────────────── */}
      <div className="mb-10 text-center max-w-3xl mx-auto">
        <span className="text-xs font-semibold uppercase tracking-widest text-brand-gold">
          Customer Care &amp; Transparency
        </span>
        <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl text-text mt-2 font-medium">
          Store Policies &amp; Help Center
        </h1>
        <p className="mt-3 text-sm text-text-muted leading-relaxed font-light">
          Everything you need to know about our handcrafted Indian wear, shipping timelines, returns process, and security standards.
        </p>
      </div>

      {/* ── Main Layout: Tabs + Content ────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar Nav Tabs */}
        <aside className="lg:col-span-1">
          <nav
            role="tablist"
            aria-label="Policy sections"
            className="flex lg:flex-col overflow-x-auto lg:overflow-x-visible gap-2 pb-2 lg:pb-0 border-b lg:border-b-0 lg:border-r border-border pr-0 lg:pr-6 scrollbar-none"
          >
            {TABS.map((t) => {
              const Icon = t.icon;
              const isActive = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  role="tab"
                  id={`tab-${t.id}`}
                  aria-selected={isActive}
                  aria-controls={`tabpanel-${t.id}`}
                  onClick={() => handleTabChange(t.id)}
                  className={[
                    'flex items-center gap-3 px-4 py-3 text-xs sm:text-sm font-medium rounded-xl whitespace-nowrap transition-all duration-150 text-left',
                    isActive
                      ? 'bg-surface-alt text-brand-crimson dark:text-brand-gold font-semibold shadow-xs border border-border/60'
                      : 'text-text-muted hover:text-text hover:bg-surface-alt/50',
                  ].join(' ')}
                >
                  <Icon size={16} className={isActive ? 'text-brand-gold' : 'text-text-muted'} />
                  <span>{t.label}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Policy Content Body */}
        <main className="lg:col-span-3 min-w-0">
          <div
            id={`tabpanel-${activeTab}`}
            role="tabpanel"
            aria-labelledby={`tab-${activeTab}`}
            className="bg-surface border border-border rounded-2xl p-6 sm:p-10 shadow-sm"
          >
            {/* ── 1. SHIPPING & DELIVERY ──────────────────────────────────── */}
            {activeTab === 'shipping' && (
              <div className="space-y-6">
                <div className="border-b border-border/80 pb-4">
                  <h2 className="font-serif text-2xl font-semibold text-text flex items-center gap-3">
                    <Truck className="text-brand-gold shrink-0" size={24} />
                    Shipping &amp; Delivery Policy
                  </h2>
                  <p className="text-xs text-text-muted mt-1">
                    Handcrafted in Jaipur, shipped across all pincodes in India with care.
                  </p>
                </div>

                <div className="space-y-4 text-sm text-text-muted leading-relaxed">
                  <h3 className="font-serif text-lg font-medium text-text pt-2">
                    1. Order Processing Time
                  </h3>
                  <p>
                    Each piece at Shikkis is curated and thoroughly quality-checked before dispatch.
                    Standard orders are packed and dispatched from our Jaipur atelier within{' '}
                    <strong className="text-text font-semibold">24 to 48 hours</strong> (excluding Sundays and national holidays).
                  </p>

                  <h3 className="font-serif text-lg font-medium text-text pt-2">
                    2. Estimated Delivery Timelines
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-3">
                    <div className="p-4 rounded-xl border border-border bg-surface-alt/40">
                      <p className="font-serif font-semibold text-text">Standard Metro Delivery</p>
                      <p className="text-xs text-text-muted mt-1">3 – 5 Business Days</p>
                    </div>
                    <div className="p-4 rounded-xl border border-border bg-surface-alt/40">
                      <p className="font-serif font-semibold text-text">Rest of India &amp; Remote Areas</p>
                      <p className="text-xs text-text-muted mt-1">5 – 7 Business Days</p>
                    </div>
                  </div>

                  <h3 className="font-serif text-lg font-medium text-text pt-2">
                    3. Shipping Charges
                  </h3>
                  <p>
                    We offer <strong className="text-text font-semibold">Free Express Shipping</strong> on all orders above ₹2,999 anywhere in India. For orders under ₹2,999, a flat nominal shipping fee of ₹99 is applied at checkout.
                  </p>

                  <h3 className="font-serif text-lg font-medium text-text pt-2">
                    4. Real-time Order Tracking
                  </h3>
                  <p>
                    Once your shipment is dispatched, you will receive an SMS and email notification containing your AWB tracking link. You can also view live order progress anytime on our{' '}
                    <a href="/orders" className="text-brand-crimson dark:text-brand-gold font-medium underline underline-offset-4">
                      My Orders
                    </a>{' '}
                    page.
                  </p>
                </div>
              </div>
            )}

            {/* ── 2. RETURNS & EXCHANGES ───────────────────────────────────── */}
            {activeTab === 'returns' && (
              <div className="space-y-6">
                <div className="border-b border-border/80 pb-4">
                  <h2 className="font-serif text-2xl font-semibold text-text flex items-center gap-3">
                    <RefreshCw className="text-brand-gold shrink-0" size={24} />
                    Returns &amp; Exchange Policy
                  </h2>
                  <p className="text-xs text-text-muted mt-1">
                    7-day hassle-free returns and exchanges for your complete peace of mind.
                  </p>
                </div>

                <div className="space-y-4 text-sm text-text-muted leading-relaxed">
                  <h3 className="font-serif text-lg font-medium text-text pt-2">
                    1. The 7-Day Return Window
                  </h3>
                  <p>
                    If your garments do not fit perfectly or meet your expectations, you may initiate a return or exchange request within <strong className="text-text font-semibold">7 days</strong> of delivery.
                  </p>

                  <h3 className="font-serif text-lg font-medium text-text pt-2">
                    2. Conditions for Eligibility
                  </h3>
                  <ul className="list-disc pl-5 space-y-2">
                    <li>Items must be unworn, unwashed, unused, and with all original tags attached.</li>
                    <li>Items must be in their original packaging including garment covers and gift boxes.</li>
                    <li>Custom-tailored or altered garments are non-returnable unless defective.</li>
                  </ul>

                  <h3 className="font-serif text-lg font-medium text-text pt-2">
                    3. How Reverse Pickup Works
                  </h3>
                  <p>
                    We arrange a complimentary doorstep reverse pickup via our logistics partners. Once requested through your customer portal or by contacting support, our courier agent will pick up the parcel within 2 business days.
                  </p>

                  <h3 className="font-serif text-lg font-medium text-text pt-2">
                    4. Refund Processing Timeline
                  </h3>
                  <p>
                    After quality verification at our facility, refunds are processed within{' '}
                    <strong className="text-text font-semibold">5 to 7 working days</strong> directly to your original payment method (Razorpay / UPI / Bank Account).
                  </p>
                </div>
              </div>
            )}

            {/* ── 3. FAQ ──────────────────────────────────────────────────── */}
            {activeTab === 'faq' && (
              <div className="space-y-6">
                <div className="border-b border-border/80 pb-4">
                  <h2 className="font-serif text-2xl font-semibold text-text flex items-center gap-3">
                    <HelpCircle className="text-brand-gold shrink-0" size={24} />
                    Frequently Asked Questions
                  </h2>
                  <p className="text-xs text-text-muted mt-1">
                    Quick answers to common questions about sizing, care, payments, and store visits.
                  </p>
                </div>

                <div className="divide-y divide-border/60">
                  <FAQAccordionItem
                    id="1"
                    question="How do I determine my correct size?"
                    isOpen={openFaqIndex === 0}
                    onToggle={() => setOpenFaqIndex(openFaqIndex === 0 ? null : 0)}
                    answer={
                      <p>
                        Each product page features a detailed Size Guide with precise chest, waist, and hip measurements in inches. Our garments follow standard Indian sizing with generous margins to allow minor alterations.
                      </p>
                    }
                  />

                  <FAQAccordionItem
                    id="2"
                    question="What payment options do you accept?"
                    isOpen={openFaqIndex === 1}
                    onToggle={() => setOpenFaqIndex(openFaqIndex === 1 ? null : 1)}
                    answer={
                      <p>
                        We accept all major payment methods processed securely through Razorpay, including UPI (Google Pay, PhonePe, Paytm), Credit Cards, Debit Cards, NetBanking, and Wallet payments. All transactions are billed in Indian Rupees (INR).
                      </p>
                    }
                  />

                  <FAQAccordionItem
                    id="3"
                    question="How should I care for handwoven silks and embellished fabrics?"
                    isOpen={openFaqIndex === 2}
                    onToggle={() => setOpenFaqIndex(openFaqIndex === 2 ? null : 2)}
                    answer={
                      <p>
                        We strongly recommend <strong className="text-text">Dry Clean Only</strong> for all silk, zardozi, hand-block printed, and heavily embroidered garments to maintain fabric sheen and intricate handwork over time.
                      </p>
                    }
                  />

                  <FAQAccordionItem
                    id="4"
                    question="Can I visit your physical flagship store in Jaipur?"
                    isOpen={openFaqIndex === 3}
                    onToggle={() => setOpenFaqIndex(openFaqIndex === 3 ? null : 3)}
                    answer={
                      <p>
                        Yes! We welcome you to experience our full bridal and festive couture collection at our Jaipur physical store: <strong className="text-text">123 Textile Lane, Jaipur, Rajasthan 302001</strong> (Mon–Sat 10:30 AM – 8:00 PM).
                      </p>
                    }
                  />

                  <FAQAccordionItem
                    id="5"
                    question="Can I change or cancel my order after placing it?"
                    isOpen={openFaqIndex === 4}
                    onToggle={() => setOpenFaqIndex(openFaqIndex === 4 ? null : 4)}
                    answer={
                      <p>
                        Orders can be cancelled or modified within 2 hours of placement before dispatch. Please reach out to our team immediately at <strong className="text-text">hello@shikkis.in</strong> or call <strong className="text-text">+91 98765 43210</strong>.
                      </p>
                    }
                  />
                </div>
              </div>
            )}

            {/* ── 4. PRIVACY POLICY ───────────────────────────────────────── */}
            {activeTab === 'privacy' && (
              <div className="space-y-6">
                <div className="border-b border-border/80 pb-4">
                  <h2 className="font-serif text-2xl font-semibold text-text flex items-center gap-3">
                    <Lock className="text-brand-gold shrink-0" size={24} />
                    Privacy &amp; Data Security Policy
                  </h2>
                  <p className="text-xs text-text-muted mt-1">
                    Your personal information and privacy are strictly safeguarded.
                  </p>
                </div>

                <div className="space-y-4 text-sm text-text-muted leading-relaxed">
                  <h3 className="font-serif text-lg font-medium text-text pt-2">
                    1. Information We Collect
                  </h3>
                  <p>
                    We collect essential information required to fulfill your orders, including your name, shipping address, email address, phone number, and transaction history.
                  </p>

                  <h3 className="font-serif text-lg font-medium text-text pt-2">
                    2. Payment Security
                  </h3>
                  <p>
                    We do not store your credit card, debit card, or banking credentials on our servers. All financial transactions are encrypted and processed by <strong className="text-text">Razorpay</strong> in compliance with PCI-DSS standards.
                  </p>

                  <h3 className="font-serif text-lg font-medium text-text pt-2">
                    3. No Third-Party Data Selling
                  </h3>
                  <p>
                    Your personal data is never sold, rented, or traded to third parties. Data is shared exclusively with trusted delivery partners for shipment fulfillment.
                  </p>
                </div>
              </div>
            )}

            {/* ── 5. TERMS & CONDITIONS ───────────────────────────────────── */}
            {activeTab === 'terms' && (
              <div className="space-y-6">
                <div className="border-b border-border/80 pb-4">
                  <h2 className="font-serif text-2xl font-semibold text-text flex items-center gap-3">
                    <ShieldCheck className="text-brand-gold shrink-0" size={24} />
                    Terms &amp; Conditions
                  </h2>
                  <p className="text-xs text-text-muted mt-1">
                    Legal terms governing the use of Shikkis website and services.
                  </p>
                </div>

                <div className="space-y-4 text-sm text-text-muted leading-relaxed">
                  <h3 className="font-serif text-lg font-medium text-text pt-2">
                    1. Currency &amp; Pricing
                  </h3>
                  <p>
                    All monetary transactions and prices listed on Shikkis are in <strong className="text-text">Indian Rupees (INR)</strong>. Prices are inclusive of GST.
                  </p>

                  <h3 className="font-serif text-lg font-medium text-text pt-2">
                    2. Product Craftsmanship &amp; Variations
                  </h3>
                  <p>
                    As our garments feature handcrafted embroidery, hand-block printing, and woven textiles, minor variations in shade, weave, and motifs are inherent markers of authentic handloom artistry.
                  </p>

                  <h3 className="font-serif text-lg font-medium text-text pt-2">
                    3. Intellectual Property Rights
                  </h3>
                  <p>
                    All content on this site including photography, wordmarks, brand emblems, product designs, and text are exclusive property of Shikkis.
                  </p>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </motion.div>
  );
};
