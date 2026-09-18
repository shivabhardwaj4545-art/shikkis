import { motion } from 'framer-motion';
import { Download, RefreshCw } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';

import {
  api,
  type AdminCategoryPerformanceItem,
  type AdminReportsKpis,
  type AdminRevenueTrendItem,
  type AdminSoldItem,
  type AdminTopProductItem,
} from '@/lib/api';
import { formatPrice } from '@/lib/format';

// ── 400ms Count-Up Number Component ──────────────────────────────────────────
const AnimatedNumber: React.FC<{
  value: number;
  formatter?: (val: number) => string;
}> = ({ value, formatter = (v) => v.toLocaleString('en-IN') }) => {
  const [displayValue, setDisplayValue] = useState(value);
  const prevValueRef = useRef(value);

  useEffect(() => {
    const startVal = prevValueRef.current;
    const endVal = value;
    const duration = 400; // 400ms per requirement
    const startTime = performance.now();

    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // easeOutQuad
      const eased = progress * (2 - progress);
      const current = Math.round(startVal + (endVal - startVal) * eased);
      setDisplayValue(current);

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        prevValueRef.current = endVal;
      }
    };

    requestAnimationFrame(step);
  }, [value]);

  return <span>{formatter(displayValue)}</span>;
};

export const AdminReportsPage: React.FC = () => {
  // Period filter: today, week, month, year, all
  const [period, setPeriod] = useState<string>('month');
  const [loading, setLoading] = useState(true);

  // Data states
  const [kpis, setKpis] = useState<AdminReportsKpis>({
    period: 'month',
    total_revenue: 0,
    total_orders: 0,
    aov: 0,
    units_sold: 0,
  });

  const [trend, setTrend] = useState<AdminRevenueTrendItem[]>([]);
  const [topProducts, setTopProducts] = useState<{
    top_by_units: AdminTopProductItem[];
    top_by_revenue: AdminTopProductItem[];
  }>({
    top_by_units: [],
    top_by_revenue: [],
  });
  const [categories, setCategories] = useState<AdminCategoryPerformanceItem[]>([]);

  // Sold items log states
  const [soldItems, setSoldItems] = useState<AdminSoldItem[]>([]);
  const [soldTotal, setSoldTotal] = useState(0);
  const [soldPage, setSoldPage] = useState(1);
  const [soldTotalPages, setSoldTotalPages] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [exportingSold, setExportingSold] = useState(false);

  // Theme observer state to trigger chart recolour
  const [themeVersion, setThemeVersion] = useState(0);
  const [hoveredPoint, setHoveredPoint] = useState<AdminRevenueTrendItem | null>(null);

  // Listen for theme attribute changes on <html>
  useEffect(() => {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'data-theme') {
          setThemeVersion((v) => v + 1);
        }
      });
    });

    observer.observe(document.documentElement, { attributes: true });
    return () => observer.disconnect();
  }, []);

  const loadReportData = async () => {
    try {
      setLoading(true);
      const [kpiRes, trendRes, topRes, catRes, soldRes] = await Promise.all([
        api.adminGetReportsKpis(period),
        api.adminGetRevenueTrend(),
        api.adminGetTopProducts(period),
        api.adminGetCategoryPerformance(period),
        api.adminGetSoldItems({
          period,
          category_id: selectedCategory,
          page: soldPage,
          limit: 10,
        }),
      ]);

      setKpis(kpiRes);
      setTrend(trendRes.trend);
      setTopProducts({
        top_by_units: topRes.top_by_units,
        top_by_revenue: topRes.top_by_revenue,
      });
      setCategories(catRes.categories);
      setSoldItems(soldRes.data);
      setSoldTotal(soldRes.pagination.total);
      setSoldTotalPages(soldRes.pagination.totalPages);
    } catch (err) {
      console.error('Failed to load reports data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReportData();
  }, [period, selectedCategory, soldPage]);

  const handleExportSoldCSV = async () => {
    try {
      setExportingSold(true);
      const token = localStorage.getItem('shikkis_access_token');
      const q = new URLSearchParams();
      if (period) q.append('period', period);
      if (selectedCategory && selectedCategory !== 'all') q.append('category_id', selectedCategory);
      const res = await fetch(`/api/admin/reports/sold-items/export?${q.toString()}`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `shikkis-sold-items-${period}-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      alert('Failed to export sold items: ' + err);
    } finally {
      setExportingSold(false);
    }
  };

  // ── SVG Line Chart Coordinates Calculation ─────────────────────────────────
  const chartWidth = 700;
  const chartHeight = 220;
  const paddingX = 45;
  const paddingY = 30;

  const maxRevenue = Math.max(...trend.map((t) => t.revenue), 100000); // minimum scale
  const points = trend.map((t, idx) => {
    const x = paddingX + (idx / Math.max(trend.length - 1, 1)) * (chartWidth - paddingX * 2);
    const y = chartHeight - paddingY - (t.revenue / maxRevenue) * (chartHeight - paddingY * 2);
    return { x, y, item: t };
  });

  const pathD = points.length > 0
    ? points.reduce((acc, p, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`, '')
    : '';

  const areaD = points.length > 0
    ? `${pathD} L ${points[points.length - 1].x} ${chartHeight - paddingY} L ${points[0].x} ${chartHeight - paddingY} Z`
    : '';

  return (
    <div className="space-y-6">
      {/* Top Header & Period Selector */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[var(--text)]">
            Reports & Analytics
          </h1>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Store performance metrics computed directly in SQL.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {/* Period Selector Tabs */}
          <div className="flex items-center p-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
            {[
              { key: 'today', label: 'Today' },
              { key: 'week', label: 'Week' },
              { key: 'month', label: 'Month' },
              { key: 'year', label: 'Year' },
              { key: 'all', label: 'All Time' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => {
                  setPeriod(tab.key);
                  setSoldPage(1);
                }}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                  period === tab.key
                    ? 'bg-[var(--brand-crimson)] text-white shadow-sm'
                    : 'text-[var(--text-muted)] hover:text-[var(--text)]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <button
            onClick={loadReportData}
            className="p-2 border border-[var(--border)] rounded-lg text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-alt)] transition"
            title="Refresh Reports"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[var(--brand-gold)]' : ''}`} />
          </button>
        </div>
      </div>

      {/* ── Revenue KPIs (with 400ms Count-Up Numbers) ───────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-sm space-y-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            Total Revenue
          </span>
          <div className="text-2xl sm:text-3xl font-serif font-bold text-[var(--brand-crimson)] font-mono">
            <AnimatedNumber
              value={kpis.total_revenue}
              formatter={(val) => formatPrice(val)}
            />
          </div>
          <span className="text-[10px] text-[var(--text-muted)]">Verified paid transactions</span>
        </div>

        <div className="p-5 rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-sm space-y-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            Total Orders
          </span>
          <div className="text-2xl sm:text-3xl font-serif font-bold text-[var(--text)] font-mono">
            <AnimatedNumber value={kpis.total_orders} />
          </div>
          <span className="text-[10px] text-[var(--text-muted)]">Completed & confirmed</span>
        </div>

        <div className="p-5 rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-sm space-y-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            Average Order Value
          </span>
          <div className="text-2xl sm:text-3xl font-serif font-bold text-[var(--brand-gold)] font-mono">
            <AnimatedNumber
              value={kpis.aov}
              formatter={(val) => formatPrice(val)}
            />
          </div>
          <span className="text-[10px] text-[var(--text-muted)]">Net revenue / order</span>
        </div>

        <div className="p-5 rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-sm space-y-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            Units Sold
          </span>
          <div className="text-2xl sm:text-3xl font-serif font-bold text-[var(--text)] font-mono">
            <AnimatedNumber value={kpis.units_sold} />
          </div>
          <span className="text-[10px] text-[var(--text-muted)]">Garments & accessories</span>
        </div>
      </div>

      {/* ── 7-Day Revenue Line Chart (Theme-Aware with Path Animation) ────── */}
      <div className="p-6 rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div>
            <h2 className="text-lg font-serif font-bold text-[var(--text)]">
              7-Day Revenue Velocity
            </h2>
            <p className="text-xs text-[var(--text-muted)]">
              Daily revenue in INR (hover nodes for breakdown).
            </p>
          </div>
          <div className="flex items-center space-x-2 text-xs font-mono font-semibold text-[var(--brand-gold)]">
            <span className="w-2.5 h-2.5 rounded-full bg-[var(--brand-gold)]" />
            <span>7-Day Range</span>
          </div>
        </div>

        {/* SVG Chart Container */}
        <div className="relative w-full overflow-x-auto py-2">
          <svg
            key={`chart-${themeVersion}-${period}`}
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            className="w-full h-56 min-w-[550px] overflow-visible"
          >
            <defs>
              {/* Theme-aware gradient using CSS custom property */}
              <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--brand-gold)" stopOpacity="0.25" />
                <stop offset="100%" stopColor="var(--brand-gold)" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
              const y = paddingY + ratio * (chartHeight - paddingY * 2);
              return (
                <line
                  key={idx}
                  x1={paddingX}
                  y1={y}
                  x2={chartWidth - paddingX}
                  y2={y}
                  stroke="var(--border)"
                  strokeDasharray="4 4"
                  strokeWidth="1"
                  strokeOpacity="0.5"
                />
              );
            })}

            {/* Fill Area with Gradient */}
            {areaD && (
              <motion.path
                d={areaD}
                fill="url(#revenueGradient)"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6 }}
              />
            )}

            {/* Animated SVG Path Line with pathLength transition */}
            {pathD && (
              <motion.path
                d={pathD}
                fill="none"
                stroke="var(--brand-gold)"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
              />
            )}

            {/* Interactive Data Points */}
            {points.map((pt, idx) => (
              <g key={idx} className="cursor-pointer">
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r="5"
                  fill="var(--surface)"
                  stroke="var(--brand-crimson)"
                  strokeWidth="2.5"
                  className="hover:scale-125 transition-transform"
                  onMouseEnter={() => setHoveredPoint(pt.item)}
                  onMouseLeave={() => setHoveredPoint(null)}
                />
                {/* Date Label on X Axis */}
                <text
                  x={pt.x}
                  y={chartHeight - 6}
                  textAnchor="middle"
                  fill="var(--text-muted)"
                  fontSize="10"
                  fontFamily="monospace"
                >
                  {pt.item.label.split(' ')[0]}
                </text>
              </g>
            ))}
          </svg>

          {/* Interactive Tooltip */}
          {hoveredPoint && (
            <div className="absolute top-2 right-4 p-3 rounded-lg border border-[var(--border)] bg-[var(--surface-alt)] shadow-lg text-xs space-y-1">
              <p className="font-semibold text-[var(--text)]">{hoveredPoint.label}</p>
              <p className="text-[var(--brand-crimson)] font-mono font-bold">
                {formatPrice(hoveredPoint.revenue)}
              </p>
              <p className="text-[10px] text-[var(--text-muted)]">
                {hoveredPoint.orders} {hoveredPoint.orders === 1 ? 'order' : 'orders'} placed
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── 2 Columns: Top Products & Category Breakdown ──────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products */}
        <div className="p-6 rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-sm space-y-4">
          <h3 className="text-base font-serif font-bold text-[var(--text)] border-b border-[var(--border)] pb-3">
            Top Performing Products
          </h3>

          <div className="space-y-4">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] block mb-2">
                By Revenue
              </span>
              <div className="space-y-2">
                {topProducts.top_by_revenue.map((p, idx) => (
                  <div
                    key={idx}
                    className="flex justify-between items-center p-2.5 rounded-lg bg-[var(--surface-alt)] text-xs"
                  >
                    <div className="flex items-center space-x-2">
                      <span className="w-5 h-5 rounded-full bg-[var(--brand-crimson)] text-white font-mono text-[10px] flex items-center justify-center font-bold">
                        {idx + 1}
                      </span>
                      <span className="font-semibold text-[var(--text)] truncate max-w-[200px] sm:max-w-xs">
                        {p.product_name}
                      </span>
                    </div>
                    <span className="font-mono font-bold text-[var(--brand-crimson)]">
                      {formatPrice(p.revenue)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-2 border-t border-[var(--border)]">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] block mb-2">
                By Units Sold
              </span>
              <div className="space-y-2">
                {topProducts.top_by_units.map((p, idx) => (
                  <div
                    key={idx}
                    className="flex justify-between items-center p-2 rounded-lg bg-[var(--surface-alt)]/60 text-xs"
                  >
                    <span className="text-[var(--text)] truncate max-w-[200px] sm:max-w-xs">
                      {p.product_name}
                    </span>
                    <span className="font-mono font-bold text-[var(--text)]">
                      {p.units_sold} units
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="p-6 rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-sm space-y-4">
          <h3 className="text-base font-serif font-bold text-[var(--text)] border-b border-[var(--border)] pb-3">
            Category Performance
          </h3>

          <div className="space-y-3">
            {categories.map((c) => {
              const maxCatRev = Math.max(...categories.map((cat) => cat.revenue), 1);
              const percent = Math.round((c.revenue / maxCatRev) * 100);
              return (
                <div key={c.id} className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-[var(--text)]">{c.name}</span>
                    <span className="font-mono text-[var(--brand-gold)]">
                      {formatPrice(c.revenue)} ({c.units_sold} units)
                    </span>
                  </div>
                  <div className="h-2 w-full bg-[var(--surface-alt)] rounded-full overflow-hidden border border-[var(--border)]">
                    <motion.div
                      className="h-full bg-[var(--brand-crimson)]"
                      initial={{ width: 0 }}
                      animate={{ width: `${percent}%` }}
                      transition={{ duration: 0.6, ease: 'easeOut' }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Sold-Items Itemised Log Table with CSV Export ──────────────────── */}
      <div className="p-6 rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h3 className="text-base font-serif font-bold text-[var(--text)]">
              Itemised Sold Items Log
            </h3>
            <p className="text-xs text-[var(--text-muted)]">
              Detailed breakdown of items sold in the current period.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setSoldPage(1);
              }}
              className="px-3 py-1.5 text-xs rounded-lg border border-[var(--border)] bg-[var(--surface-alt)] text-[var(--text)]"
            >
              <option value="all">All Categories</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>

            <button
              onClick={handleExportSoldCSV}
              disabled={exportingSold}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-[var(--border)] bg-[var(--surface-alt)] text-[var(--text)] hover:bg-[var(--surface)] transition flex items-center space-x-1"
            >
              <Download className="w-3.5 h-3.5 text-[var(--brand-gold)]" />
              <span>{exportingSold ? 'Exporting...' : 'CSV'}</span>
            </button>
          </div>
        </div>

        {/* Sold Items Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--surface-alt)] text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                <th className="py-2.5 px-3">Order</th>
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Customer</th>
                <th className="py-2.5 px-3">Product</th>
                <th className="py-2.5 px-3">Variant</th>
                <th className="py-2.5 px-3 text-right">Qty</th>
                <th className="py-2.5 px-3 text-right">Net Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {soldItems.map((itm) => (
                <tr key={itm.id} className="hover:bg-[var(--surface-alt)]/40">
                  <td className="py-2.5 px-3 font-mono font-semibold text-[var(--brand-crimson)]">
                    {itm.order_number}
                  </td>
                  <td className="py-2.5 px-3 text-[var(--text-muted)] font-mono">
                    {new Date(itm.order_date).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </td>
                  <td className="py-2.5 px-3">{itm.customer_name}</td>
                  <td className="py-2.5 px-3 font-medium text-[var(--text)]">{itm.product_name}</td>
                  <td className="py-2.5 px-3 text-[var(--text-muted)]">
                    {itm.size} / {itm.color}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold">{itm.quantity}</td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold text-[var(--text)]">
                    {formatPrice(itm.net_total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Sold Pagination */}
        {soldTotalPages > 1 && (
          <div className="flex justify-between items-center pt-2">
            <button
              disabled={soldPage <= 1}
              onClick={() => setSoldPage(soldPage - 1)}
              className="px-3 py-1 text-xs rounded border border-[var(--border)] disabled:opacity-40"
            >
              Previous
            </button>
            <span className="text-xs text-[var(--text-muted)]">
              Page {soldPage} of {soldTotalPages} ({soldTotal} items)
            </span>
            <button
              disabled={soldPage >= soldTotalPages}
              onClick={() => setSoldPage(soldPage + 1)}
              className="px-3 py-1 text-xs rounded border border-[var(--border)] disabled:opacity-40"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
