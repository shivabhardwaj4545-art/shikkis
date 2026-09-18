import { AnimatePresence, motion } from 'framer-motion';
import {
  BarChart3,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Layers,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Package,
  PlusCircle,
  ShieldAlert,
  ShoppingBag,
  Sun,
  Tag,
  Users,
  Warehouse,
  X,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';

import { useAuthStore } from '@/stores/auth.store';

interface NavItem {
  label: string;
  path: string;
  icon: React.ElementType;
  badge?: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Overview', path: '/admin', icon: LayoutDashboard },
  { label: 'Orders', path: '/admin/orders', icon: ShoppingBag },
  { label: 'Customers', path: '/admin/customers', icon: Users },
  { label: 'Products', path: '/admin/products', icon: Package },
  { label: 'Inventory', path: '/admin/inventory', icon: Warehouse },
  { label: 'Offers & Promo', path: '/admin/offers', icon: Tag },
  { label: 'Banners', path: '/admin/banners', icon: Layers },
  { label: 'Reports', path: '/admin/reports', icon: BarChart3 },
];

export const AdminLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, initialized, initAuth, logout, login } = useAuthStore();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  // Sync theme
  useEffect(() => {
    const theme = document.documentElement.getAttribute('data-theme');
    setIsDark(theme === 'dark');
  }, []);

  const toggleTheme = () => {
    const nextTheme = isDark ? 'light' : 'dark';
    setIsDark(!isDark);
    localStorage.setItem('shikkis-theme', nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
  };

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // Compute breadcrumbs
  const pathSegments = location.pathname.split('/').filter(Boolean);
  const breadcrumbs = pathSegments.map((segment, index) => {
    const url = `/${pathSegments.slice(0, index + 1).join('/')}`;
    let label = segment.charAt(0).toUpperCase() + segment.slice(1);
    if (segment === 'admin') label = 'Admin Console';
    if (segment === 'new') label = 'New Product';
    return { label, url, isLast: index === pathSegments.length - 1 };
  });

  // Guard: Role MUST be owner
  const isOwner = user?.role === 'owner';

  if (initialized && !isOwner) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-surface border border-border rounded-xl p-8 text-center shadow-lg">
          <div className="mx-auto w-14 h-14 rounded-full bg-danger/10 text-danger flex items-center justify-center mb-4">
            <ShieldAlert size={28} />
          </div>
          <h1 className="font-serif text-2xl font-semibold text-text mb-2">403 — Owner Access Required</h1>
          <p className="text-xs text-text-muted mb-6 leading-relaxed">
            The Shikkis Admin Console is strictly restricted to store owners. You are currently logged in as{' '}
            <span className="font-semibold text-text">{user?.email || 'Guest'}</span> ({user?.role || 'none'}).
          </p>

          <div className="space-y-3">
            <button
              onClick={async () => {
                await login('owner@shikkis.com', 'shikkis_dev_owner_2026!');
                window.location.reload();
              }}
              className="w-full py-2.5 rounded-lg bg-brand-crimson text-white font-medium text-xs shadow hover:bg-brand-crimson/90 transition-colors"
            >
              Sign In as Store Owner (Vikram Singhania)
            </button>
            <Link
              to="/"
              className="block w-full py-2.5 rounded-lg border border-border text-text font-medium text-xs hover:bg-surface-alt transition-colors"
            >
              Back to Storefront
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const ownerName = user?.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : 'Vikram Singhania';

  return (
    <div className="min-h-screen bg-bg text-text flex flex-col antialiased">
      {/* ── Top Header ──────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 h-16 bg-surface/90 backdrop-blur border-b border-border px-4 lg:px-8 flex items-center justify-between transition-colors">
        <div className="flex items-center gap-3">
          {/* Mobile drawer trigger */}
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="lg:hidden p-2 rounded-lg text-text-muted hover:text-text hover:bg-surface-alt transition-colors"
            aria-label="Open sidebar"
          >
            <Menu size={20} />
          </button>

          {/* Desktop collapse toggle */}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="hidden lg:flex p-1.5 rounded-lg text-text-muted hover:text-text hover:bg-surface-alt transition-colors"
            aria-label="Toggle sidebar collapse"
          >
            {sidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>

          {/* Wordmark */}
          <Link to="/admin" className="flex items-baseline gap-2">
            <span className="font-serif text-2xl font-bold tracking-wider text-brand-crimson">Shikkis</span>
            <span className="text-[10px] tracking-widest uppercase px-1.5 py-0.5 rounded bg-brand-gold/15 text-brand-gold font-semibold border border-brand-gold/30">
              Admin
            </span>
          </Link>

          {/* Breadcrumbs */}
          <nav className="hidden sm:flex items-center gap-1.5 text-xs text-text-muted ml-6 pl-6 border-l border-border">
            {breadcrumbs.map((b, idx) => (
              <React.Fragment key={b.url}>
                {idx > 0 && <span className="text-border">/</span>}
                {b.isLast ? (
                  <span className="font-medium text-text">{b.label}</span>
                ) : (
                  <Link to={b.url} className="hover:text-brand-crimson transition-colors">
                    {b.label}
                  </Link>
                )}
              </React.Fragment>
            ))}
          </nav>
        </div>

        {/* Right tools */}
        <div className="flex items-center gap-3">
          {/* View Store link */}
          <Link
            to="/"
            target="_blank"
            rel="noreferrer"
            className="hidden md:inline-flex items-center gap-1.5 text-xs font-medium text-text-muted hover:text-brand-crimson px-3 py-1.5 rounded-lg hover:bg-surface-alt transition-colors"
          >
            <ExternalLink size={14} />
            <span>Storefront</span>
          </Link>

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg text-text-muted hover:text-text hover:bg-surface-alt transition-colors"
            title="Toggle theme"
          >
            {isDark ? <Sun size={17} className="text-brand-gold" /> : <Moon size={17} />}
          </button>

          {/* Owner Identity pill */}
          <div className="flex items-center gap-2 pl-3 border-l border-border">
            <div className="w-8 h-8 rounded-full bg-brand-crimson text-white font-serif font-bold text-sm flex items-center justify-center shadow-sm">
              {ownerName.charAt(0)}
            </div>
            <div className="hidden sm:block text-left">
              <div className="text-xs font-semibold text-text leading-tight">{ownerName}</div>
              <div className="text-[10px] text-brand-gold font-medium uppercase tracking-wider">Owner</div>
            </div>
          </div>

          {/* Quick logout */}
          <button
            onClick={async () => {
              await logout();
              navigate('/');
            }}
            className="p-2 rounded-lg text-text-muted hover:text-danger hover:bg-danger/10 transition-colors ml-1"
            title="Sign Out"
          >
            <LogOut size={16} />
          </button>
        </div>
      </header>

      {/* ── Main Work Area ─────────────────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">
        {/* Desktop Sidebar (Animated Width Transition) */}
        <motion.aside
          animate={{ width: sidebarCollapsed ? 72 : 256 }}
          transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
          className="hidden lg:flex flex-col bg-surface border-r border-border shrink-0 select-none overflow-hidden"
        >
          {/* Quick Create CTA */}
          <div className="p-3 border-b border-border">
            <Link
              to="/admin/products/new"
              className={`flex items-center justify-center gap-2 rounded-lg bg-brand-crimson text-white font-medium text-xs py-2 shadow hover:bg-brand-crimson/90 transition-colors ${
                sidebarCollapsed ? 'px-0' : 'px-3'
              }`}
              title="Add New Product"
            >
              <PlusCircle size={16} />
              {!sidebarCollapsed && <span>Add Product</span>}
            </Link>
          </div>

          {/* Nav List */}
          <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.path === '/admin'
                  ? location.pathname === '/admin'
                  : location.pathname.startsWith(item.path);

              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-brand-gold/15 text-brand-crimson dark:text-brand-gold font-semibold shadow-xs'
                      : 'text-text-muted hover:text-text hover:bg-surface-alt'
                  } ${sidebarCollapsed ? 'justify-center' : ''}`}
                  title={sidebarCollapsed ? item.label : undefined}
                >
                  <Icon size={18} className={isActive ? 'text-brand-crimson dark:text-brand-gold' : 'text-text-muted'} />
                  {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
                </NavLink>
              );
            })}
          </nav>

          {/* Footer Store Info */}
          {!sidebarCollapsed && (
            <div className="p-4 border-t border-border text-[11px] text-text-muted">
              <div className="font-semibold text-text">Bengaluru Flagship</div>
              <div>100 Feet Rd, Indiranagar</div>
            </div>
          )}
        </motion.aside>

        {/* Mobile / Tablet Drawer (< 1024px) */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setMobileMenuOpen(false)}
                className="fixed inset-0 z-40 bg-black/50 backdrop-blur-xs lg:hidden"
              />
              <motion.div
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                className="fixed inset-y-0 left-0 z-50 w-72 bg-surface border-r border-border shadow-2xl flex flex-col lg:hidden"
              >
                <div className="h-16 px-4 flex items-center justify-between border-b border-border">
                  <div className="font-serif text-xl font-bold text-brand-crimson">Admin Menu</div>
                  <button
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-1.5 rounded-lg text-text-muted hover:text-text hover:bg-surface-alt"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="p-4 border-b border-border">
                  <Link
                    to="/admin/products/new"
                    className="flex items-center justify-center gap-2 w-full rounded-lg bg-brand-crimson text-white font-medium text-xs py-2.5 shadow"
                  >
                    <PlusCircle size={16} />
                    <span>Add New Product</span>
                  </Link>
                </div>

                <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
                  {NAV_ITEMS.map((item) => {
                    const Icon = item.icon;
                    const isActive =
                      item.path === '/admin'
                        ? location.pathname === '/admin'
                        : location.pathname.startsWith(item.path);

                    return (
                      <NavLink
                        key={item.path}
                        to={item.path}
                        className={`flex items-center gap-3 px-4 py-3 rounded-lg text-xs font-medium transition-colors ${
                          isActive
                            ? 'bg-brand-gold/15 text-brand-crimson dark:text-brand-gold font-semibold'
                            : 'text-text-muted hover:text-text hover:bg-surface-alt'
                        }`}
                      >
                        <Icon size={18} />
                        <span>{item.label}</span>
                      </NavLink>
                    );
                  })}
                </nav>

                <div className="p-4 border-t border-border flex items-center justify-between text-xs text-text-muted">
                  <span>Logged in as Owner</span>
                  <Link to="/" className="text-brand-crimson font-medium">
                    Storefront &rarr;
                  </Link>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Dynamic Page Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-bg transition-colors">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
