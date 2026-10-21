import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../data/api';
import { formatINR } from '../../data/store';
import { waHref } from '../../data/storeInfo';

const statusLabels = {
  paid: 'Paid',
  paid_oversold: 'Needs attention',
  created: 'Payment pending',
  expired: 'Expired (unpaid)',
  failed: 'Failed',
  cancelled: 'Cancelled',
};
const shippingLabels = { pending: 'To ship', shipped: 'Shipped', delivered: 'Delivered' };

const isPaid = (o) => o.status === 'paid' || o.status === 'paid_oversold';
const shipping = (o) => o.shipping_status || 'pending';
const orderTotal = (o) => o.subtotal - (o.discount || 0) + (o.shipping_fee || 0);

// Tabs across the top. "To ship" is the day-to-day work list.
const TABS = [
  { key: 'all', label: 'All', test: () => true },
  { key: 'to_ship', label: 'To ship', test: (o) => isPaid(o) && shipping(o) === 'pending' },
  { key: 'shipped', label: 'Shipped', test: (o) => isPaid(o) && shipping(o) === 'shipped' },
  { key: 'delivered', label: 'Delivered', test: (o) => isPaid(o) && shipping(o) === 'delivered' },
  { key: 'attention', label: 'Needs attention', test: (o) => o.status === 'paid_oversold' },
  { key: 'created', label: 'Payment pending', test: (o) => o.status === 'created' },
  { key: 'cancelled', label: 'Cancelled', test: (o) => o.status === 'cancelled' },
  { key: 'failed', label: 'Failed / expired', test: (o) => o.status === 'failed' || o.status === 'expired' },
];

const DATES = [
  { key: 'all', label: 'Any date' },
  { key: 'today', label: 'Today' },
  { key: '7', label: 'Last 7 days' },
  { key: '30', label: 'Last 30 days' },
  { key: '90', label: 'Last 3 months' },
];

const PAGE = 30;
const digitsOf = (v) => String(v || '').replace(/\D/g, '');

