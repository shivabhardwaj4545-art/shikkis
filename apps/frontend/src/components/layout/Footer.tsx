import { Instagram, Mail, MapPin, Phone } from 'lucide-react';
import React from 'react';
import { Link } from 'react-router-dom';

const FOOTER_LINKS = {
  Shop: [
    { label: 'Women', to: '/catalog?gender=women' },
    { label: 'Men', to: '/catalog?gender=men' },
    { label: 'New Arrivals', to: '/catalog?sort=newest' },
    { label: 'Sale', to: '/catalog?sale=true' },
  ],
  Help: [
    { label: 'Track Order', to: '/orders' },
    { label: 'Shipping Policy', to: '/policies/shipping' },
    { label: 'Returns & Exchanges', to: '/policies/returns' },
    { label: 'FAQ', to: '/policies/faq' },
    { label: 'Privacy Policy', to: '/policies/privacy' },
    { label: 'Terms & Conditions', to: '/policies/terms' },
  ],
};

export const Footer: React.FC = () => (
  <footer className="border-t border-border bg-surface-alt" aria-label="Site footer">
    <div className="mx-auto max-w-7xl px-4 py-12 md:px-8">
      <div className="grid grid-cols-1 gap-10 md:grid-cols-4">

        {/* ── Brand column ─────────────────────────────────────────────────── */}
        <div className="md:col-span-2 flex flex-col gap-4">
          <Link
            to="/"
            className="font-serif text-2xl font-semibold text-text hover:text-brand-crimson transition-colors"
          >
            Shikkis
          </Link>
          <p className="text-sm text-text-muted max-w-xs leading-relaxed">
            Curated Indian &amp; fusion wear for men and women. Handcrafted with love, shipped with
            care.
          </p>

          {/* ── Contact ─────────────────────────────────────────────────────── */}
          <address className="not-italic flex flex-col gap-2 text-sm text-text-muted">
            <span className="flex items-center gap-2">
              <MapPin size={13} className="text-brand-gold shrink-0" aria-hidden />
              123 Textile Lane, Jaipur, Rajasthan 302001
            </span>
            <a
              href="tel:+919876543210"
              className="flex items-center gap-2 hover:text-text transition-colors"
            >
              <Phone size={13} className="text-brand-gold shrink-0" aria-hidden />
              +91 98765 43210
            </a>
            <a
              href="mailto:hello@shikkis.in"
              className="flex items-center gap-2 hover:text-text transition-colors"
            >
              <Mail size={13} className="text-brand-gold shrink-0" aria-hidden />
              hello@shikkis.in
            </a>
          </address>
        </div>

        {/* ── Link columns ─────────────────────────────────────────────────── */}
        {Object.entries(FOOTER_LINKS).map(([section, links]) => (
          <div key={section} className="flex flex-col gap-3">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-text-muted">
              {section}
            </h3>
            <ul className="flex flex-col gap-2">
              {links.map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className="text-sm text-text-muted hover:text-text transition-colors duration-150"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* ── Bottom row ─────────────────────────────────────────────────────── */}
      <div className="mt-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-t border-border pt-6">
        <p className="text-xs text-text-muted">
          © {new Date().getFullYear()} Shikkis. All rights reserved. All prices in INR.
        </p>

        {/* Social */}
        <div className="flex items-center gap-3" role="group" aria-label="Social links">
          <a
            href="https://instagram.com/shikkis"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Follow Shikkis on Instagram"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full border border-border text-text-muted hover:text-text hover:border-brand-gold transition-colors"
          >
            <Instagram size={16} aria-hidden />
          </a>
        </div>
      </div>
    </div>
  </footer>
);
