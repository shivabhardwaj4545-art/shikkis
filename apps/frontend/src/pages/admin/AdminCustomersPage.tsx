import {
  ArrowUpDown,
  Download,
  Mail,
  Phone,
  RefreshCw,
  Search,
  Users,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { api, type AdminCustomerListItem } from '@/lib/api';
import { formatPrice } from '@/lib/format';

export const AdminCustomersPage: React.FC = () => {
  const navigate = useNavigate();

  const [customers, setCustomers] = useState<AdminCustomerListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Filters & Sorting
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('lifetime_spend');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [exporting, setExporting] = useState(false);

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const res = await api.adminGetCustomers({
        page,
        limit: 15,
        search: search.trim() || undefined,
        sortBy,
        sortOrder,
      });
      setCustomers(res.data);
      setTotal(res.pagination.total);
      setTotalPages(res.pagination.totalPages);
    } catch (err) {
      console.error('Failed to load customers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, [page, sortBy, sortOrder]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadCustomers();
  };

  const toggleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
    setPage(1);
  };

  const handleExportCSV = async () => {
    try {
      setExporting(true);
      const token = localStorage.getItem('shikkis_access_token');
      const q = search ? `?search=${encodeURIComponent(search)}` : '';
      const res = await fetch(`/api/admin/customers/export${q}`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `shikkis-customers-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      alert('Failed to export customers: ' + err);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[var(--text)]">
            Customers Directory (CRM)
          </h1>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Analyze customer lifetime value, purchase history, and engagement metrics.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleExportCSV}
            disabled={exporting}
            className="px-4 py-2 text-xs font-semibold rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] hover:bg-[var(--surface-alt)] transition flex items-center space-x-1.5 shadow-sm"
          >
            <Download className="w-4 h-4 text-[var(--brand-gold)]" />
            <span>{exporting ? 'Exporting...' : 'Export CSV'}</span>
          </button>
          <button
            onClick={loadCustomers}
            className="p-2 border border-[var(--border)] rounded-lg text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-alt)] transition"
            title="Refresh Directory"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[var(--brand-gold)]' : ''}`} />
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
        <form onSubmit={handleSearchSubmit} className="flex gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Search customers by name, email, or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-[var(--border)] bg-[var(--surface-alt)] text-[var(--text)] focus:outline-none focus:border-[var(--brand-crimson)]"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-[var(--brand-crimson)] text-white hover:opacity-90 transition"
          >
            Search
          </button>
        </form>
      </div>

      <div className="flex justify-between items-center text-xs text-[var(--text-muted)] px-1">
        <span>Showing <strong>{customers.length}</strong> of <strong>{total}</strong> customers</span>
      </div>

      {/* Directory Table */}
      {loading ? (
        <div className="py-20 text-center text-xs text-[var(--text-muted)]">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[var(--brand-gold)] mb-3" />
          Loading customer directory...
        </div>
      ) : customers.length === 0 ? (
        <div className="p-12 text-center rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)]">
          <Users className="w-10 h-10 mx-auto mb-3 opacity-40 text-[var(--brand-gold)]" />
          <p className="text-sm font-semibold text-[var(--text)]">No customers match your search</p>
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--surface-alt)] text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  <th
                    className="py-3 px-4 cursor-pointer hover:text-[var(--text)]"
                    onClick={() => toggleSort('name')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Customer</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="py-3 px-4">Contact</th>
                  <th
                    className="py-3 px-4 text-center cursor-pointer hover:text-[var(--text)]"
                    onClick={() => toggleSort('order_count')}
                  >
                    <div className="flex items-center justify-center space-x-1">
                      <span>Orders</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th
                    className="py-3 px-4 text-right cursor-pointer hover:text-[var(--text)]"
                    onClick={() => toggleSort('lifetime_spend')}
                  >
                    <div className="flex items-center justify-end space-x-1">
                      <span>Lifetime Spend</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th
                    className="py-3 px-4 cursor-pointer hover:text-[var(--text)]"
                    onClick={() => toggleSort('last_order_date')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Last Order</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th
                    className="py-3 px-4 cursor-pointer hover:text-[var(--text)]"
                    onClick={() => toggleSort('join_date')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Joined</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)] text-xs">
                {customers.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => navigate(`/admin/customers/${c.id}`)}
                    className="hover:bg-[var(--surface-alt)]/60 cursor-pointer transition"
                  >
                    <td className="py-3 px-4">
                      <div className="font-semibold text-[var(--text)]">{c.name}</div>
                      <div className="text-[10px] text-[var(--text-muted)] font-mono">{c.id}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-1.5 text-[var(--text-muted)]">
                        <Mail className="w-3 h-3" />
                        <span>{c.email}</span>
                      </div>
                      {c.phone && (
                        <div className="flex items-center space-x-1.5 text-[var(--text-muted)] font-mono text-[11px] mt-0.5">
                          <Phone className="w-3 h-3" />
                          <span>{c.phone}</span>
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center font-mono font-bold">
                      <span className="inline-block px-2 py-0.5 rounded bg-[var(--surface-alt)] border border-[var(--border)]">
                        {c.order_count}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-[var(--brand-crimson)]">
                      {formatPrice(c.lifetime_spend)}
                    </td>
                    <td className="py-3 px-4 text-[var(--text-muted)] font-mono">
                      {c.last_order_date
                        ? new Date(c.last_order_date).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })
                        : 'Never'}
                    </td>
                    <td className="py-3 px-4 text-[var(--text-muted)]">
                      {new Date(c.join_date).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-between items-center pt-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-[var(--border)] disabled:opacity-40 hover:bg-[var(--surface-alt)]"
              >
                Previous
              </button>
              <span className="text-xs text-[var(--text-muted)]">
                Page {page} of {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-[var(--border)] disabled:opacity-40 hover:bg-[var(--surface-alt)]"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};
