import React from 'react';
import { Printer, X } from 'lucide-react';

import type { AdminPackingSlipData } from '@/lib/api';
import { useFocusTrap } from '@/lib/useFocusTrap';

interface PackingSlipModalProps {
  data: AdminPackingSlipData;
  onClose: () => void;
}

export const PackingSlipModal: React.FC<PackingSlipModalProps> = ({ data, onClose }) => {
  const modalRef = useFocusTrap<HTMLDivElement>({
    isOpen: !!data,
    onClose,
    autoFocusFirst: false,
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-label="Packing Slip Preview"
        tabIndex={-1}
        className="relative w-full max-w-2xl bg-[var(--surface)] text-[var(--text)] border border-[var(--border)] rounded-xl shadow-2xl p-6 md:p-8 my-8 focus:outline-none"
      >
        {/* Controls - Hidden during print */}
        <div className="flex items-center justify-between pb-4 border-b border-[var(--border)] mb-6 print:hidden">
          <div className="flex items-center space-x-2">
            <Printer className="w-5 h-5 text-[var(--brand-gold)]" />
            <h2 className="text-lg font-semibold font-serif">Packing Slip Preview</h2>
          </div>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handlePrint}
              className="min-h-[44px] px-4 py-2 text-xs font-semibold uppercase tracking-wider rounded-lg bg-[var(--brand-crimson)] text-white hover:opacity-90 transition flex items-center space-x-1.5 shadow"
            >
              <Printer className="w-4 h-4" />
              <span>Print Slip</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close packing slip"
              className="min-h-[44px] min-w-[44px] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text)] rounded-lg border border-[var(--border)]"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ── Printable Content ────────────────────────────────────────── */}
        <div className="printable-area space-y-6 text-sm">
          {/* Header */}
          <div className="flex justify-between items-start border-b border-[var(--border)] pb-4">
            <div>
              <h1 className="text-2xl font-serif font-bold text-[var(--brand-crimson)] tracking-wide">
                SHIKKIS
              </h1>
              <p className="text-xs uppercase tracking-widest text-[var(--text-muted)]">
                Curated Style • Boutique Warehouse
              </p>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                100 Feet Rd, Indiranagar, Bengaluru, KA 560038
              </p>
            </div>
            <div className="text-right">
              <span className="inline-block px-2.5 py-1 text-xs font-mono font-bold uppercase rounded border border-[var(--border)] bg-[var(--surface-alt)]">
                PACKING SLIP
              </span>
              <p className="font-mono text-base font-bold text-[var(--text)] mt-1.5">
                {data.order_number}
              </p>
              <p className="text-xs text-[var(--text-muted)]">
                Date: {new Date(data.created_at).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </p>
            </div>
          </div>

          {/* Fulfillment & Customer Block */}
          <div className="grid grid-cols-2 gap-4 p-4 rounded-lg bg-[var(--surface-alt)] border border-[var(--border)]">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] block mb-1">
                Recipient / Customer
              </span>
              <p className="font-semibold text-[var(--text)]">{data.customer.name}</p>
              <p className="text-xs text-[var(--text-muted)] font-mono">{data.customer.phone}</p>
              <p className="text-xs text-[var(--text-muted)]">{data.customer.email}</p>
            </div>

            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] block mb-1">
                Fulfillment Type
              </span>
              <p className="font-semibold uppercase text-xs tracking-wider">
                {data.fulfillment_type === 'pickup' ? '🏪 Boutique Pickup' : '🚚 Doorstep Delivery'}
              </p>
              {data.fulfillment_type === 'pickup' ? (
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  Slot: <span className="font-mono font-semibold">{data.pickup_slot || 'Standard Hours'}</span>
                </p>
              ) : data.delivery_address ? (
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  {data.delivery_address.line1}, {data.delivery_address.line2 ? `${data.delivery_address.line2}, ` : ''}
                  {data.delivery_address.city}, {data.delivery_address.state} - {data.delivery_address.pincode}
                </p>
              ) : (
                <p className="text-xs text-[var(--text-muted)] italic">Standard Delivery Address</p>
              )}
            </div>
          </div>

          {/* Notes */}
          {(data.customer_notes || data.internal_notes) && (
            <div className="p-3 rounded-lg border border-[var(--border)] bg-amber-500/10 space-y-1">
              {data.customer_notes && (
                <p className="text-xs">
                  <strong className="text-[var(--text)]">Customer Instructions:</strong>{' '}
                  <span className="text-[var(--text-muted)]">{data.customer_notes}</span>
                </p>
              )}
              {data.internal_notes && (
                <p className="text-xs">
                  <strong className="text-[var(--text)]">Internal Fulfillment Note:</strong>{' '}
                  <span className="text-[var(--text-muted)]">{data.internal_notes}</span>
                </p>
              )}
            </div>
          )}

          {/* Items Checklist Table */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                Items to Pack ({data.total_items} {data.total_items === 1 ? 'unit' : 'units'})
              </span>
              <span className="text-[10px] text-[var(--text-muted)] italic">
                Check box upon physical inspection
              </span>
            </div>

            <table className="w-full text-left border-collapse border border-[var(--border)]">
              <thead>
                <tr className="bg-[var(--surface-alt)] border-b border-[var(--border)] text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  <th className="p-2.5 w-10 text-center">Verify</th>
                  <th className="p-2.5">SKU</th>
                  <th className="p-2.5">Item Description</th>
                  <th className="p-2.5">Size</th>
                  <th className="p-2.5">Color</th>
                  <th className="p-2.5 text-right w-16">Qty</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {data.items.map((item) => (
                  <tr key={item.id} className="hover:bg-[var(--surface-alt)]/50">
                    <td className="p-2.5 text-center">
                      <div className="w-4 h-4 border border-[var(--text-muted)] rounded mx-auto" />
                    </td>
                    <td className="p-2.5 font-mono text-xs font-semibold text-[var(--brand-crimson)]">
                      {item.sku}
                    </td>
                    <td className="p-2.5 font-medium text-xs">{item.product_name}</td>
                    <td className="p-2.5 text-xs text-[var(--text-muted)] font-mono">{item.size}</td>
                    <td className="p-2.5 text-xs text-[var(--text-muted)]">{item.color}</td>
                    <td className="p-2.5 text-right font-mono font-bold text-xs">{item.quantity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Quality Sign-off */}
          <div className="pt-6 border-t border-[var(--border)] grid grid-cols-2 gap-6 text-xs text-[var(--text-muted)]">
            <div>
              <p className="mb-8">Packed By (Staff Name & Sign):</p>
              <div className="border-b border-dashed border-[var(--border)] w-48" />
            </div>
            <div className="text-right">
              <p className="mb-8">Quality Inspector Check:</p>
              <div className="border-b border-dashed border-[var(--border)] w-48 ml-auto" />
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .printable-area, .printable-area * {
            visibility: visible;
          }
          .printable-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 20px;
          }
        }
      `}</style>
    </div>
  );
};
