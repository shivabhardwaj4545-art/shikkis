import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertCircle,
  AlertTriangle,
  ArrowUpDown,
  Check,
  CheckSquare,
  History,
  Plus,
  RefreshCw,
  Search,
  Square,
  Warehouse,
  X,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';

import { api, type AdminAuditLogItem, type AdminInventoryItem, type ProductItem } from '@/lib/api';

export const AdminInventoryPage: React.FC = () => {
  const [items, setItems] = useState<AdminInventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Filters
  const [search, setSearch] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Multi-select for batch update
  const [selectedVariantIds, setSelectedVariantIds] = useState<string[]>([]);
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [batchStockValue, setBatchStockValue] = useState<number>(20);
  const [batchUpdating, setBatchUpdating] = useState(false);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Audit Logs
  const [auditLogs, setAuditLogs] = useState<AdminAuditLogItem[]>([]);
  const [auditDrawerOpen, setAuditDrawerOpen] = useState(false);
  const [loadingAudit, setLoadingAudit] = useState(false);

  // Add New Inventory Variant Modal State
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [productsList, setProductsList] = useState<ProductItem[]>([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [sizeInput, setSizeInput] = useState('M');
  const [colorInput, setColorInput] = useState('Royal Navy');
  const [stockInput, setStockInput] = useState<number>(10);
  const [skuInput, setSkuInput] = useState('');
  const [priceOverrideInput, setPriceOverrideInput] = useState('');

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const res = await api.adminGetInventory({
        page,
        limit: 30,
        search: search.trim() || undefined,
        low_stock: lowStockOnly || undefined,
        order: sortOrder,
      });

      setItems(res.data);
      setTotalPages(res.pagination.total_pages);
      setTotalCount(res.pagination.total);
    } catch (err) {
      console.error('Failed to fetch inventory:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, [page, search, lowStockOnly, sortOrder]);

  // Load products list for Add Inventory dropdown
  const loadProductsList = async () => {
    try {
      const res = await api.getProducts({ limit: 100 });
      setProductsList(res.data || []);
      if (res.data && res.data.length > 0 && !selectedProductId) {
        setSelectedProductId(res.data[0].id);
      }
    } catch (err) {
      console.error('Failed to load products list:', err);
    }
  };

  const openAddInventoryModal = () => {
    setAddError(null);
    setAddModalOpen(true);
    loadProductsList();
  };

  // Auto-generate SKU when product, size, or color changes
  useEffect(() => {
    if (!selectedProductId) return;
    const prod = productsList.find((p) => p.id === selectedProductId);
    if (prod && prod.sku) {
      const cleanSize = (sizeInput || 'FREE').toUpperCase().replace(/\s+/g, '');
      const cleanColor = (colorInput || 'DEFAULT').toUpperCase().replace(/\s+/g, '');
      setSkuInput(`${prod.sku}-${cleanSize}-${cleanColor}`);
    }
  }, [selectedProductId, sizeInput, colorInput, productsList]);

  const handleAddInventorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId) {
      setAddError('Please select a product.');
      return;
    }
    if (!sizeInput.trim()) {
      setAddError('Size is required.');
      return;
    }
    if (!colorInput.trim()) {
      setAddError('Colour is required.');
      return;
    }
    if (stockInput < 0) {
      setAddError('Stock quantity cannot be negative.');
      return;
    }

    try {
      setAddLoading(true);
      setAddError(null);

      const pricePaise = priceOverrideInput ? Math.round(parseFloat(priceOverrideInput) * 100) : undefined;

      const res = await api.adminAddInventoryVariant({
        product_id: selectedProductId,
        size: sizeInput.trim(),
        color: colorInput.trim(),
        stock: stockInput,
        variant_sku: skuInput.trim() || undefined,
        price_override: pricePaise,
      });

      setSuccessNotice(res.message || 'Successfully added new inventory item.');
      setTimeout(() => setSuccessNotice(null), 4000);
      setAddModalOpen(false);
      await fetchInventory();
    } catch (err: any) {
      setAddError(err?.message || 'Failed to add inventory item.');
    } finally {
      setAddLoading(false);
    }
  };

  // Selection
  const handleSelectAll = () => {
    if (selectedVariantIds.length === items.length) {
      setSelectedVariantIds([]);
    } else {
      setSelectedVariantIds(items.map((i) => i.variant_id));
    }
  };

  const handleToggleSelect = (variantId: string) => {
    setSelectedVariantIds((prev) =>
      prev.includes(variantId) ? prev.filter((id) => id !== variantId) : [...prev, variantId]
    );
  };

  // Batch Update
  const handleApplyBatchUpdate = async () => {
    if (selectedVariantIds.length === 0 || batchStockValue < 0) return;

    try {
      setBatchUpdating(true);
      const res = await api.adminBatchUpdateStock(selectedVariantIds, batchStockValue);
      setSuccessNotice(res.message);
      setTimeout(() => setSuccessNotice(null), 4000);
      setBatchModalOpen(false);
      setSelectedVariantIds([]);
      await fetchInventory();
    } catch (err) {
      console.error('Failed batch update:', err);
    } finally {
      setBatchUpdating(false);
    }
  };

  // View Audit Logs
  const openAuditLogs = async () => {
    setAuditDrawerOpen(true);
    setLoadingAudit(true);
    try {
      const res = await api.adminGetInventoryAuditLogs();
      setAuditLogs(res.data);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoadingAudit(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* ── Page Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold text-text">Inventory Management</h1>
          <p className="text-xs text-text-muted mt-1">
            Track variant-level boutique inventory, identify low stock warnings, add new stock, and run batch restocks.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* + Add Inventory Button */}
          <button
            onClick={openAddInventoryModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-brand-crimson text-white text-xs font-semibold shadow hover:bg-brand-crimson/90 transition-colors"
          >
            <Plus size={15} />
            <span>Add Inventory Item</span>
          </button>

          <button
            onClick={openAuditLogs}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border bg-surface text-xs font-medium text-text hover:bg-surface-alt transition-colors"
          >
            <History size={14} />
            <span>Audit Trail</span>
          </button>

          {selectedVariantIds.length > 0 && (
            <button
              onClick={() => setBatchModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand-gold text-text-dark text-xs font-semibold shadow hover:opacity-90 transition-colors"
            >
              <span>Batch Update ({selectedVariantIds.length})</span>
            </button>
          )}
        </div>
      </div>

      {/* Success Banner */}
      {successNotice && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-xs font-medium flex items-center gap-2"
        >
          <Check size={16} />
          <span>{successNotice}</span>
        </motion.div>
      )}

      {/* ── Filters & Search ─────────────────────────────────────────────────── */}
      <div className="p-4 rounded-xl bg-surface border border-border flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs">
        <div className="relative flex-1 min-w-[240px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            placeholder="Search by product name, SKU, or variant code..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-bg border border-border text-xs text-text placeholder:text-text-muted focus:outline-hidden focus:border-brand-gold"
          />
        </div>

        <div className="flex items-center gap-3">
          {/* Low Stock Toggle */}
          <button
            onClick={() => {
              setLowStockOnly(!lowStockOnly);
              setPage(1);
            }}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium transition-colors ${
              lowStockOnly
                ? 'bg-warning/15 border-warning/50 text-warning font-semibold'
                : 'bg-bg border-border text-text-muted hover:text-text'
            }`}
          >
            <AlertTriangle size={14} />
            <span>Low Stock Only (&lt; 5)</span>
          </button>

          {/* Sort order toggle */}
          <button
            onClick={() => setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border bg-bg text-xs font-medium text-text hover:bg-surface-alt"
            title="Toggle stock sort order"
          >
            <ArrowUpDown size={14} />
            <span>Stock: {sortOrder === 'asc' ? 'Low to High' : 'High to Low'}</span>
          </button>

          <button
            onClick={fetchInventory}
            className="p-2 rounded-lg border border-border bg-bg text-text-muted hover:text-text"
            title="Refresh"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* ── Inventory Variants Table ────────────────────────────────────────── */}
      <div className="rounded-xl bg-surface border border-border overflow-hidden shadow-xs">
        <table className="w-full text-left text-xs">
          <thead className="bg-surface-alt/60 border-b border-border text-text-muted uppercase text-[11px] font-semibold tracking-wider">
            <tr>
              <th className="p-3.5 w-10 text-center">
                <button onClick={handleSelectAll} className="p-1 rounded text-text-muted hover:text-text">
                  {selectedVariantIds.length === items.length && items.length > 0 ? (
                    <CheckSquare size={16} className="text-brand-crimson" />
                  ) : (
                    <Square size={16} />
                  )}
                </button>
              </th>
              <th className="p-3.5">Product Name</th>
              <th className="p-3.5">Variant SKU</th>
              <th className="p-3.5">Size</th>
              <th className="p-3.5">Colour</th>
              <th className="p-3.5">Category</th>
              <th className="p-3.5 text-right">Available Stock</th>
              <th className="p-3.5 text-center">Stock Health</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-border/60">
            {items.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-text-muted">
                  {loading ? 'Checking boutique stock levels...' : 'No inventory records found.'}
                </td>
              </tr>
            ) : (
              items.map((item) => {
                const isSelected = selectedVariantIds.includes(item.variant_id);

                return (
                  <tr
                    key={item.variant_id}
                    className={`hover:bg-surface-alt/30 transition-colors ${
                      item.is_out_of_stock
                        ? 'bg-danger/5'
                        : item.is_low_stock
                        ? 'bg-warning/5'
                        : ''
                    }`}
                  >
                    {/* Select Checkbox */}
                    <td className="p-3.5 text-center">
                      <button
                        onClick={() => handleToggleSelect(item.variant_id)}
                        className="p-1 text-text-muted hover:text-text"
                      >
                        {isSelected ? (
                          <CheckSquare size={16} className="text-brand-crimson" />
                        ) : (
                          <Square size={16} />
                        )}
                      </button>
                    </td>

                    {/* Product Name */}
                    <td className="p-3.5 font-medium text-text">
                      <span className="font-serif text-sm block line-clamp-1">{item.product_name}</span>
                      <span className="text-[10px] text-text-muted font-mono">{item.product_sku}</span>
                    </td>

                    {/* Variant SKU */}
                    <td className="p-3.5 font-mono text-[11px] text-text font-semibold">
                      {item.variant_sku}
                    </td>

                    {/* Size */}
                    <td className="p-3.5">
                      <span className="px-2 py-0.5 rounded bg-surface-alt font-mono text-[11px] font-medium text-text border border-border/60">
                        {item.size}
                      </span>
                    </td>

                    {/* Colour */}
                    <td className="p-3.5 text-text">{item.color}</td>

                    {/* Category */}
                    <td className="p-3.5 text-text-muted">{item.category_name}</td>

                    {/* Stock Value */}
                    <td className="p-3.5 text-right font-mono font-bold text-sm">
                      <span
                        className={
                          item.is_out_of_stock
                            ? 'text-danger'
                            : item.is_low_stock
                            ? 'text-warning'
                            : 'text-text'
                        }
                      >
                        {item.stock}
                      </span>
                    </td>

                    {/* Status Pill */}
                    <td className="p-3.5 text-center">
                      {item.is_out_of_stock ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-danger/15 text-danger font-semibold text-[10px] border border-danger/30">
                          <AlertCircle size={11} />
                          <span>Out of Stock</span>
                        </span>
                      ) : item.is_low_stock ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-warning/15 text-warning font-semibold text-[10px] border border-warning/30">
                          <AlertTriangle size={11} />
                          <span>Low Stock ({item.stock})</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-semibold text-[10px] border border-emerald-500/20">
                          <Check size={11} />
                          <span>In Stock</span>
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ── Pagination ──────────────────────────────────────────────────────── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between p-4 rounded-xl bg-surface border border-border text-xs text-text-muted">
          <span>
            Page <strong className="text-text">{page}</strong> of <strong className="text-text">{totalPages}</strong>{' '}
            ({totalCount} variants)
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

      {/* ── Add New Inventory Variant Item Modal ────────────────────────────── */}
      <AnimatePresence>
        {addModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="max-w-lg w-full bg-surface border border-border rounded-xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-2 text-brand-crimson">
                  <Warehouse size={20} />
                  <h3 className="font-serif text-lg font-bold text-text">Add New Inventory Item</h3>
                </div>
                <button onClick={() => setAddModalOpen(false)} className="p-1 rounded text-text-muted hover:text-text">
                  <X size={18} />
                </button>
              </div>

              {addError && (
                <div className="p-3 rounded-lg bg-danger/10 border border-danger/30 text-danger text-xs flex items-center gap-2">
                  <AlertCircle size={15} />
                  <span>{addError}</span>
                </div>
              )}

              <form onSubmit={handleAddInventorySubmit} className="space-y-4">
                {/* Product Selector */}
                <div>
                  <label className="block text-xs font-semibold text-text mb-1">
                    Select Product <span className="text-brand-crimson">*</span>
                  </label>
                  <select
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-bg border border-border text-xs text-text focus:outline-hidden focus:border-brand-gold"
                    required
                  >
                    {productsList.length === 0 ? (
                      <option value="">Loading products...</option>
                    ) : (
                      productsList.map((prod) => (
                        <option key={prod.id} value={prod.id}>
                          {prod.name} ({prod.sku})
                        </option>
                      ))
                    )}
                  </select>
                </div>

                {/* Size & Colour */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-text mb-1">
                      Size <span className="text-brand-crimson">*</span>
                    </label>
                    <input
                      type="text"
                      value={sizeInput}
                      onChange={(e) => setSizeInput(e.target.value)}
                      placeholder="e.g. S, M, L, XL, Free Size"
                      className="w-full px-3 py-2 rounded-lg bg-bg border border-border text-xs text-text focus:outline-hidden focus:border-brand-gold"
                      required
                    />
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {['XS', 'S', 'M', 'L', 'XL', 'XXL', 'Free Size'].map((sz) => (
                        <button
                          key={sz}
                          type="button"
                          onClick={() => setSizeInput(sz)}
                          className={`px-1.5 py-0.5 rounded text-[10px] border transition-colors ${
                            sizeInput === sz
                              ? 'bg-brand-crimson text-white border-brand-crimson font-semibold'
                              : 'bg-bg text-text-muted border-border hover:text-text'
                          }`}
                        >
                          {sz}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-text mb-1">
                      Colour <span className="text-brand-crimson">*</span>
                    </label>
                    <input
                      type="text"
                      value={colorInput}
                      onChange={(e) => setColorInput(e.target.value)}
                      placeholder="e.g. Midnight Navy, Emerald Gold"
                      className="w-full px-3 py-2 rounded-lg bg-bg border border-border text-xs text-text focus:outline-hidden focus:border-brand-gold"
                      required
                    />
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {['Midnight Navy', 'Emerald Gold', 'Indigo White', 'Royal Black', 'Mustard Yellow'].map((clr) => (
                        <button
                          key={clr}
                          type="button"
                          onClick={() => setColorInput(clr)}
                          className={`px-1.5 py-0.5 rounded text-[10px] border transition-colors ${
                            colorInput === clr
                              ? 'bg-brand-gold text-text-dark font-semibold border-brand-gold'
                              : 'bg-bg text-text-muted border-border hover:text-text'
                          }`}
                        >
                          {clr}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Variant SKU */}
                <div>
                  <label className="block text-xs font-semibold text-text mb-1">
                    Variant SKU Code (Auto-Generated)
                  </label>
                  <input
                    type="text"
                    value={skuInput}
                    onChange={(e) => setSkuInput(e.target.value)}
                    placeholder="SHK-PROD-SIZE-COLOR"
                    className="w-full px-3 py-2 rounded-lg bg-bg border border-border font-mono text-xs text-text focus:outline-hidden focus:border-brand-gold"
                  />
                </div>

                {/* Initial Stock & Price Override */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-text mb-1">
                      Initial Stock Quantity <span className="text-brand-crimson">*</span>
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={stockInput}
                      onChange={(e) => setStockInput(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full px-3 py-2 rounded-lg bg-bg border border-border font-mono font-bold text-sm text-text focus:outline-hidden focus:border-brand-gold"
                      required
                    />
                    <div className="flex gap-1.5 mt-1.5">
                      {[5, 10, 25, 50].map((qty) => (
                        <button
                          key={qty}
                          type="button"
                          onClick={() => setStockInput(qty)}
                          className="px-2 py-0.5 rounded text-[10px] bg-bg border border-border text-text-muted hover:text-text font-mono"
                        >
                          +{qty}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-text mb-1">
                      Price Override (₹, Optional)
                    </label>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={priceOverrideInput}
                      onChange={(e) => setPriceOverrideInput(e.target.value)}
                      placeholder="e.g. 4999.00"
                      className="w-full px-3 py-2 rounded-lg bg-bg border border-border text-xs text-text focus:outline-hidden focus:border-brand-gold"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-3 border-t border-border">
                  <button
                    type="button"
                    onClick={() => setAddModalOpen(false)}
                    className="flex-1 py-2.5 rounded-lg border border-border text-xs font-medium text-text hover:bg-surface-alt"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={addLoading}
                    className="flex-1 py-2.5 rounded-lg bg-brand-crimson text-white text-xs font-semibold shadow hover:bg-brand-crimson/90 disabled:opacity-50 inline-flex items-center justify-center gap-1.5"
                  >
                    {addLoading ? (
                      'Saving Inventory...'
                    ) : (
                      <>
                        <Plus size={15} />
                        <span>Add Inventory Item</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Batch Stock Update Modal ────────────────────────────────────────── */}
      <AnimatePresence>
        {batchModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="max-w-md w-full bg-surface border border-border rounded-xl p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-2 text-brand-crimson">
                  <Warehouse size={20} />
                  <h3 className="font-serif text-lg font-bold text-text">Batch Stock Restock</h3>
                </div>
                <button onClick={() => setBatchModalOpen(false)} className="p-1 rounded text-text-muted hover:text-text">
                  <X size={18} />
                </button>
              </div>

              <p className="text-xs text-text-muted leading-relaxed">
                You have selected <strong className="text-text">{selectedVariantIds.length}</strong> variants.
                Every adjustment will be written to the permanent <code className="text-brand-gold">audit_log</code>.
              </p>

              <div>
                <label className="block text-xs font-semibold text-text mb-1">
                  New Quantity for Selected Variants:
                </label>
                <input
                  type="number"
                  min={0}
                  value={batchStockValue}
                  onChange={(e) => setBatchStockValue(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full px-3 py-2.5 rounded-lg bg-bg border border-border font-mono font-bold text-base text-text focus:outline-hidden focus:border-brand-gold"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setBatchModalOpen(false)}
                  className="flex-1 py-2 rounded-lg border border-border text-xs font-medium text-text hover:bg-surface-alt"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleApplyBatchUpdate}
                  disabled={batchUpdating}
                  className="flex-1 py-2 rounded-lg bg-brand-crimson text-white text-xs font-semibold shadow hover:bg-brand-crimson/90 disabled:opacity-50"
                >
                  {batchUpdating ? 'Applying...' : 'Apply Stock Update'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Audit Trail Slide-Over Drawer ───────────────────────────────────── */}
      <AnimatePresence>
        {auditDrawerOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setAuditDrawerOpen(false)}
              className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
              className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-surface border-l border-border shadow-2xl p-6 flex flex-col"
            >
              <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
                <div className="flex items-center gap-2 text-brand-gold">
                  <History size={20} />
                  <h3 className="font-serif text-lg font-bold text-text">Inventory Audit Trail</h3>
                </div>
                <button onClick={() => setAuditDrawerOpen(false)} className="p-1 rounded text-text-muted hover:text-text">
                  <X size={18} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-xs">
                {loadingAudit ? (
                  <div className="text-center py-12 text-text-muted">Loading audit entries...</div>
                ) : auditLogs.length === 0 ? (
                  <div className="text-center py-12 text-text-muted">No stock audit records found.</div>
                ) : (
                  auditLogs.map((log) => (
                    <div key={log.id} className="p-3 rounded-lg bg-bg border border-border space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-mono text-brand-gold font-semibold">{log.action}</span>
                        <span className="text-text-muted">
                          {new Date(log.created_at).toLocaleTimeString('en-IN', {
                            hour: '2-digit',
                            minute: '2-digit',
                            day: 'numeric',
                            month: 'short',
                          })}
                        </span>
                      </div>
                      <div className="font-mono text-text text-[11px]">
                        Variant: <strong>{log.changes?.variant_sku || log.entity_id}</strong>
                      </div>
                      <div className="text-text-muted text-[11px] flex items-center gap-1.5">
                        <span>Stock:</span>
                        <span className="line-through">{log.changes?.old_stock}</span>
                        <span className="text-brand-crimson">&rarr;</span>
                        <strong className="text-text">{log.changes?.new_stock || log.changes?.initial_stock}</strong>
                      </div>
                      <div className="text-[10px] text-text-muted pt-1 border-t border-border/50">
                        Adjusted by: {log.first_name || 'Vikram'} ({log.email || 'owner@shikkis.com'})
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
