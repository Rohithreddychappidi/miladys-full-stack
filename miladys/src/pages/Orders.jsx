import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import RecommendedProducts from '../components/RecommendedProducts';
import Seo from '../components/Seo';
import { api } from '../data/api';
import { loadProductPool } from '../data/catalog';
import { formatINR } from '../data/store';
import { useCart } from '../context/CartContext';

const statusTone = {
  paid: 'tone-delivered',
  paid_oversold: 'tone-delivered',
  created: 'tone-processing',
  failed: 'tone-failed',
  cancelled: 'tone-cancelled',
};

const statusLabel = {
  paid: 'Paid',
  paid_oversold: 'Paid',
  created: 'Payment pending',
  failed: 'Payment failed',
  cancelled: 'Cancelled',
};

const isPaid = (o) => o.status === 'paid' || o.status === 'paid_oversold';
const shipping = (o) => o.shipping_status || 'pending';

const FILTERS = [
  { key: 'all', label: 'All', test: () => true },
  { key: 'active', label: 'In progress', test: (o) => isPaid(o) && shipping(o) !== 'delivered' },
  { key: 'delivered', label: 'Delivered', test: (o) => isPaid(o) && shipping(o) === 'delivered' },
  { key: 'pending', label: 'Payment pending', test: (o) => o.status === 'created' || o.status === 'failed' },
  { key: 'cancelled', label: 'Cancelled', test: (o) => o.status === 'cancelled' },
];

// Confirmed → Shipped → Delivered, for paid orders.
const STEPS = [
  { key: 'pending', label: 'Confirmed' },
  { key: 'shipped', label: 'Shipped' },
  { key: 'delivered', label: 'Delivered' },
];

// Stock left for one ordered line (its colour's own stock if it has one).
function stockFor(product, color) {
  const variant = color && (product.colors || []).find((c) => c.name === color);
  if (variant && variant.stock !== '' && variant.stock != null && Number.isFinite(Number(variant.stock))) return Number(variant.stock);
  return Number(product.stock) || 0;
}

