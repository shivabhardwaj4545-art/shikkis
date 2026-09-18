import { motion } from 'framer-motion';
import { ArrowRight, Compass, Home, Search, Sparkles } from 'lucide-react';
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { fadeIn, fadeInUp, useMotionSafe } from '@/lib/motion';

export const NotFoundPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();
  const containerVariants = useMotionSafe(fadeIn);
  const cardVariants = useMotionSafe(fadeInUp);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/catalog?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const quickLinks = [
    { label: "Women's Collection", to: '/catalog?gender=women' },
    { label: "Men's Heritage", to: '/catalog?gender=men' },
    { label: 'New Arrivals', to: '/catalog?sort=newest' },
    { label: 'Festive Offers', to: '/catalog?sale=true' },
  ];

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="min-h-[80vh] flex items-center justify-center py-16 px-4 md:px-8 bg-bg text-text"
    >
      <motion.div
        variants={cardVariants}
        className="max-w-2xl w-full text-center space-y-8 bg-surface border border-border rounded-2xl p-8 sm:p-12 shadow-xl relative overflow-hidden"
      >
        {/* Subtle decorative background glow */}
        <div
          aria-hidden="true"
          className="absolute -top-24 -right-24 w-60 h-60 bg-brand-gold/10 rounded-full blur-3xl pointer-events-none"
        />
        <div
          aria-hidden="true"
          className="absolute -bottom-24 -left-24 w-60 h-60 bg-brand-crimson/10 rounded-full blur-3xl pointer-events-none"
        />

        {/* Brand Badge */}
        <div className="inline-flex items-center gap-1.5 rounded-full bg-brand-gold/15 px-3.5 py-1 text-xs font-semibold tracking-widest text-brand-crimson dark:text-brand-gold uppercase border border-brand-gold/40">
          <Sparkles size={13} className="text-brand-gold" />
          <span>Lost in Grandeur</span>
        </div>

        {/* 404 Visual Heading */}
        <div className="space-y-3">
          <span className="block font-serif text-7xl sm:text-8xl font-light tracking-tighter text-brand-crimson dark:text-brand-gold">
            404
          </span>
          <h1 className="font-serif text-3xl sm:text-4xl text-text font-medium">
            A Masterpiece Beyond Reach
          </h1>
          <p className="text-sm sm:text-base text-text-muted max-w-md mx-auto leading-relaxed">
            The creation or collection you are seeking may have transitioned to another gallery,
            or was exclusively reserved.
          </p>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="max-w-md mx-auto flex gap-2">
          <div className="relative flex-1">
            <Search
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search handloom, lehengas, kurtas..."
              aria-label="Search catalog"
              className="w-full rounded-lg border border-border bg-surface-alt/60 pl-10 pr-4 py-2.5 text-xs sm:text-sm text-text placeholder:text-text-muted focus:border-brand-gold focus:outline-none focus:ring-1 focus:ring-brand-gold transition-colors"
            />
          </div>
          <button
            type="submit"
            className="min-h-[44px] px-5 rounded-lg bg-brand-crimson text-white font-medium text-xs sm:text-sm hover:bg-brand-crimson/90 active:scale-[0.98] transition-all shadow-md"
          >
            Search
          </button>
        </form>

        {/* Quick Suggestion Chips */}
        <div className="pt-2 border-t border-border/60">
          <p className="text-xs uppercase tracking-wider text-text-muted mb-3 font-semibold">
            Suggested Collections
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {quickLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="min-h-[44px] inline-flex items-center px-4 py-2 text-xs font-medium rounded-full bg-surface-alt hover:bg-brand-gold/15 border border-border hover:border-brand-gold text-text transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Return Home CTA */}
        <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            to="/"
            className="min-h-[44px] w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg bg-surface text-text border border-border hover:border-brand-gold font-medium text-xs sm:text-sm transition-colors"
          >
            <Home size={15} />
            <span>Return to Sanctuary</span>
          </Link>
          <Link
            to="/catalog"
            className="min-h-[44px] w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg bg-brand-crimson text-white font-medium text-xs sm:text-sm hover:bg-brand-crimson/90 active:scale-[0.98] transition-all shadow-md"
          >
            <Compass size={15} />
            <span>Browse Full Catalog</span>
            <ArrowRight size={14} />
          </Link>
        </div>
      </motion.div>
    </motion.div>
  );
};
