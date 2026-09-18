import PDFDocument from 'pdfkit';

export interface InvoiceOrderData {
  order_number: string;
  created_at: string;
  fulfillment_type: string;
  pickup_slot?: string | null;
  payment_method: string;
  payment_status: string;
  subtotal: number; // in paise
  discount_amount: number; // in paise
  shipping_cost: number; // in paise
  tax: number; // in paise
  total_amount: number; // in paise
  delivery_address_snapshot?: string | null;
  customer_notes?: string | null;
  customer: {
    fullName: string;
    email: string;
    phone: string;
  };
  items: Array<{
    product_name: string;
    size: string;
    color: string;
    quantity: number;
    price_at_purchase: number; // in paise
    discount_at_purchase: number; // in paise
  }>;
}

const formatPaise = (paise: number) => {
  const rupees = paise / 100;
  return `INR ${rupees.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export async function generateInvoicePDF(order: InvoiceOrderData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 40, size: 'A4' });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (err) => reject(err));

      const crimson = '#9B1B30';
      const gold = '#D4AF37';
      const darkText = '#2C1810';
      const mutedText = '#7A6A5F';
      const borderColor = '#E8D4A0';

      // ── Header ─────────────────────────────────────────────────────────────
      doc.rect(40, 40, 515, 6).fill(crimson);

      doc.moveDown(1.5);
      doc.fillColor(crimson).fontSize(26).font('Helvetica-Bold').text('SHIKKIS', 40, 55);
      doc.fillColor(gold).fontSize(9).font('Helvetica').text('CURATED STYLE', 42, 85);

      // Store Details (Right Aligned)
      doc
        .fillColor(darkText)
        .fontSize(8)
        .font('Helvetica')
        .text('Shikkis Flagship Store', 350, 55, { align: 'right' })
        .text('100 Feet Road, Indiranagar', 350, 68, { align: 'right' })
        .text('Bengaluru, Karnataka - 560038', 350, 81, { align: 'right' })
        .text('GSTIN: 29AAAAA0000A1Z5 | contact@shikkis.com', 350, 94, { align: 'right' });

      doc.strokeColor(borderColor).lineWidth(1).moveTo(40, 115).lineTo(555, 115).stroke();

      // ── Invoice Title & Metadata ───────────────────────────────────────────
      doc.fillColor(darkText).fontSize(14).font('Helvetica-Bold').text('TAX INVOICE / RETAIL RECEIPT', 40, 128);

      const orderDate = new Date(order.created_at).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });

      doc.fontSize(8.5).font('Helvetica');
      doc.fillColor(mutedText).text('Invoice No:', 40, 150);
      doc.fillColor(darkText).font('Helvetica-Bold').text(`INV-${order.order_number}`, 100, 150);

      doc.fillColor(mutedText).font('Helvetica').text('Order Date:', 40, 165);
      doc.fillColor(darkText).font('Helvetica-Bold').text(orderDate, 100, 165);

      doc.fillColor(mutedText).font('Helvetica').text('Payment Mode:', 340, 150);
      doc.fillColor(darkText).font('Helvetica-Bold').text(order.payment_method.toUpperCase(), 430, 150);

      doc.fillColor(mutedText).font('Helvetica').text('Payment Status:', 340, 165);
      doc.fillColor(order.payment_status === 'paid' ? '#2D6A4F' : crimson)
        .font('Helvetica-Bold')
        .text(order.payment_status.toUpperCase(), 430, 165);

      // ── Customer & Shipping Address ─────────────────────────────────────────
      doc.strokeColor(borderColor).lineWidth(0.5).moveTo(40, 185).lineTo(555, 185).stroke();

      let addressObj: any = null;
      if (order.delivery_address_snapshot) {
        try {
          addressObj = typeof order.delivery_address_snapshot === 'string'
            ? JSON.parse(order.delivery_address_snapshot)
            : order.delivery_address_snapshot;
        } catch {
          // ignore
        }
      }

      doc.fillColor(crimson).fontSize(9).font('Helvetica-Bold').text('BILLED & SHIPPED TO:', 40, 195);
      doc.fillColor(darkText).fontSize(9).font('Helvetica-Bold').text(order.customer.fullName, 40, 210);
      doc.fillColor(darkText).fontSize(8.5).font('Helvetica');

      let currentY = 224;
      if (addressObj) {
        doc.text(`${addressObj.line1 || ''}${addressObj.line2 ? ', ' + addressObj.line2 : ''}`, 40, currentY);
        currentY += 13;
        doc.text(`${addressObj.city || ''}, ${addressObj.state || ''} - ${addressObj.pincode || ''}`, 40, currentY);
        currentY += 13;
      } else if (order.fulfillment_type === 'pickup') {
        doc.text(`In-Store Boutique Pickup — Slot: ${order.pickup_slot || 'Flagship Store'}`, 40, currentY);
        currentY += 13;
      }
      doc.text(`Mobile: +91 ${order.customer.phone} | Email: ${order.customer.email}`, 40, currentY);

      // ── Table Header ────────────────────────────────────────────────────────
      const tableTop = currentY + 25;
      doc.rect(40, tableTop, 515, 20).fill('#F5E6D3');

      doc.fillColor(darkText).fontSize(8).font('Helvetica-Bold');
      doc.text('#', 45, tableTop + 6, { width: 20 });
      doc.text('ITEM DESCRIPTION', 70, tableTop + 6, { width: 230 });
      doc.text('SIZE/COLOUR', 300, tableTop + 6, { width: 90 });
      doc.text('QTY', 395, tableTop + 6, { width: 30, align: 'center' });
      doc.text('PRICE', 430, tableTop + 6, { width: 55, align: 'right' });
      doc.text('TOTAL', 490, tableTop + 6, { width: 60, align: 'right' });

      // ── Table Rows ──────────────────────────────────────────────────────────
      let rowY = tableTop + 24;
      order.items.forEach((item, index) => {
        const itemTotal = (item.price_at_purchase - item.discount_at_purchase) * item.quantity;

        doc.fillColor(darkText).fontSize(8).font('Helvetica');
        doc.text(`${index + 1}`, 45, rowY, { width: 20 });
        doc.font('Helvetica-Bold').text(item.product_name, 70, rowY, { width: 225 });
        doc.font('Helvetica').text(`${item.size} / ${item.color}`, 300, rowY, { width: 90 });
        doc.text(`${item.quantity}`, 395, rowY, { width: 30, align: 'center' });
        doc.text(formatPaise(item.price_at_purchase - item.discount_at_purchase), 430, rowY, { width: 55, align: 'right' });
        doc.font('Helvetica-Bold').text(formatPaise(itemTotal), 490, rowY, { width: 60, align: 'right' });

        rowY += 20;
        doc.strokeColor('#F0E6D8').lineWidth(0.5).moveTo(40, rowY - 4).lineTo(555, rowY - 4).stroke();
      });

      // ── Totals Calculation ──────────────────────────────────────────────────
      rowY += 10;
      doc.strokeColor(borderColor).lineWidth(1).moveTo(330, rowY).lineTo(555, rowY).stroke();
      rowY += 8;

      const halfTax = Math.round(order.tax / 2);

      const addSummaryLine = (label: string, value: string, isBold: boolean = false, color: string = darkText) => {
        doc.fillColor(mutedText).fontSize(8).font(isBold ? 'Helvetica-Bold' : 'Helvetica').text(label, 330, rowY, { width: 110, align: 'left' });
        doc.fillColor(color).font(isBold ? 'Helvetica-Bold' : 'Helvetica').text(value, 440, rowY, { width: 110, align: 'right' });
        rowY += 15;
      };

      addSummaryLine('Subtotal (MRP):', formatPaise(order.subtotal));

      if (order.discount_amount > 0) {
        addSummaryLine('Discount Savings:', `-${formatPaise(order.discount_amount)}`, false, '#2D6A4F');
      }

      addSummaryLine('Delivery / Shipping:', order.shipping_cost === 0 ? 'FREE' : formatPaise(order.shipping_cost));
      addSummaryLine('CGST (2.5%):', formatPaise(halfTax));
      addSummaryLine('SGST (2.5%):', formatPaise(halfTax));

      doc.strokeColor(crimson).lineWidth(1.5).moveTo(330, rowY).lineTo(555, rowY).stroke();
      rowY += 6;
      addSummaryLine('TOTAL PAYABLE:', formatPaise(order.total_amount), true, crimson);
      doc.strokeColor(crimson).lineWidth(1.5).moveTo(330, rowY).lineTo(555, rowY).stroke();

      // ── Footer ──────────────────────────────────────────────────────────────
      const footerY = 740;
      doc.strokeColor(borderColor).lineWidth(0.5).moveTo(40, footerY).lineTo(555, footerY).stroke();
      doc.fillColor(mutedText).fontSize(7.5).font('Helvetica');
      doc.text(
        'Thank you for shopping at Shikkis. Authentic Indian & Fusion Handcrafted Wear.',
        40,
        footerY + 10,
        { align: 'center', width: 515 }
      );
      doc.text(
        'All purchases are subject to our 7-day return and exchange policy. For queries, contact us at care@shikkis.com.',
        40,
        footerY + 22,
        { align: 'center', width: 515 }
      );

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