function daysSince(dateStr) {
  if (!dateStr) return 0;
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
}

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [policy, setPolicy] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cancellingId, setCancellingId] = useState(null);
  const [cancelError, setCancelError] = useState('');
  const [products, setProducts] = useState([]);
  const [invoiceId, setInvoiceId] = useState(null);
  const [invoiceError, setInvoiceError] = useState(null); // { id, message }
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [reorderingId, setReorderingId] = useState(null);
  const [reorderNote, setReorderNote] = useState(null); // { id, message }
  const { items: cartItems, addItem, updateQty } = useCart();
  const navigate = useNavigate();

  const visibleOrders = useMemo(() => {
    const f = FILTERS.find((x) => x.key === filter) || FILTERS[0];
    const q = search.trim().toLowerCase().replace(/^#?mld/, '').replace(/^#/, '');
    return orders.filter((o) => f.test(o) && (!q
      || String(o.id) === q
      || (o.items || []).some((i) => String(i.product_name || '').toLowerCase().includes(q))));
  }, [orders, filter, search]);

  // Puts this order's sarees back in the bag at today's price and stock,
  // then goes to checkout (payment pending) or the bag (buy again). Sarees
  // that are no longer available are left out and the customer is told.
  async function handleReorder(order, { toCheckout }) {
    setReorderNote(null);
    setReorderingId(order.id);
    const missing = [];
    let added = 0;
    for (const item of order.items || []) {
      try {
        if (!item.product_id) throw new Error('gone');
        const { product } = await api.getProduct(item.product_id);
        const left = stockFor(product, item.color);
        if (left <= 0) throw new Error('out');
        const qty = Math.min(item.qty, left);
        const key = item.color ? `${product.id}__${item.color}` : product.id;
        const inCart = cartItems.find((c) => (c.key || c.id) === key);
        if (inCart) updateQty(key, Math.max(inCart.qty, qty));
        else addItem(product, qty, item.color || null, item.product_image || product.image);
        added += 1;
      } catch {
        missing.push(item.product_name);
      }
    }
    setReorderingId(null);
    if (!added) {
      setReorderNote({ id: order.id, message: 'Sorry — the sarees in this order are no longer available.' });
      return;
    }
    if (missing.length) {
      setReorderNote({ id: order.id, message: `Added to your bag. Not available any more: ${missing.join(', ')}.` });
      setTimeout(() => navigate(toCheckout ? '/checkout' : '/cart'), 2200);
      return;
    }
    navigate(toCheckout ? '/checkout' : '/cart');
  }

  useEffect(() => {
    api
      .getMyOrders()
      .then(({ orders }) => setOrders(orders))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
    api.getCancellationPolicy().then(({ policy }) => setPolicy(policy)).catch(() => {});
    loadProductPool().then(setProducts).catch(() => {});
  }, []);

  async function handleDownloadInvoice(order) {
    setInvoiceError(null);
    setInvoiceId(order.id);
    try {
      await api.downloadInvoice(order.id);
    } catch (err) {
      setInvoiceError({ id: order.id, message: err.message });
    } finally {
      setInvoiceId(null);
    }
  }

  function tierFor(order) {
    const days = daysSince(order.paid_at);
    return policy.find((t) => days <= t.max_days) || null;
  }

  async function handleCancel(order) {
    const tier = tierFor(order);
    const preview = tier
      ? `You'll receive a ${tier.refund_percent}% refund (${formatINR(Math.round(((order.subtotal - (order.discount || 0)) * tier.refund_percent) / 100))}) based on the cancellation policy.`
      : 'This order is outside the cancellation window.';
    if (!window.confirm(`Cancel order #MLD${order.id}?\n\n${preview}`)) return;

    setCancelError('');
    setCancellingId(order.id);
    try {
      const result = await api.cancelOrder(order.id);
      setOrders((prev) => prev.map((o) => (
        o.id === order.id
          ? { ...o, status: 'cancelled', refund_percent: result.refundPercent, refund_amount: result.refundAmount }
          : o
      )));
    } catch (err) {
      setCancelError(err.message);
    } finally {
      setCancellingId(null);
    }
  }

  return (
    <div className="orders-page">
      <Seo title="My Orders" path="/orders" noindex />
      <div className="container">
        <div className="page-head">
          <p className="eyebrow">Your Account</p>
          <h1>Orders</h1>
          <p className="page-sub">Every order you've placed, newest first, with payment and delivery status.</p>
        </div>

        {!loading && orders.length > 1 && (
          <div className="orders-toolbar">
            <div className="orders-filters" role="tablist">
              {FILTERS.map((f) => {
                const n = orders.filter(f.test).length;
                if (f.key !== 'all' && n === 0) return null;
                return (
                  <button key={f.key} type="button" role="tab" aria-selected={filter === f.key} className={'orders-filter' + (filter === f.key ? ' active' : '')} onClick={() => setFilter(f.key)}>
                    {f.label} ({n})
                  </button>
                );
              })}
            </div>
            <input
              type="search"
              className="orders-search"
              placeholder="Search order no. or saree"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search your orders"
            />
          </div>
        )}
        {!loading && orders.length > 0 && visibleOrders.length === 0 && <p className="empty-msg">No orders match.</p>}

        {loading && <p className="empty-msg">Loading your orders…</p>}
        {!loading && error && <p className="empty-msg error">{error}</p>}
        {!loading && !error && orders.length === 0 && (
          <p className="empty-msg">You haven't placed any orders yet.</p>
        )}
        {cancelError && <p className="empty-msg error">{cancelError}</p>}

        {!loading && orders.length > 0 && (
          <div className="orders-list">
            {visibleOrders.map((o) => {
              const ship = shipping(o);
              // Once shipped, an order can't be self-cancelled (see Return policy).
              const canCancel = isPaid(o) && ship === 'pending' && tierFor(o);
              const unpaid = o.status === 'created' || o.status === 'failed';
              const stepIndex = STEPS.findIndex((st) => st.key === ship);
              return (
                <div className="order-card" key={o.id}>
                  <div className="order-card-head">
                    <div>
                      <span className="order-id">#MLD{o.id}</span>
                      <span className="order-date">{new Date(o.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    </div>
                    <span className={`status ${statusTone[o.status] || ''}`}>{statusLabel[o.status] || o.status}</span>
                  </div>
                  {isPaid(o) && (
                    <div className="order-track">
                      <ol className="track-steps" aria-label="Delivery status">
                        {STEPS.map((st, i) => (
                          <li key={st.key} className={i <= stepIndex ? 'done' : ''} aria-current={i === stepIndex ? 'step' : undefined}>
                            <span className="dot" />{st.label}
                          </li>
                        ))}
                      </ol>
                      {ship !== 'pending' && (o.courier || o.tracking_number || o.tracking_url) && (
                        <p className="track-info">
                          {o.courier && <span>{o.courier}</span>}
                          {o.tracking_number && <span>Tracking no. <strong>{o.tracking_number}</strong></span>}
                          {o.tracking_url && <a href={o.tracking_url} target="_blank" rel="noreferrer">Track your parcel ↗</a>}
                        </p>
                      )}
                    </div>
                  )}
                  {unpaid && (
                    <p className="unpaid-note">
                      {o.status === 'failed' ? 'The payment for this order failed' : 'The payment for this order wasn\'t completed'}, so it hasn't been placed. Tap <strong>Complete Order</strong> to put these sarees back in your bag and pay again.
                    </p>
                  )}
                  <div className="order-items">
                    {(o.items || []).map((item) => (
                      <div className="order-item" key={item.id}>
                        {item.product_image && <img src={item.product_image} alt={item.product_name} />}
                        <div>
                          <p>{item.product_name}</p>
                          <span>{item.color ? `Color: ${item.color} · ` : ''}Qty {item.qty} · {formatINR(item.price)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="order-card-foot">
                    <div className="order-address">
                      Shipping to {o.address_line1}, {o.address_city} — {o.address_pincode}
                    </div>
                    <div className="order-total">
                      Total <strong>{formatINR(o.subtotal - (o.discount || 0) + (o.shipping_fee || 0))}</strong>
                      {o.razorpay_payment_id && <span className="payment-id">Payment ID: {o.razorpay_payment_id}</span>}
                    </div>
                  </div>

                  {o.status === 'cancelled' && o.refund_percent != null && (
                    <p className="refund-note">
                      Cancelled — {o.refund_percent}% refund ({formatINR(o.refund_amount || 0)}) will be credited to your original payment method.
                    </p>
                  )}

                  <div className="order-card-actions">
                    {o.paid_at && (
                      <button
                        type="button"
                        className="btn btn-outline invoice-btn"
                        disabled={invoiceId === o.id}
                        onClick={() => handleDownloadInvoice(o)}
                      >
                        {invoiceId === o.id ? 'Preparing…' : 'Download Invoice'}
                      </button>
                    )}
                    {unpaid && (
                      <button
                        type="button"
                        className="btn btn-primary reorder-btn"
                        disabled={reorderingId === o.id}
                        onClick={() => handleReorder(o, { toCheckout: true })}
                      >
                        {reorderingId === o.id ? 'Adding to bag…' : 'Complete Order'}
                      </button>
                    )}
                    {(isPaid(o) || o.status === 'cancelled') && (
                      <button
                        type="button"
                        className="btn btn-outline reorder-btn"
                        disabled={reorderingId === o.id}
                        onClick={() => handleReorder(o, { toCheckout: false })}
                      >
                        {reorderingId === o.id ? 'Adding to bag…' : 'Buy Again'}
                      </button>
                    )}
                    {canCancel && (
                      <button
                        type="button"
                        className="btn btn-outline cancel-btn"
                        disabled={cancellingId === o.id}
                        onClick={() => handleCancel(o)}
                      >
                        {cancellingId === o.id ? 'Cancelling…' : 'Cancel Order'}
                      </button>
                    )}
                  </div>
                  {invoiceError && invoiceError.id === o.id && <p className="empty-msg error invoice-error">{invoiceError.message}</p>}
                  {reorderNote && reorderNote.id === o.id && <p className="reorder-note" role="status">{reorderNote.message}</p>}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* After the orders, so it doesn't appear first and then get pushed down. */}
      {!loading && <RecommendedProducts products={products} title="Shop Again" />}

      <style>{`
        .orders-page { padding: 56px 0 0; }
        .orders-page .container { padding-bottom: 60px; }
        .page-head { max-width: 520px; margin-bottom: 36px; }
        .page-head h1 { font-size: 34px; margin: 8px 0 12px; }
        .page-sub { font-size: 13.5px; color: var(--ink-400); line-height: 1.6; }
        .empty-msg { font-size: 14px; color: var(--ink-400); padding: 40px 0; }
        .empty-msg.error { color: #a13a3a; padding: 0 0 20px; }

        .orders-list { display: flex; flex-direction: column; gap: 18px; }
        .order-card {
          border: 1px solid var(--stone-200);
          border-radius: var(--radius-md);
          padding: 20px 22px;
        }
        .order-card-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-bottom: 14px;
          margin-bottom: 14px;
          border-bottom: 1px solid var(--stone-200);
        }
        .order-id { font-weight: 600; color: var(--maroon-900); margin-right: 12px; }
        .order-date { font-size: 12.5px; color: var(--ink-400); }
        .status {
          display: inline-flex;
          width: fit-content;
          padding: 4px 12px;
          border-radius: 999px;
          font-size: 12px;
        }
        .tone-delivered { background: #e8f2e6; color: #3c7a3c; }
        .tone-processing { background: var(--blush-300); color: var(--maroon-900); }
        .tone-failed { background: #f6e3e3; color: #a13a3a; }
        .tone-cancelled { background: var(--stone-200); color: var(--ink-600); }

        .order-items { display: flex; flex-direction: column; gap: 10px; }
        .order-item { display: flex; align-items: center; gap: 12px; font-size: 13.5px; }
        .order-item img { width: 44px; height: 56px; object-fit: cover; border-radius: 4px; }
        .order-item p { margin: 0 0 2px; }
        .order-item span { font-size: 12px; color: var(--ink-400); }

        .order-card-foot {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 14px;
          margin-top: 16px;
          padding-top: 14px;
          border-top: 1px solid var(--stone-200);
          font-size: 12.5px;
          color: var(--ink-600);
        }
        .order-total { text-align: right; }
        .order-total strong { color: var(--maroon-900); font-size: 15px; }
        .payment-id { display: block; font-size: 11px; color: var(--ink-400); margin-top: 2px; }

        .refund-note { font-size: 12px; color: #3c7a3c; margin: 12px 0 0; }
        .order-card-actions { display: flex; gap: 10px; margin-top: 14px; flex-wrap: wrap; }
        .invoice-btn, .cancel-btn, .reorder-btn { font-size: 12.5px; padding: 9px 18px; margin-top: 0; }
        .reorder-note { font-size: 12px; color: var(--ink-600); margin: 10px 0 0; }
        .unpaid-note { font-size: 12.5px; color: var(--ink-600); background: #faf7f5; border-radius: var(--radius-sm); padding: 10px 12px; margin: 0 0 14px; line-height: 1.6; }

        .orders-toolbar { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; justify-content: space-between; margin-bottom: 20px; }
        .orders-filters { display: flex; flex-wrap: wrap; gap: 6px; }
        .orders-filter { padding: 7px 14px; border-radius: 999px; border: 1px solid var(--stone-200); background: none; font-size: 12.5px; color: var(--ink-600); cursor: pointer; }
        .orders-filter.active { background: var(--maroon-900); border-color: var(--maroon-900); color: var(--ivory); }
        .orders-search { flex: 0 1 260px; padding: 9px 12px; border-radius: var(--radius-sm); border: 1px solid var(--stone-200); font-size: 13px; }

        .order-track { margin: 0 0 14px; }
        .track-steps { list-style: none; display: flex; gap: 0; padding: 0; margin: 0; }
        .track-steps li { flex: 1; position: relative; display: flex; flex-direction: column; align-items: center; gap: 6px; font-size: 11.5px; color: var(--ink-400); text-align: center; }
        .track-steps li::before { content: ''; position: absolute; top: 5px; left: -50%; width: 100%; height: 2px; background: var(--stone-200); z-index: 0; }
        .track-steps li:first-child::before { display: none; }
        .track-steps li.done { color: var(--maroon-900); font-weight: 500; }
        .track-steps li.done::before { background: var(--maroon-800); }
        .track-steps .dot { width: 12px; height: 12px; border-radius: 50%; background: var(--stone-200); position: relative; z-index: 1; }
        .track-steps li.done .dot { background: var(--maroon-800); }
        .track-info { display: flex; flex-wrap: wrap; gap: 6px 16px; justify-content: center; font-size: 12.5px; color: var(--ink-600); margin: 12px 0 0; }
        .track-info a { color: var(--maroon-900); font-weight: 500; }
        .invoice-error { padding: 8px 0 0; font-size: 12px; }

        @media (max-width: 600px) {
          .order-card-foot { flex-direction: column; align-items: flex-start; }
          .order-total { text-align: left; }
          .orders-search { flex: 1 1 100%; }
        }
      `}</style>
    </div>
  );
}
