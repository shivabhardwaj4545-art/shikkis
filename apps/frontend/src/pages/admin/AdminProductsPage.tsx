import { motion } from 'framer-motion';
import {
  ArrowUpDown,
  CheckSquare,
  Download,
  Edit,
  ExternalLink,
  Package,
  Plus,
  RefreshCw,
  Search,
  Square,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { api, type AdminProductItem, type CategoryItem } from '@/lib/api';
import { formatPrice } from '@/lib/format';

export const AdminProductsPage: React.FC = () => {
  const [products, setProducts] = useState<AdminProductItem[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Filters & Sorting
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedGender, setSelectedGender] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Bulk Selection
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkProcessing, setBulkProcessing] = useState(false);

  // Load categories for filter
  useEffect(() => {
    api.getCategories().then((res) => setCategories(res.data)).catch(console.error);
  }, []);

  // Fetch products
  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res = await api.adminGetProducts({
        page,
        limit: 15,
        search: search.trim() || undefined,
        category_id: selectedCategory === 'all' ? undefined : selectedCategory,
        gender: selectedGender === 'all' ? undefined : selectedGender,
        is_active: statusFilter === 'all' ? undefined : statusFilter,
        sort_by: sortBy,
        order: sortOrder,
      });

      setProducts(res.data);
      setTotalPages(res.pagination.total_pages);
      setTotalCount(res.pagination.total);
    } catch (err) {
      console.error('Failed to load products:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [page, search, selectedCategory, selectedGender, statusFilter, sortBy, sortOrder]);

  // Optimistic Toggle Status
  const handleToggleStatus = async (product: AdminProductItem) => {
    const nextState = !product.is_active;

    // Optimistic UI update
    setProducts((prev) =>
      prev.map((p) => (p.id === product.id ? { ...p, is_active: nextState } : p))
    );

    try {
      await api.adminToggleProductStatus(product.id, nextState);
    } catch (err) {
      console.error('Failed to toggle status, reverting:', err);
      // Revert on failure
      setProducts((prev) =>
        prev.map((p) => (p.id === product.id ? { ...p, is_active: product.is_active } : p))
      );
    }
  };

  // Bulk actions
  const handleSelectAll = () => {
    if (selectedIds.length === products.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(products.map((p) => p.id));
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleBulkAction = async (action: 'activate' | 'deactivate' | 'delete') => {
    if (selectedIds.length === 0) return;
    if (action === 'delete' && !window.confirm(`Permanently delete ${selectedIds.length} products?`)) {
      return;
    }

    try {
      setBulkProcessing(true);
      await api.adminBulkProducts(selectedIds, action);
      setSelectedIds([]);
      await fetchProducts();
    } catch (err) {
      console.error('Bulk action failed:', err);
    } finally {
      setBulkProcessing(false);
    }
  };

  // CSV Export
  const handleExportCsv = async () => {
    try {
      const token = localStorage.getItem('shikkis_access_token');
      const res = await fetch('/api/admin/products/export', {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `shikkis-products-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      console.error('Failed to export CSV:', err);
    }
  };

  const handleSort = (col: string) => {
    if (sortBy === col) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(col);
      setSortOrder('asc');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold text-text">Products Catalog</h1>
          <p className="text-xs text-text-muted mt-1">
            Manage your boutique inventory, pricing, sizing matrix, and storefront availability.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border bg-surface text-xs font-medium text-text hover:bg-surface-alt transition-colors"
            title="Download CSV report"
          >
            <Download size={14} />
            <span>Export CSV</span>
          </button>
          <Link
            to="/admin/products/new"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand-crimson text-white text-xs font-semibold shadow hover:bg-brand-crimson/90 transition-colors"
          >
            <Plus size={15} />
            <span>Add Product</span>
          </Link>
        </div>
      </div>

      {/* ── Filters & Search Strip ─────────────────────────────────────────── */}
      <div className="p-4 rounded-xl bg-surface border border-border flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs">
        {/* Search */}
        <div className="relative flex-1 min-w-[240px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            placeholder="Search by name, SKU, or description..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-bg border border-border text-xs text-text placeholder:text-text-muted focus:outline-hidden focus:border-brand-gold"
          />
        </div>

        {/* Filter Dropdowns */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Category */}
          <select
            value={selectedCategory}
            onChange={(e) => {
              setSelectedCategory(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 rounded-lg bg-bg border border-border text-xs text-text focus:outline-hidden"
          >
            <option value="all">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Gender */}
          <select
            value={selectedGender}
            onChange={(e) => {
              setSelectedGender(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 rounded-lg bg-bg border border-border text-xs text-text focus:outline-hidden"
          >
            <option value="all">All Genders</option>
            <option value="women">Women</option>
            <option value="men">Men</option>
            <option value="unisex">Unisex</option>
          </select>

          {/* Status */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 rounded-lg bg-bg border border-border text-xs text-text focus:outline-hidden"
          >
            <option value="all">All Statuses</option>
            <option value="true">Active Only</option>
            <option value="false">Inactive Only</option>
          </select>

          <button
            onClick={fetchProducts}
            className="p-2 rounded-lg border border-border bg-bg text-text-muted hover:text-text"
            title="Refresh list"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* ── Bulk Actions Bar (Shown when items selected) ───────────────────── */}
      {selectedIds.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 rounded-lg bg-brand-gold/10 border border-brand-gold/30 flex items-center justify-between text-xs text-text"
        >
          <div className="font-semibold text-brand-gold flex items-center gap-2">
            <span>{selectedIds.length} products selected</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleBulkAction('activate')}
              disabled={bulkProcessing}
              className="px-3 py-1.5 rounded bg-surface border border-border hover:bg-surface-alt font-medium text-emerald-600 dark:text-emerald-400"
            >
              Activate
            </button>
            <button
              onClick={() => handleBulkAction('deactivate')}
              disabled={bulkProcessing}
              className="px-3 py-1.5 rounded bg-surface border border-border hover:bg-surface-alt font-medium text-warning"
            >
              Deactivate
            </button>
            <button
              onClick={() => handleBulkAction('delete')}
              disabled={bulkProcessing}
              className="px-3 py-1.5 rounded bg-surface border border-border hover:bg-danger/10 font-medium text-danger"
            >
              Delete
            </button>
          </div>
        </motion.div>
      )}

      {/* ── Desktop Table (>= 1024px) ──────────────────────────────────────── */}
      <div className="hidden lg:block rounded-xl bg-surface border border-border overflow-hidden shadow-xs">
        <table className="w-full text-left text-xs">
          <thead className="bg-surface-alt/60 border-b border-border text-text-muted uppercase text-[11px] font-semibold tracking-wider">
            <tr>
              <th className="p-3.5 w-10 text-center">
                <button onClick={handleSelectAll} className="p-1 rounded text-text-muted hover:text-text">
                  {selectedIds.length === products.length && products.length > 0 ? (
                    <CheckSquare size={16} className="text-brand-crimson" />
                  ) : (
                    <Square size={16} />
                  )}
                </button>
              </th>
              <th className="p-3.5 w-16">Image</th>
              <th className="p-3.5 cursor-pointer hover:text-text" onClick={() => handleSort('name')}>
                <div className="flex items-center gap-1">
                  <span>Product Name</span>
                  <ArrowUpDown size={12} />
                </div>
              </th>
              <th className="p-3.5 cursor-pointer hover:text-text" onClick={() => handleSort('sku')}>
                <div className="flex items-center gap-1">
                  <span>SKU</span>
                  <ArrowUpDown size={12} />
                </div>
              </th>
              <th className="p-3.5">Category</th>
              <th className="p-3.5">Gender</th>
              <th className="p-3.5 cursor-pointer hover:text-text" onClick={() => handleSort('price')}>
                <div className="flex items-center gap-1">
                  <span>Price</span>
                  <ArrowUpDown size={12} />
                </div>
              </th>
              <th className="p-3.5">Discount</th>
              <th className="p-3.5 cursor-pointer hover:text-text" onClick={() => handleSort('stock')}>
                <div className="flex items-center gap-1">
                  <span>Total Stock</span>
                  <ArrowUpDown size={12} />
                </div>
              </th>
              <th className="p-3.5 text-center">Active</th>
              <th className="p-3.5 text-right">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-border/60">
            {products.length === 0 ? (
              <tr>
                <td colSpan={11} className="py-12 text-center text-text-muted">
                  {loading ? 'Loading catalog products...' : 'No products match your search or filter criteria.'}
                </td>
              </tr>
            ) : (
              products.map((prod) => (
                <tr key={prod.id} className="hover:bg-surface-alt/30 transition-colors group">
                  {/* Select Checkbox */}
                  <td className="p-3.5 text-center">
                    <button
                      onClick={() => handleToggleSelect(prod.id)}
                      className="p-1 rounded text-text-muted hover:text-text"
                    >
                      {selectedIds.includes(prod.id) ? (
                        <CheckSquare size={16} className="text-brand-crimson" />
                      ) : (
                        <Square size={16} />
                      )}
                    </button>
                  </td>

                  {/* Thumbnail */}
                  <td className="p-3.5">
                    <div className="w-12 h-14 rounded bg-surface-alt overflow-hidden border border-border/70 shrink-0">
                      {prod.primary_image ? (
                        <img
                          src={prod.primary_image}
                          alt={prod.name}
                          className="w-full h-full object-cover object-top"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-text-muted">
                          <Package size={16} />
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Name & Slug */}
                  <td className="p-3.5">
                    <Link
                      to={`/admin/products/${prod.id}`}
                      className="font-medium text-text hover:text-brand-crimson font-serif text-sm transition-colors block line-clamp-1"
                    >
                      {prod.name}
                    </Link>
                    <span className="text-[10px] text-text-muted font-mono">{prod.slug}</span>
                  </td>

                  {/* SKU */}
                  <td className="p-3.5 font-mono text-[11px] text-text">{prod.sku}</td>

                  {/* Category */}
                  <td className="p-3.5 text-text-muted">{prod.category_name || '—'}</td>

                  {/* Gender */}
                  <td className="p-3.5 capitalize text-text-muted">{prod.gender}</td>

                  {/* Price */}
                  <td className="p-3.5 font-medium text-text">
                    {formatPrice(prod.final_price_paise)}
                    {prod.discount_percent > 0 && (
                      <span className="block text-[10px] text-text-muted line-through">
                        {formatPrice(prod.mrp)}
                      </span>
                    )}
                  </td>

                  {/* Discount */}
                  <td className="p-3.5">
                    {prod.discount_percent > 0 ? (
                      <span className="px-2 py-0.5 rounded-full bg-brand-crimson/10 text-brand-crimson font-semibold text-[10px]">
                        {prod.discount_percent}% OFF
                      </span>
                    ) : (
                      <span className="text-text-muted">—</span>
                    )}
                  </td>

                  {/* Stock */}
                  <td className="p-3.5">
                    <span
                      className={`font-semibold ${
                        prod.total_stock === 0
                          ? 'text-danger'
                          : prod.total_stock < 5
                          ? 'text-warning'
                          : 'text-text'
                      }`}
                    >
                      {prod.total_stock}
                    </span>
                    <span className="text-[10px] text-text-muted block">
                      {prod.variant_count} {prod.variant_count === 1 ? 'variant' : 'variants'}
                    </span>
                  </td>

                  {/* Inline Active Toggle with Switch Animation */}
                  <td className="p-3.5 text-center">
                    <button
                      onClick={() => handleToggleStatus(prod)}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                        prod.is_active ? 'bg-emerald-600' : 'bg-surface-alt border-border'
                      }`}
                      title={prod.is_active ? 'Active — click to disable' : 'Inactive — click to enable'}
                    >
                      <motion.span
                        layout
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 ${
                          prod.is_active ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </td>

                  {/* Actions */}
                  <td className="p-3.5 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Link
                        to={`/products/${prod.slug}`}
                        target="_blank"
                        className="p-1.5 rounded-lg text-text-muted hover:text-text hover:bg-surface-alt"
                        title="View on storefront"
                      >
                        <ExternalLink size={14} />
                      </Link>
                      <Link
                        to={`/admin/products/${prod.id}`}
                        className="p-1.5 rounded-lg text-text-muted hover:text-brand-crimson hover:bg-brand-crimson/10"
                        title="Edit product"
                      >
                        <Edit size={14} />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ── Mobile & Tablet Card-per-row (< 1024px) ───────────────────────── */}
      <div className="lg:hidden space-y-3">
        {products.length === 0 ? (
          <div className="p-8 rounded-xl bg-surface border border-border text-center text-xs text-text-muted">
            {loading ? 'Loading products...' : 'No products found.'}
          </div>
        ) : (
          products.map((prod) => (
            <div
              key={prod.id}
              className="p-4 rounded-xl bg-surface border border-border flex items-center justify-between gap-3 shadow-xs"
            >
              <div className="flex items-center gap-3 min-w-0">
                {/* Checkbox */}
                <button
                  onClick={() => handleToggleSelect(prod.id)}
                  className="p-1 text-text-muted hover:text-text shrink-0"
                >
                  {selectedIds.includes(prod.id) ? (
                    <CheckSquare size={18} className="text-brand-crimson" />
                  ) : (
                    <Square size={18} />
                  )}
                </button>

                {/* Thumbnail */}
                <div className="w-14 h-16 rounded bg-surface-alt overflow-hidden border border-border/60 shrink-0">
                  {prod.primary_image ? (
                    <img
                      src={prod.primary_image}
                      alt={prod.name}
                      className="w-full h-full object-cover object-top"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-text-muted">
                      <Package size={16} />
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="min-w-0">
                  <Link
                    to={`/admin/products/${prod.id}`}
                    className="font-serif font-semibold text-text text-sm hover:text-brand-crimson truncate block"
                  >
                    {prod.name}
                  </Link>
                  <div className="flex items-center gap-2 text-[11px] text-text-muted mt-0.5">
                    <span className="font-mono">{prod.sku}</span>
                    <span>&bull;</span>
                    <span>{prod.category_name}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs font-bold text-text">
                      {formatPrice(prod.final_price_paise)}
                    </span>
                    <span
                      className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                        prod.total_stock === 0
                          ? 'bg-danger/10 text-danger'
                          : prod.total_stock < 5
                          ? 'bg-warning/10 text-warning'
                          : 'bg-surface-alt text-text-muted'
                      }`}
                    >
                      {prod.total_stock} in stock
                    </span>
                  </div>
                </div>
              </div>

              {/* Right switches and actions */}
              <div className="flex flex-col items-end gap-2 shrink-0">
                <button
                  onClick={() => handleToggleStatus(prod)}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                    prod.is_active ? 'bg-emerald-600' : 'bg-surface-alt border-border'
                  }`}
                >
                  <motion.span
                    layout
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 ${
                      prod.is_active ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>

                <Link
                  to={`/admin/products/${prod.id}`}
                  className="p-1.5 rounded-lg border border-border text-text-muted hover:text-brand-crimson hover:bg-surface-alt text-xs"
                >
                  <Edit size={14} />
                </Link>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ── Pagination ──────────────────────────────────────────────────────── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between p-4 rounded-xl bg-surface border border-border text-xs text-text-muted">
          <span>
            Showing page <strong className="text-text">{page}</strong> of{' '}
            <strong className="text-text">{totalPages}</strong> ({totalCount} items)
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1.5 rounded border border-border bg-bg text-text disabled:opacity-40"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-3 py-1.5 rounded border border-border bg-bg text-text disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
