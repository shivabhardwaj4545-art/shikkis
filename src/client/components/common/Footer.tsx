import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Phone, Mail, ShieldCheck, Truck, RefreshCw } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-surface-alt/50 border-t border-border mt-48 transition-colors duration-200">
      {/* Brand Value Pillars */}
      <div className="max-w-7xl mx-auto px-16 sm:px-24 py-32 border-b border-border grid grid-cols-1 sm:grid-cols-3 gap-24 text-center">
        <div className="flex flex-col items-center gap-8">
          <Truck className="w-28 h-28 text-brand-gold" />
          <h4 className="font-serif text-16 font-bold text-text">Complimentary Shipping</h4>
          <p className="text-xs text-text-muted">Insured express delivery across India & select global destinations.</p>
        </div>
        <div className="flex flex-col items-center gap-8">
          <ShieldCheck className="w-28 h-28 text-brand-gold" />
          <h4 className="font-serif text-16 font-bold text-text">100% Authentic Handloom</h4>
          <p className="text-xs text-text-muted">Directly sourced from Varanasi, Chanderi, and Jaipur artisan guilds.</p>
        </div>
        <div className="flex flex-col items-center gap-8">
          <RefreshCw className="w-28 h-28 text-brand-gold" />
          <h4 className="font-serif text-16 font-bold text-text">Bespoke Fitting & Alterations</h4>
          <p className="text-xs text-text-muted">Personalized master tailor consultations in-store or virtually.</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-16 sm:px-24 py-48 grid grid-cols-1 md:grid-cols-4 gap-32">
        {/* Brand Information */}
        <div className="space-y-12">
          <h3 className="font-serif text-24 font-bold text-brand-crimson dark:text-brand-gold uppercase">
            SHIKKIS
          </h3>
          <p className="text-xs text-text-muted leading-relaxed">
            Shikkis is an Indian & fusion wear e-commerce store celebrating the timeless allure of regal heritage textiles and modern silhouettes.
          </p>
          <span className="inline-block text-xs font-semibold text-brand-gold tracking-widest uppercase">
            Tagline: "Curated Style"
          </span>
        </div>

        {/* Quick Links */}
        <div className="space-y-12">
          <h4 className="font-serif text-18 font-bold text-text">Explore Collections</h4>
          <ul className="space-y-8 text-xs text-text-muted">
            <li><Link to="/catalog?gender=women" className="hover:text-brand-gold transition-colors">Bridal & Heritage Sarees</Link></li>
            <li><Link to="/catalog?gender=women" className="hover:text-brand-gold transition-colors">Fusion Lehengas</Link></li>
            <li><Link to="/catalog?gender=men" className="hover:text-brand-gold transition-colors">Royal Sherwanis & Bandhgalas</Link></li>
            <li><Link to="/catalog?gender=men" className="hover:text-brand-gold transition-colors">Handcrafted Silk Kurtas</Link></li>
          </ul>
        </div>

        {/* Customer Care */}
        <div className="space-y-12">
          <h4 className="font-serif text-18 font-bold text-text">Atelier Services</h4>
          <ul className="space-y-8 text-xs text-text-muted">
            <li><Link to="/orders" className="hover:text-brand-gold transition-colors">Track Order Status</Link></li>
            <li><a href="#size-guide" className="hover:text-brand-gold transition-colors">Custom Drape & Fit Guide</a></li>
            <li><a href="#store" className="hover:text-brand-gold transition-colors">Physical Atelier Visit</a></li>
            <li><a href="#returns" className="hover:text-brand-gold transition-colors">Exchange & Shipping Policies</a></li>
          </ul>
        </div>

        {/* Physical Store & Contact */}
        <div className="space-y-12">
          <h4 className="font-serif text-18 font-bold text-text">Physical Flagship Store</h4>
          <div className="space-y-8 text-xs text-text-muted">
            <p className="flex items-start gap-8">
              <MapPin className="w-16 h-16 text-brand-gold shrink-0 mt-2" />
              <span>Shikkis Atelier, 42 Johari Bazaar, Heritage City, Jaipur, Rajasthan — 302003</span>
            </p>
            <p className="flex items-center gap-8">
              <Phone className="w-16 h-16 text-brand-gold shrink-0" />
              <span>+91 98765 43210</span>
            </p>
            <p className="flex items-center gap-8">
              <Mail className="w-16 h-16 text-brand-gold shrink-0" />
              <span>concierge@shikkis.in</span>
            </p>
          </div>
        </div>
      </div>

      <div className="border-t border-border py-16 text-center text-xs text-text-muted">
        <p>© 2026 Shikkis — Curated Style. All rights reserved. Built with precision for Indian & Fusion Couture.</p>
      </div>
    </footer>
  );
};
