import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingBag, User as UserIcon, Menu, X, Sun, Moon, Monitor, Shield } from 'lucide-react';
import { useAuthStore } from '../../hooks/useAuthStore.ts';
import { useCartStore } from '../../hooks/useCartStore.ts';
import { useTheme } from '../../hooks/useTheme.ts';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuthStore();
  const { totalCount, isBouncing, setDrawerOpen } = useCartStore();
  const { theme, setTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  const cartCount = totalCount();

  return (
    <header className="sticky top-0 z-40 w-full bg-surface/95 backdrop-blur-md border-b border-border transition-colors duration-200">
      {/* Slow Gold Shimmer Sweep Festival Header Banner */}
      <div className="animate-gold-shimmer text-white text-xs py-8 px-16 text-center font-medium tracking-wide uppercase shadow-sm">
        ✨ Heritage Festive Collection '26 — Free Express Shipping Across India ✨
      </div>

      <div className="max-w-7xl mx-auto px-16 sm:px-24 flex items-center justify-between h-72">
        {/* Mobile Hamburger Menu Button (< 768px) */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-8 text-text hover:text-brand-gold min-h-[44px] min-w-[44px] flex items-center justify-center rounded-sm"
          aria-label="Toggle navigation menu"
        >
          {mobileMenuOpen ? <X className="w-24 h-24" /> : <Menu className="w-24 h-24" />}
        </button>

        {/* Brand Logo */}
        <Link to="/" className="flex flex-col items-center md:items-start group">
          <span className="font-serif text-24 sm:text-28 font-bold tracking-wider text-brand-crimson dark:text-brand-gold uppercase transition-colors">
            SHIKKIS
          </span>
          <span className="text-[10px] tracking-[0.25em] text-text-muted uppercase font-sans -mt-4">
            Curated Style
          </span>
        </Link>

        {/* Desktop Horizontal Navigation (>= 768px) */}
        <nav className="hidden md:flex items-center gap-32 font-sans text-sm font-medium text-text">
          <Link to="/catalog" className="hover:text-brand-gold transition-colors">
            All Collections
          </Link>
          <Link to="/catalog?gender=women" className="hover:text-brand-gold transition-colors">
            Women Couture
          </Link>
          <Link to="/catalog?gender=men" className="hover:text-brand-gold transition-colors">
            Men Heritage
          </Link>
          <Link to="/catalog?sort=newest" className="hover:text-brand-gold transition-colors">
            New Arrivals
          </Link>
          {user?.role === 'owner' && (
            <Link to="/admin" className="flex items-center gap-4 text-brand-crimson dark:text-brand-gold font-semibold hover:underline">
              <Shield className="w-16 h-16" /> Owner Portal
            </Link>
          )}
        </nav>

        {/* Right Actions: Theme Toggle, User Profile, Shopping Bag */}
        <div className="flex items-center gap-12 sm:gap-16">
          {/* Theme Dropdown / Toggle */}
          <div className="relative group">
            <button
              className="p-8 text-text hover:text-brand-gold rounded-sm min-h-[44px] min-w-[44px] flex items-center justify-center transition-colors"
              aria-label="Select Theme"
            >
              {theme === 'light' ? <Sun className="w-20 h-20" /> : theme === 'dark' ? <Moon className="w-20 h-20" /> : <Monitor className="w-20 h-20" />}
            </button>
            <div className="absolute right-0 top-full mt-4 hidden group-hover:block bg-surface border border-border rounded-md shadow-lg py-4 w-36 z-50">
              <button
                onClick={() => setTheme('light')}
                className={`w-full px-12 py-8 text-left text-xs font-medium flex items-center gap-8 min-h-[44px] hover:bg-surface-alt ${theme === 'light' ? 'text-brand-gold' : 'text-text'}`}
              >
                <Sun className="w-14 h-14" /> Light
              </button>
              <button
                onClick={() => setTheme('dark')}
                className={`w-full px-12 py-8 text-left text-xs font-medium flex items-center gap-8 min-h-[44px] hover:bg-surface-alt ${theme === 'dark' ? 'text-brand-gold' : 'text-text'}`}
              >
                <Moon className="w-14 h-14" /> Dark
              </button>
              <button
                onClick={() => setTheme('system')}
                className={`w-full px-12 py-8 text-left text-xs font-medium flex items-center gap-8 min-h-[44px] hover:bg-surface-alt ${theme === 'system' ? 'text-brand-gold' : 'text-text'}`}
              >
                <Monitor className="w-14 h-14" /> System
              </button>
            </div>
          </div>

          {/* User Account / Auth */}
          {user ? (
            <div className="relative group">
              <button
                className="flex items-center gap-8 p-8 text-text hover:text-brand-gold rounded-sm min-h-[44px] text-xs font-medium"
                aria-label="User profile menu"
              >
                <UserIcon className="w-20 h-20" />
                <span className="hidden sm:inline font-semibold">{user.fullName.split(' ')[0]}</span>
              </button>
              <div className="absolute right-0 top-full mt-4 hidden group-hover:block bg-surface border border-border rounded-md shadow-lg py-8 w-48 z-50">
                <div className="px-16 py-8 border-b border-border text-xs">
                  <p className="font-semibold text-text">{user.fullName}</p>
                  <p className="text-text-muted truncate">{user.email}</p>
                  <span className="inline-block mt-4 text-[10px] uppercase font-bold text-brand-gold bg-brand-gold/10 px-6 py-2 rounded-sm">
                    Role: {user.role}
                  </span>
                </div>
                {user.role === 'owner' && (
                  <Link to="/admin" className="block px-16 py-10 text-xs font-semibold text-brand-crimson dark:text-brand-gold hover:bg-surface-alt min-h-[44px]">
                    Owner Dashboard
                  </Link>
                )}
                <Link to="/orders" className="block px-16 py-10 text-xs text-text hover:bg-surface-alt min-h-[44px]">
                  My Orders & Tracking
                </Link>
                <button
                  onClick={() => {
                    logout();
                    navigate('/');
                  }}
                  className="w-full text-left px-16 py-10 text-xs text-danger hover:bg-surface-alt min-h-[44px]"
                >
                  Sign Out
                </button>
              </div>
            </div>
          ) : (
            <Link
              to="/auth"
              className="p-8 text-text hover:text-brand-gold min-h-[44px] min-w-[44px] flex items-center justify-center text-xs font-semibold"
            >
              Sign In
            </Link>
          )}

          {/* Shopping Bag Drawer Button with Bouncing Scale Animation */}
          <button
            onClick={() => setDrawerOpen(true)}
            className="relative p-8 text-text hover:text-brand-gold min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Open shopping bag"
          >
            <ShoppingBag className="w-24 h-24" />
            {cartCount > 0 && (
              <span
                className={`absolute top-4 right-4 bg-brand-crimson text-white text-[10px] font-bold w-20 h-20 rounded-full flex items-center justify-center transition-transform duration-300 ${
                  isBouncing ? 'scale-125' : 'scale-100'
                }`}
              >
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Slide-down Menu (< 768px) */}
      {mobileMenuOpen && (
        <nav className="md:hidden border-t border-border bg-surface px-16 py-16 flex flex-col gap-12 text-sm font-medium">
          <Link
            to="/catalog"
            onClick={() => setMobileMenuOpen(false)}
            className="py-10 text-text hover:text-brand-gold min-h-[44px] flex items-center"
          >
            All Collections
          </Link>
          <Link
            to="/catalog?gender=women"
            onClick={() => setMobileMenuOpen(false)}
            className="py-10 text-text hover:text-brand-gold min-h-[44px] flex items-center"
          >
            Women Couture
          </Link>
          <Link
            to="/catalog?gender=men"
            onClick={() => setMobileMenuOpen(false)}
            className="py-10 text-text hover:text-brand-gold min-h-[44px] flex items-center"
          >
            Men Heritage
          </Link>
          {user?.role === 'owner' && (
            <Link
              to="/admin"
              onClick={() => setMobileMenuOpen(false)}
              className="py-10 text-brand-crimson dark:text-brand-gold font-bold min-h-[44px] flex items-center gap-8"
            >
              <Shield className="w-18 h-18" /> Owner Dashboard
            </Link>
          )}
        </nav>
      )}
    </header>
  );
};