// Order number, customer name/email/phone, product name, tracking number.
function matches(o, q) {
  if (!q) return true;
  const text = q.toLowerCase();
  const num = text.replace(/^#?mld/, '').replace(/^#/, '');
  if (/^\d+$/.test(num) && String(o.id) === num) return true;
  const qDigits = digitsOf(q);
  if (qDigits.length >= 4 && [o.address_mobile, o.customer_mobile].some((m) => digitsOf(m).includes(qDigits.slice(-10)))) return true;
  const hay = [
    o.customer_name, o.customer_email, o.address_name, o.address_city, o.address_pincode,
    o.tracking_number, o.courier, o.coupon_code, o.razorpay_payment_id,
    ...(o.items || []).map((i) => i.product_name),
  ];
  return hay.some((v) => String(v || '').toLowerCase().includes(text));
}

function inDateRange(o, range) {
  if (range === 'all') return true;
  const created = new Date(o.created_at);
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  if (range !== 'today') start.setDate(start.getDate() - Number(range) + 1);
  return created >= start;
}

function waNumber(o) {
  const d = digitsOf(o.address_mobile || o.customer_mobile);
  return d.length === 10 ? `91${d}` : d;
}

function waMessage(o) {
  const name = (o.address_name || o.customer_name || '').split(' ')[0];
  const no = `#MLD${o.id}`;
  if (shipping(o) === 'shipped') {
    const track = [o.courier, o.tracking_number && `tracking no. ${o.tracking_number}`].filter(Boolean).join(', ');
    return `Hi ${name}, your Milady's order ${no} has been shipped${track ? ` (${track})` : ''}.${o.tracking_url ? ` Track it here: ${o.tracking_url}` : ''}`;
  }
  if (o.status === 'created' || o.status === 'expired') return `Hi ${name}, this is Milady's. We noticed your order ${no} wasn't completed — the payment didn't go through. You can retry from My Orders on our website, or reply here if you need help.`;
  return `Hi ${name}, this is Milady's about your order ${no}.`;
}

function csvCell(v) {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function exportCsv(list) {
  const head = ['Order', 'Date', 'Customer', 'Email', 'Phone', 'Ship to', 'Address', 'City', 'State', 'Pincode', 'Items', 'Subtotal', 'Discount', 'Shipping', 'Total', 'Payment', 'Shipping status', 'Courier', 'Tracking number', 'Tracking link'];
  const rows = list.map((o) => [
    `MLD${o.id}`,
    new Date(o.created_at).toLocaleString('en-IN'),
    o.customer_name, o.customer_email, o.address_mobile || o.customer_mobile,
    o.address_name, o.address_line1, o.address_city, o.address_state, o.address_pincode,
    (o.items || []).map((i) => `${i.product_name}${i.color ? ` (${i.color})` : ''} x${i.qty}`).join('; '),
    o.subtotal, o.discount || 0, o.shipping_fee || 0, orderTotal(o),
    statusLabels[o.status] || o.status,
    isPaid(o) ? shippingLabels[shipping(o)] : '',
    o.courier, o.tracking_number, o.tracking_url,
  ]);
  const csv = [head, ...rows].map((r) => r.map(csvCell).join(',')).join('\n');
  const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `Miladys-Orders-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState(() => new URLSearchParams(window.location.search).get('tab') || 'all');
  const [search, setSearch] = useState('');
  const [dateRange, setDateRange] = useState('all');
  const [limit, setLimit] = useState(PAGE);
  const [selected, setSelected] = useState(() => new Set());
  const [busy, setBusy] = useState(false);
  const [invoiceId, setInvoiceId] = useState(null);
  // The "Mark as shipped" form: for the selected orders (bulk) or one order.
  const [shipForm, setShipForm] = useState(null); // { ids, courier, trackingNumber, trackingUrl }

  useEffect(() => {
    api
      .getAllOrders()
      .then(({ orders }) => setOrders(orders))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const counts = useMemo(
    () => Object.fromEntries(TABS.map((t) => [t.key, orders.filter(t.test).length])),
    [orders]
  );

  const filtered = useMemo(() => {
    const t = TABS.find((x) => x.key === tab) || TABS[0];
    const q = search.trim();
    return orders.filter((o) => t.test(o) && inDateRange(o, dateRange) && matches(o, q));
  }, [orders, tab, search, dateRange]);

  const visible = filtered.slice(0, limit);
  const selectedOrders = orders.filter((o) => selected.has(o.id));
  const selectedPaid = selectedOrders.filter(isPaid);
  const allVisibleSelected = visible.length > 0 && visible.every((o) => selected.has(o.id));

  useEffect(() => { setLimit(PAGE); }, [tab, search, dateRange]);

  function flash(msg) {
    setNotice(msg);
    setTimeout(() => setNotice(''), 4000);
  }

  function toggle(id) {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleAllVisible() {
    setSelected((s) => {
      const next = new Set(s);
      if (allVisibleSelected) visible.forEach((o) => next.delete(o.id));
      else visible.forEach((o) => next.add(o.id));
      return next;
    });
  }

  async function applyShipping(ids, status, tracking = {}) {
    setError('');
    setBusy(true);
    try {
      const res = await api.updateShipping({ ids, status, ...tracking });
      const { orders: fresh } = await api.getAllOrders();
      setOrders(fresh);
      setSelected(new Set());
      setShipForm(null);
      const parts = [`${res.updated.length} order${res.updated.length === 1 ? '' : 's'} marked as ${shippingLabels[status].toLowerCase()}`];
      if (res.emailed) parts.push(`${res.emailed} customer${res.emailed === 1 ? '' : 's'} emailed`);
      if (res.skipped.length) parts.push(`${res.skipped.length} skipped (not paid)`);
      flash(parts.join(' · '));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function openShipForm(list) {
    const one = list.length === 1 ? list[0] : null;
    setShipForm({
      ids: list.map((o) => o.id),
      courier: one?.courier || '',
      trackingNumber: one?.tracking_number || '',
      trackingUrl: one?.tracking_url || '',
    });
  }

  function submitShipForm(e) {
    e.preventDefault();
    const url = shipForm.trackingUrl.trim();
    if (url && !/^https?:\/\//i.test(url)) { setError('The tracking link must start with https://'); return; }
    applyShipping(shipForm.ids, 'shipped', {
      courier: shipForm.courier,
      trackingNumber: shipForm.trackingNumber,
      trackingUrl: url,
    });
  }

  async function handleBulkInvoices() {
    setError('');
    setBusy(true);
    try {
      await api.downloadInvoices(selectedPaid.map((o) => o.id));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleDownloadInvoice(order) {
    setError('');
    setInvoiceId(order.id);
    try {
      await api.downloadInvoice(order.id);
    } catch (err) {
      setError(err.message);
    } finally {
      setInvoiceId(null);
    }
  }

  return (
    <div>
      <div className="admin-page-head">
        <h1>Orders</h1>
        <p>Newest first. Search by order number, customer name, email, phone or saree. Tick orders to mark them shipped or delivered, download their invoices, or export them to Excel.</p>
      </div>

      <div className="order-tabs" role="tablist">
        {TABS.map((t) => (
          <button key={t.key} type="button" role="tab" aria-selected={tab === t.key} className={'order-tab' + (tab === t.key ? ' active' : '')} onClick={() => setTab(t.key)}>
            {t.label} <span className="count">{counts[t.key]}</span>
          </button>
        ))}
      </div>

      <div className="order-toolbar">
        <input
          type="search"
          className="order-search"
          placeholder="Search order no., name, email, phone, saree…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search orders"
        />
        <select value={dateRange} onChange={(e) => setDateRange(e.target.value)} aria-label="Filter by date">
          {DATES.map((d) => <option key={d.key} value={d.key}>{d.label}</option>)}
        </select>
        <button type="button" className="btn btn-outline small" onClick={() => exportCsv(selectedOrders.length ? selectedOrders : filtered)} disabled={!filtered.length && !selectedOrders.length}>
          Export {selectedOrders.length ? `${selectedOrders.length} selected` : 'list'} (CSV)
        </button>
      </div>

      {error && <p className="admin-error" role="alert">{error}</p>}
      {notice && <p className="admin-notice" role="status">{notice}</p>}

      {selected.size > 0 && (
        <div className="bulk-bar" role="region" aria-label="Actions for selected orders">
          <span className="bulk-count">{selected.size} selected{selectedPaid.length < selected.size ? ` (${selectedPaid.length} paid)` : ''}</span>
          <button type="button" className="btn btn-primary small" disabled={busy || !selectedPaid.length} onClick={() => openShipForm(selectedPaid)}>Mark shipped</button>
          <button type="button" className="btn btn-primary small" disabled={busy || !selectedPaid.length} onClick={() => applyShipping(selectedPaid.map((o) => o.id), 'delivered')}>Mark delivered</button>
          <button type="button" className="btn btn-outline small" disabled={busy || !selectedPaid.length} onClick={() => applyShipping(selectedPaid.map((o) => o.id), 'pending')}>Back to &ldquo;To ship&rdquo;</button>
          <button type="button" className="btn btn-outline small" disabled={busy || !selectedPaid.length} onClick={handleBulkInvoices}>Download invoices</button>
          <button type="button" className="link-btn" onClick={() => setSelected(new Set())}>Clear</button>
        </div>
      )}

      {shipForm && (
        <form className="ship-form" onSubmit={submitShipForm}>
          <h3>Mark {shipForm.ids.length === 1 ? `#MLD${shipForm.ids[0]}` : `${shipForm.ids.length} orders`} as shipped</h3>
          <p className="hint">Optional, but the customer gets these in their shipping email and in My Orders.{shipForm.ids.length > 1 ? ' Leave empty to keep each order’s own tracking details.' : ''}</p>
          <div className="ship-fields">
            <label>Courier<input type="text" value={shipForm.courier} onChange={(e) => setShipForm((f) => ({ ...f, courier: e.target.value }))} placeholder="e.g. DTDC, Delhivery, India Post" /></label>
            <label>Tracking number<input type="text" value={shipForm.trackingNumber} onChange={(e) => setShipForm((f) => ({ ...f, trackingNumber: e.target.value }))} /></label>
            <label>Tracking link<input type="url" value={shipForm.trackingUrl} onChange={(e) => setShipForm((f) => ({ ...f, trackingUrl: e.target.value }))} placeholder="https://…" /></label>
          </div>
          <div className="ship-actions">
            <button type="submit" className="btn btn-primary small" disabled={busy}>{busy ? 'Saving…' : 'Mark shipped & email customer'}</button>
            <button type="button" className="btn btn-outline small" onClick={() => setShipForm(null)}>Cancel</button>
          </div>
        </form>
      )}

      {loading && <p className="empty">Loading orders…</p>}

      {!loading && (
        <div className="orders-list">
          {orders.length === 0 && <p className="empty">No orders yet.</p>}
          {orders.length > 0 && filtered.length === 0 && <p className="empty">No orders match.</p>}
          {visible.length > 0 && (
            <label className="select-all">
              <input type="checkbox" checked={allVisibleSelected} onChange={toggleAllVisible} />
              Select all {visible.length} shown
            </label>
          )}
          {visible.map((o) => {
            const ship = shipping(o);
            const wa = waNumber(o);
            return (
            <div className={'order-row' + (selected.has(o.id) ? ' is-selected' : '')} key={o.id}>
              {o.status === 'paid_oversold' && (
                <div className="oversold-banner">
                  ⚠ Paid after stock ran out for one or more items — check inventory and contact the customer if needed.
                </div>
              )}
              {o.status === 'cancelled' && (
                <div className="cancelled-banner">
                  Cancelled by customer — {o.refund_percent}% refund ({formatINR(o.refund_amount || 0)}) {o.razorpay_payment_id ? 'was attempted automatically via Razorpay. Verify it went through in the Razorpay dashboard.' : 'is owed — no payment ID on file, so this needs a manual refund.'}
                </div>
              )}

              <div className="order-row-head">
                <label className="order-check">
                  <input type="checkbox" checked={selected.has(o.id)} onChange={() => toggle(o.id)} aria-label={`Select order #MLD${o.id}`} />
                  <strong>#MLD{o.id}</strong>
                </label>
                <span className="order-customer">{o.customer_name} · {o.customer_email}</span>
                <span className="pills">
                  {isPaid(o) && <span className={`ship-pill ship-${ship}`}>{shippingLabels[ship]}</span>}
                  <span className={`status-pill status-${o.status}`}>{statusLabels[o.status] || o.status}</span>
                </span>
              </div>

              <div className="order-detail-grid">
                <div className="detail-block">
                  <p className="detail-label">Shipping address</p>
                  <p className="detail-value">{o.address_name}</p>
                  <p className="detail-value">{o.address_mobile}</p>
                  <p className="detail-value">
                    {o.address_line1}
                    {o.address_city ? `, ${o.address_city}` : ''}
                    {o.address_state ? `, ${o.address_state}` : ''}
                    {o.address_pincode ? ` – ${o.address_pincode}` : ''}
                  </p>
                </div>

                <div className="detail-block">
                  <p className="detail-label">Payment</p>
                  <p className="detail-value mono">Order: {o.razorpay_order_id || '—'}</p>
                  <p className="detail-value mono">Payment: {o.razorpay_payment_id || '—'}</p>
                  {o.coupon_code && (
                    <p className="detail-value coupon-tag">{o.coupon_code} applied · −{formatINR(o.discount)}</p>
                  )}
                </div>

                {isPaid(o) && (
                  <div className="detail-block">
                    <p className="detail-label">Delivery</p>
                    {ship === 'pending' && <p className="detail-value">Not shipped yet</p>}
                    {ship !== 'pending' && (
                      <>
                        {o.courier && <p className="detail-value">{o.courier}</p>}
                        {o.tracking_number && <p className="detail-value mono">{o.tracking_number}</p>}
                        {o.tracking_url && <p className="detail-value"><a href={o.tracking_url} target="_blank" rel="noreferrer">Tracking link ↗</a></p>}
                        {o.shipped_at && <p className="detail-value muted">Shipped {new Date(o.shipped_at).toLocaleDateString('en-IN')}</p>}
                        {o.delivered_at && <p className="detail-value muted">Delivered {new Date(o.delivered_at).toLocaleDateString('en-IN')}</p>}
                      </>
                    )}
                  </div>
                )}
              </div>

              <div className="order-row-items">
                {o.items.map((item) => (
                  <Link to={`/products/${item.product_id}`} target="_blank" rel="noopener noreferrer" className="item-link" key={item.id}>
                    {item.product_image && <img src={item.product_image} alt="" />}
                    <span>{item.product_name}{item.color ? ` (${item.color})` : ''} × {item.qty}</span>
                  </Link>
                ))}
              </div>

              <div className="order-row-foot">
                <span>{new Date(o.created_at).toLocaleString('en-IN')}</span>
                {o.discount > 0 && <span>Subtotal {formatINR(o.subtotal)}</span>}
                <strong>{formatINR(orderTotal(o))}</strong>
              </div>

              <div className="order-row-actions">
                {isPaid(o) && ship === 'pending' && (
                  <button type="button" className="btn btn-primary small" disabled={busy} onClick={() => openShipForm([o])}>Mark shipped</button>
                )}
                {isPaid(o) && ship === 'shipped' && (
                  <>
                    <button type="button" className="btn btn-primary small" disabled={busy} onClick={() => applyShipping([o.id], 'delivered')}>Mark delivered</button>
                    <button type="button" className="btn btn-outline small" disabled={busy} onClick={() => openShipForm([o])}>Edit tracking</button>
                  </>
                )}
                {isPaid(o) && ship !== 'pending' && (
                  <button type="button" className="link-btn" disabled={busy} onClick={() => applyShipping([o.id], ship === 'delivered' ? 'shipped' : 'pending')}>
                    Undo ({ship === 'delivered' ? 'back to shipped' : 'back to to-ship'})
                  </button>
                )}
                {o.paid_at && (
                  <button type="button" className="btn btn-outline small" disabled={invoiceId === o.id} onClick={() => handleDownloadInvoice(o)}>
                    {invoiceId === o.id ? 'Preparing…' : 'Download Invoice'}
                  </button>
                )}
                {wa && (
                  <a className="btn btn-outline small wa-btn" href={waHref(wa, waMessage(o))} target="_blank" rel="noreferrer">WhatsApp customer</a>
                )}
              </div>
            </div>
            );
          })}
          {filtered.length > visible.length && (
            <button type="button" className="btn btn-outline show-more" onClick={() => setLimit((l) => l + PAGE)}>
              Show more ({filtered.length - visible.length} more)
            </button>
          )}
        </div>
      )}

      <style>{`
        .admin-page-head { margin-bottom: 24px; }
        .admin-page-head h1 { font-size: 26px; margin-bottom: 8px; }
        .admin-page-head p { font-size: 13px; color: var(--ink-400); max-width: 640px; line-height: 1.6; }
        .admin-error { font-size: 12.5px; color: #a13a3a; margin-bottom: 12px; }
        .admin-notice { font-size: 12.5px; color: #1e7039; background: #e8f2e6; padding: 9px 12px; border-radius: var(--radius-sm); margin-bottom: 12px; }
        .empty { color: var(--ink-400); font-size: 13.5px; }
        .btn.small { padding: 8px 14px; font-size: 12px; }
        .link-btn { background: none; border: none; color: var(--maroon-900); font-size: 12px; cursor: pointer; text-decoration: underline; padding: 4px; }
        .link-btn:disabled { opacity: 0.5; }

        .order-tabs { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 14px; }
        .order-tab { padding: 8px 14px; border-radius: 999px; border: 1px solid var(--stone-200); background: var(--paper); font-size: 12.5px; color: var(--ink-600); cursor: pointer; }
        .order-tab.active { background: var(--maroon-900); border-color: var(--maroon-900); color: var(--ivory); }
        .order-tab .count { opacity: 0.7; margin-left: 4px; }
        .order-toolbar { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; margin-bottom: 14px; }
        .order-search { flex: 1; min-width: 220px; padding: 10px 12px; border-radius: var(--radius-sm); border: 1px solid var(--stone-200); font-size: 13.5px; background: var(--paper); }
        .order-toolbar select { padding: 10px 12px; border-radius: var(--radius-sm); border: 1px solid var(--stone-200); font-size: 13px; background: var(--paper); }

        .bulk-bar { position: sticky; top: 0; z-index: 5; display: flex; flex-wrap: wrap; gap: 8px; align-items: center; background: var(--maroon-950); color: var(--ivory); padding: 10px 14px; border-radius: var(--radius-md); margin-bottom: 12px; }
        .bulk-count { font-size: 12.5px; margin-right: 6px; }
        .bulk-bar .btn-outline { background: var(--paper); }
        .bulk-bar .link-btn { color: var(--blush-300); margin-left: auto; }
        .ship-form { background: var(--paper); border: 1px solid var(--stone-200); border-radius: var(--radius-md); padding: 18px 20px; margin-bottom: 14px; display: flex; flex-direction: column; gap: 10px; }
        .ship-form h3 { font-family: var(--font-display); font-size: 16px; color: var(--maroon-900); margin: 0; }
        .ship-form .hint { font-size: 12px; color: var(--ink-400); margin: 0; }
        .ship-fields { display: grid; grid-template-columns: 1fr 1fr 1.4fr; gap: 10px; }
        .ship-fields label { display: flex; flex-direction: column; gap: 5px; font-size: 12px; color: var(--ink-600); }
        .ship-fields input { padding: 9px 11px; border-radius: var(--radius-sm); border: 1px solid var(--stone-200); font-size: 13px; }
        .ship-actions { display: flex; gap: 8px; }

        .select-all { display: flex; align-items: center; gap: 8px; font-size: 12.5px; color: var(--ink-600); }
        .orders-list { display: flex; flex-direction: column; gap: 14px; }
        .order-row {
          background: var(--paper);
          border-radius: var(--radius-md);
          padding: 18px 20px;
          border: 1px solid transparent;
        }
        .order-row.is-selected { border-color: var(--maroon-800); }
        .order-row-head { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; flex-wrap: wrap; }
        .order-check { display: flex; align-items: center; gap: 8px; cursor: pointer; }
        .order-check input { width: 16px; height: 16px; }
        .order-row-head strong { color: var(--maroon-900); }
        .order-customer { font-size: 12.5px; color: var(--ink-400); }
        .pills { margin-left: auto; display: flex; gap: 6px; }
        .status-pill, .ship-pill { font-size: 11px; padding: 4px 10px; border-radius: 999px; flex: 0 0 auto; }
        .status-paid { background: #e8f2e6; color: #3c7a3c; }
        .status-created { background: var(--blush-300); color: var(--maroon-900); }
        .status-failed { background: #f6e3e3; color: #a13a3a; }
        .status-paid_oversold { background: #fbeacb; color: #8a5a10; }
        .status-cancelled { background: var(--stone-200); color: var(--ink-600); }
        .status-expired { background: var(--stone-200); color: var(--ink-600); }
        .ship-pending { background: #fff3d6; color: #8a5a10; }
        .ship-shipped { background: #e3ecf8; color: #2b4f86; }
        .ship-delivered { background: #e8f2e6; color: #3c7a3c; }
        .oversold-banner {
          background: #fbeacb;
          color: #8a5a10;
          font-size: 12px;
          padding: 8px 12px;
          border-radius: var(--radius-sm);
          margin-bottom: 12px;
        }
        .cancelled-banner {
          background: var(--stone-100);
          color: var(--ink-600);
          font-size: 12px;
          padding: 8px 12px;
          border-radius: var(--radius-sm);
          margin-bottom: 12px;
        }

        .order-detail-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
          padding: 14px 0;
          border-top: 1px solid var(--stone-100);
          border-bottom: 1px solid var(--stone-100);
          margin-bottom: 12px;
        }
        .detail-block { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
        .detail-label {
          font-size: 10.5px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: var(--ink-400);
          margin: 0 0 3px;
        }
        .detail-value { font-size: 12.5px; color: var(--ink-600); margin: 0; line-height: 1.5; }
        .detail-value.mono { font-family: monospace; font-size: 11.5px; word-break: break-all; }
        .detail-value.muted { color: var(--ink-400); font-size: 11.5px; }
        .detail-value a { color: var(--maroon-900); }
        .coupon-tag { color: #3c7a3c; font-weight: 600; }

        .order-row-items { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 12px; }
        .item-link {
          display: flex;
          align-items: center;
          gap: 8px;
          background: var(--stone-100);
          border-radius: var(--radius-sm);
          padding: 6px 10px 6px 6px;
          font-size: 12px;
          color: var(--ink-600);
          text-decoration: none;
        }
        .item-link:hover { background: var(--blush-300); color: var(--maroon-900); }
        .item-link img { width: 28px; height: 28px; border-radius: 4px; object-fit: cover; flex: 0 0 auto; }

        .order-row-foot { display: flex; flex-wrap: wrap; gap: 16px; font-size: 12px; color: var(--ink-400); align-items: center; }
        .order-row-foot strong { margin-left: auto; color: var(--maroon-900); font-size: 14px; }
        .order-row-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--stone-100); }
        .order-row-actions:empty { display: none; }
        .wa-btn { margin-left: auto; }
        .show-more { align-self: center; }
        @media (max-width: 860px) { .bulk-bar { top: 64px; } }
        @media (max-width: 760px) {
          .ship-fields { grid-template-columns: 1fr; }
          .pills { margin-left: 0; }
          .wa-btn { margin-left: 0; }
        }
      `}</style>
    </div>
  );
}
