import PDFDocument from 'pdfkit';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOGO_PATH = path.join(__dirname, '..', '..', 'assets', 'logo-invoice.png');

const MAROON = '#48181E';
const INK = '#2B2320';
const INK_LIGHT = '#7A6E67';
const RULE = '#E4DDD4';

const STORE = {
  name: "Milady's",
  addressLines: ["Flat No. 402, JM's CNR Tower, Srinagar, Kakinada, A.P. 533003"],
  phone: '+91 78422 25444',
  email: 'themiladysofficial@gmail.com',
};

function formatINR(amount) {
  return '\u20B9' + Number(amount || 0).toLocaleString('en-IN');
}

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

const STATUS_LABEL = {
  created: 'Payment Pending',
  paid: 'Paid',
  paid_oversold: 'Paid',
  cancelled: 'Cancelled',
  failed: 'Payment Failed',
};

// Renders a full invoice PDF for one order directly onto the given
// writable stream (the Express response) and ends it — the caller just
// pipes/awaits this, no buffer juggling needed for a document this size.
export function renderInvoice(res, { order, items, customer }) {
  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  doc.pipe(res);

  // ---------- Header: logo + store details, invoice number + dates ----------
  try {
    doc.image(LOGO_PATH, 50, 45, { width: 34 });
  } catch {
    /* logo missing shouldn't block the invoice itself */
  }
  doc.fillColor(MAROON).font('Helvetica-Bold').fontSize(16).text(STORE.name, 92, 50);
  doc.fillColor(INK_LIGHT).font('Helvetica').fontSize(8.5);
  let y = 70;
  for (const line of STORE.addressLines) { doc.text(line, 92, y, { width: 260 }); y += 11; }
  doc.text(`${STORE.phone}  \u00B7  ${STORE.email}`, 92, y);

  doc.fillColor(INK).font('Helvetica-Bold').fontSize(20).text('INVOICE', 0, 48, { align: 'right' });
  doc.font('Helvetica').fontSize(9);
  const metaRight = [
    [`Invoice #`, `MLD${order.id}`],
    [`Order Date`, formatDate(order.created_at)],
    [`Payment Date`, formatDate(order.paid_at)],
    [`Status`, STATUS_LABEL[order.status] || order.status],
  ];
  let metaY = 78;
  for (const [label, value] of metaRight) {
    doc.fillColor(INK_LIGHT).text(label, 300, metaY, { width: 115, align: 'right' });
    doc.fillColor(INK).font('Helvetica-Bold').text(value, 425, metaY, { width: 120, align: 'right' });
    doc.font('Helvetica');
    metaY += 14;
  }

  doc.moveTo(50, 140).lineTo(545, 140).strokeColor(RULE).lineWidth(1).stroke();

  // ---------- Bill to ----------
  doc.fillColor(MAROON).font('Helvetica-Bold').fontSize(9.5).text('BILL TO', 50, 155);
  doc.fillColor(INK).font('Helvetica-Bold').fontSize(11).text(order.address_name || customer?.name || '—', 50, 170);
  doc.font('Helvetica').fontSize(9.5).fillColor(INK_LIGHT);
  let billY = 186;
  doc.text(order.address_line1 || '', 50, billY, { width: 260 }); billY += 13;
  const cityLine = [order.address_city, order.address_state, order.address_pincode].filter(Boolean).join(', ');
  if (cityLine) { doc.text(cityLine, 50, billY, { width: 260 }); billY += 13; }
  if (order.address_mobile) { doc.text(`Mobile: ${order.address_mobile}`, 50, billY, { width: 260 }); billY += 13; }
  if (customer?.email) { doc.text(customer.email, 50, billY, { width: 260 }); billY += 13; }

  if (order.razorpay_payment_id) {
    doc.font('Helvetica').fontSize(9).fillColor(INK_LIGHT).text('Payment ID', 300, 155, { width: 245, align: 'right' });
    doc.fillColor(INK).text(order.razorpay_payment_id, 300, 168, { width: 245, align: 'right' });
  }

  // ---------- Line items table ----------
  const tableTop = Math.max(billY, 230) + 20;
  const col = { item: 50, qty: 340, price: 400, total: 470 };
  doc.rect(50, tableTop, 495, 22).fill(MAROON);
  doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(9);
  doc.text('ITEM', col.item + 8, tableTop + 7);
  doc.text('QTY', col.qty, tableTop + 7, { width: 40, align: 'right' });
  doc.text('PRICE', col.price, tableTop + 7, { width: 60, align: 'right' });
  doc.text('TOTAL', col.total, tableTop + 7, { width: 65, align: 'right' });

  let rowY = tableTop + 22;
  doc.font('Helvetica').fontSize(9.5);
  items.forEach((item, i) => {
    const rowHeight = 24;
    if (i % 2 === 1) doc.rect(50, rowY, 495, rowHeight).fill('#FAF6F1');
    doc.fillColor(INK).text(item.product_name, col.item + 8, rowY + 7, { width: 275 });
    doc.text(String(item.qty), col.qty, rowY + 7, { width: 40, align: 'right' });
    doc.text(formatINR(item.price), col.price, rowY + 7, { width: 60, align: 'right' });
    doc.text(formatINR(item.price * item.qty), col.total, rowY + 7, { width: 65, align: 'right' });
    rowY += rowHeight;
  });
  doc.moveTo(50, rowY).lineTo(545, rowY).strokeColor(RULE).lineWidth(1).stroke();
  rowY += 14;

  // ---------- Totals ----------
  const payable = (order.subtotal || 0) - (order.discount || 0);
  const totalsRows = [['Subtotal', formatINR(order.subtotal)]];
  if (order.discount) {
    totalsRows.push([`Discount${order.coupon_code ? ` (${order.coupon_code})` : ''}`, `-${formatINR(order.discount)}`]);
  }
  if (order.status === 'cancelled' && order.refund_amount) {
    totalsRows.push([`Refunded (${order.refund_percent}%)`, `-${formatINR(order.refund_amount)}`]);
  }
  doc.font('Helvetica').fontSize(9.5);
  for (const [label, value] of totalsRows) {
    doc.fillColor(INK_LIGHT).text(label, 300, rowY, { width: 155, align: 'right' });
    doc.fillColor(INK).text(value, 460, rowY, { width: 85, align: 'right' });
    rowY += 15;
  }
  rowY += 4;
  doc.rect(340, rowY, 205, 26).fill('#FAF6F1');
  doc.font('Helvetica-Bold').fontSize(11).fillColor(MAROON);
  doc.text('Total Paid', 350, rowY + 7, { width: 110 });
  doc.text(formatINR(payable), 340, rowY + 7, { width: 185, align: 'right' });

  // ---------- Footer ----------
  doc.font('Helvetica').fontSize(8.5).fillColor(INK_LIGHT)
    .text(
      `Thank you for shopping with ${STORE.name}. For any questions about this order, reach us at ${STORE.email} or ${STORE.phone}.`,
      50, 760, { width: 495, align: 'center' }
    );

  doc.end();
}
