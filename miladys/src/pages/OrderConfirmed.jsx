import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Seo from '../components/Seo';
import { useAuth } from '../context/AuthContext';
import { api } from '../data/api';
import { formatINR } from '../data/store';
import { telHref, useStoreInfo, waHref } from '../data/storeInfo';
import { thumbUrl } from '../utils/images';

// Shown right after a successful payment (Checkout sends the customer
// here), and reachable again from the same address — so a refresh or the
// back button still shows the confirmation.

const total = (o) => o.subtotal - (o.discount || 0) + (o.shipping_fee || 0);
const fmtDate = (d, withTime = false) => new Date(d).toLocaleString('en-IN', {
  weekday: withTime ? undefined : 'short', day: 'numeric', month: 'short', year: withTime ? 'numeric' : undefined,
  ...(withTime && { hour: 'numeric', minute: '2-digit' }),
});

// Delivery usually takes 3–7 business days (Terms § 5); Sundays skipped.
function addBusinessDays(from, days) {
  const d = new Date(from);
  let added = 0;
  while (added < days) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() !== 0) added += 1;
  }
  return d;
}

const STEPS = [
  { key: 'pending', label: 'Confirmed' },
  { key: 'shipped', label: 'Shipped' },
  { key: 'delivered', label: 'Delivered' },
];

export default function OrderConfirmed() {
  const { id } = useParams();
  const { user } = useAuth();
  const store = useStoreInfo();
  const [order, setOrder] = useState(null);
  const [tiers, setTiers] = useState([]);
  const [state, setState] = useState('loading'); // loading | ok | missing | error
  const [copied, setCopied] = useState(false);
  const [invoiceBusy, setInvoiceBusy] = useState(false);
  const [invoiceError, setInvoiceError] = useState('');

  useEffect(() => {
    let active = true;
    api.getMyOrders()
      .then(({ orders }) => {
        if (!active) return;
        const found = orders.find((o) => String(o.id) === String(id).replace(/^MLD/i, ''));
        setOrder(found || null);
        setState(found ? 'ok' : 'missing');
      })
      .catch(() => active && setState('error'));
    api.getCancellationPolicy().then(({ policy }) => active && Array.isArray(policy) && setTiers(policy)).catch(() => {});
    window.scrollTo(0, 0);
    return () => { active = false; };
  }, [id]);

  if (state === 'loading') {
    return <div className="container confirm-loading" aria-busy="true"><p>Loading your order…</p></div>;
  }
  if (state !== 'ok') {
    return (
      <div className="container confirm-missing">
        <Seo title="Order" path={`/orders/${id}/confirmed`} noindex />
        <h1>{state === 'missing' ? 'Order not found' : 'Could not load your order'}</h1>
        <p>{state === 'missing' ? 'This order isn\'t on your account.' : 'Please check your connection and try again.'} Your orders are always listed in My Orders.</p>
        <Link to="/orders" className="btn btn-primary">Go to My Orders</Link>
        <style>{`.confirm-missing, .confirm-loading { padding: 80px 20px; text-align: center; } .confirm-missing h1 { font-size: 28px; margin-bottom: 10px; } .confirm-missing p { color: var(--ink-500); margin-bottom: 22px; }`}</style>
      </div>
    );
  }

  const paid = order.status === 'paid' || order.status === 'paid_oversold';
  const orderNo = `MLD${order.id}`;
  const ship = order.shipping_status || 'pending';
  const stepIndex = STEPS.findIndex((s) => s.key === ship);
  const abroad = order.address_country && order.address_country !== 'India';
  const from = order.paid_at || order.created_at;
  const firstName = (user?.name || order.address_name || '').split(' ')[0];
  const itemCount = (order.items || []).reduce((n, i) => n + i.qty, 0);
  const waText = `Hi Milady's, I have a question about my order #${orderNo}.`;

  async function copyOrderNo() {
    try { await navigator.clipboard.writeText(orderNo); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { /* not allowed */ }
  }

  async function downloadInvoice() {
    setInvoiceError('');
    setInvoiceBusy(true);
    try { await api.downloadInvoice(order.id); } catch (err) { setInvoiceError(err.message); } finally { setInvoiceBusy(false); }
  }

  return (
    <div className="confirm-page">
      <Seo title={`Order ${orderNo} confirmed`} path={`/orders/${order.id}/confirmed`} noindex />
      <div className="container confirm-wrap">
        {/* ---------- Header ---------- */}
        <section className="confirm-hero">
          <div className="confirm-tick" aria-hidden="true">
            <svg viewBox="0 0 24 24"><path d="M5 12.5l4.2 4.2L19 7" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </div>
          <p className="eyebrow">{paid ? 'Order confirmed' : 'Order received'}</p>
          <h1>Thank you{firstName ? `, ${firstName}` : ''}!</h1>
          <p className="confirm-lead">
            {paid
              ? <>We&apos;ve received your payment and your order is being prepared. A confirmation has been emailed to <strong>{user?.email}</strong>.</>
              : <>We haven&apos;t received the payment for this order yet. If money was deducted, it will be confirmed automatically within a few minutes.</>}
          </p>
          <div className="confirm-facts">
            <div>
              <span className="fact-label">Order number</span>
              <span className="fact-value">
                #{orderNo}
                <button type="button" className="copy-btn" onClick={copyOrderNo} aria-label="Copy order number">{copied ? 'Copied ✓' : 'Copy'}</button>
              </span>
            </div>
            <div>
              <span className="fact-label">Placed on</span>
              <span className="fact-value">{fmtDate(order.created_at, true)}</span>
            </div>
            <div>
              <span className="fact-label">{paid ? 'Amount paid' : 'Amount'}</span>
              <span className="fact-value strong">{formatINR(total(order))}</span>
            </div>
            <div>
              <span className="fact-label">Items</span>
              <span className="fact-value">{itemCount} {itemCount === 1 ? 'saree' : 'sarees'}</span>
            </div>
          </div>
        </section>

        {order.status === 'paid_oversold' && (
          <p className="confirm-alert" role="status">
            One of your sarees sold out moments before your payment went through. Our team will contact you shortly to offer an alternative or a full refund for it.
          </p>
        )}

        {/* ---------- Progress + delivery estimate ---------- */}
        {paid && (
          <section className="confirm-card confirm-progress">
            <ol className="steps" aria-label="Order progress">
              {STEPS.map((s, i) => (
                <li key={s.key} className={i <= stepIndex ? 'done' : ''} aria-current={i === stepIndex ? 'step' : undefined}>
                  <span className="dot" />{s.label}
                </li>
              ))}
            </ol>
            <p className="eta">
              {ship === 'delivered'
                ? 'Delivered — we hope you love it!'
                : abroad
                  ? <>International delivery times vary by country — we&apos;ll email your tracking details as soon as it ships.</>
                  : <>Estimated delivery: <strong>{fmtDate(addBusinessDays(from, 3))} – {fmtDate(addBusinessDays(from, 7))}</strong></>}
            </p>
          </section>
        )}

        <div className="confirm-grid">
          {/* ---------- Items + price ---------- */}
          <section className="confirm-card">
            <h2>Order summary</h2>
            <ul className="confirm-items">
              {(order.items || []).map((item) => (
                <li key={item.id}>
                  <Link to={item.product_id ? `/products/${item.product_id}` : '#'} className="ci-thumb">
                    {item.product_image ? <img src={thumbUrl(item.product_image)} alt={item.product_name} /> : <span />}
                  </Link>
                  <div className="ci-info">
                    <p className="ci-name">{item.product_name}</p>
                    <p className="ci-meta">
                      {item.color && <>Colour: {item.color} · </>}
                      {item.sku && <>Code: {item.sku} · </>}
                      Qty {item.qty} × {formatINR(item.price)}
                    </p>
                  </div>
                  <span className="ci-total">{formatINR(item.price * item.qty)}</span>
                </li>
              ))}
            </ul>
            <dl className="confirm-totals">
              <div><dt>Subtotal</dt><dd>{formatINR(order.subtotal)}</dd></div>
              {order.discount > 0 && <div className="discount"><dt>Coupon{order.coupon_code ? ` (${order.coupon_code})` : ''}</dt><dd>−{formatINR(order.discount)}</dd></div>}
              <div><dt>Shipping</dt><dd>{order.shipping_fee ? formatINR(order.shipping_fee) : 'Free'}</dd></div>
              <div className="grand"><dt>{paid ? 'Total paid' : 'Total'}</dt><dd>{formatINR(total(order))}</dd></div>
            </dl>
          </section>

          <div className="confirm-side">
            {/* ---------- Address ---------- */}
            <section className="confirm-card">
              <h2>Delivering to</h2>
              <p className="addr">
                <strong>{order.address_name}</strong><br />
                {order.address_line1}<br />
                {order.address_city}{order.address_state ? `, ${order.address_state}` : ''}{order.address_pincode ? ` — ${order.address_pincode}` : ''}
                {abroad && <><br />{order.address_country}</>}
                <br /><span className="addr-phone">Phone: {order.address_mobile}</span>
              </p>
            </section>

            {/* ---------- Payment ---------- */}
            <section className="confirm-card">
              <h2>Payment</h2>
              <p className="pay-line"><span className={`pay-badge ${paid ? 'ok' : 'wait'}`}>{paid ? 'Paid' : 'Awaiting payment'}</span> Online via Razorpay</p>
              {order.razorpay_payment_id && <p className="pay-ref">Payment reference: <code>{order.razorpay_payment_id}</code></p>}
              {paid && (
                <button type="button" className="btn btn-outline small-btn" disabled={invoiceBusy} onClick={downloadInvoice}>
                  {invoiceBusy ? 'Preparing…' : 'Download invoice (PDF)'}
                </button>
              )}
              {invoiceError && <p className="inv-error">{invoiceError}</p>}
            </section>
          </div>
        </div>

        {/* ---------- What happens next ---------- */}
        {paid && (
          <section className="confirm-card">
            <h2>What happens next</h2>
            <ol className="next-steps">
              <li>
                <strong>We pack your sarees</strong>
                <span>Each piece is checked by hand before it&apos;s packed.</span>
              </li>
              <li>
                <strong>We email your tracking details</strong>
                <span>As soon as it ships — courier name, tracking number and a link to follow it. You can also see it in <Link to="/orders">My Orders</Link>.</span>
              </li>
              <li>
                <strong>Changed your mind?</strong>
                <span>
                  You can cancel from <Link to="/orders">My Orders</Link> until the order ships.
                  {tiers.length > 0 && <> Refund: {tiers.map((t) => `${t.refund_percent}% ${t.label.toLowerCase().startsWith('within') ? t.label.toLowerCase() : `(${t.label.toLowerCase()})`}`).join(', ')}.</>}
                  {' '}<Link to="/return-policy">Return &amp; refund policy</Link>
                </span>
              </li>
              <li>
                <strong>When it arrives</strong>
                <span>Please record a short unboxing video — it makes any damage claim within 48 hours quick and easy.</span>
              </li>
            </ol>
          </section>
        )}

        {/* ---------- Help ---------- */}
        <section className="confirm-card confirm-help">
          <div>
            <h2>Questions about this order?</h2>
            <p>Mention order <strong>#{orderNo}</strong> and we&apos;ll help right away.</p>
          </div>
          <div className="help-actions">
            {store.whatsapp && <a className="btn btn-outline small-btn wa" href={waHref(store.whatsapp, waText)} target="_blank" rel="noreferrer">WhatsApp us</a>}
            {store.phone && <a className="btn btn-outline small-btn" href={telHref(store.phone)}>Call {store.phone}</a>}
            {store.email && <a className="btn btn-outline small-btn" href={`mailto:${store.email}?subject=${encodeURIComponent(`Order #${orderNo}`)}`}>Email us</a>}
          </div>
        </section>

        <div className="confirm-actions">
          <Link to="/orders" className="btn btn-primary">View my orders</Link>
          <Link to="/products" className="btn btn-outline">Continue shopping</Link>
        </div>
      </div>

      <style>{`
        .confirm-page { padding: 40px 0 70px; }
        .confirm-wrap { max-width: 980px; display: flex; flex-direction: column; gap: 18px; }
        .confirm-hero { text-align: center; padding: 10px 0 6px; }
        .confirm-tick { width: 60px; height: 60px; border-radius: 50%; margin: 0 auto 14px; background: #e8f2e6; color: #2f6b2f; display: flex; align-items: center; justify-content: center; animation: tick-pop 0.5s ease both; }
        .confirm-tick svg { width: 32px; height: 32px; }
        @keyframes tick-pop { from { transform: scale(0.6); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        .confirm-hero h1 { font-size: 34px; margin: 6px 0 10px; }
        .confirm-lead { max-width: 560px; margin: 0 auto 20px; color: var(--ink-600); font-size: 14px; line-height: 1.7; }
        .confirm-facts { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1px; background: var(--stone-200); border: 1px solid var(--stone-200); border-radius: var(--radius-md); overflow: hidden; text-align: left; }
        .confirm-facts > div { background: var(--paper); padding: 14px 16px; display: flex; flex-direction: column; gap: 4px; }
        .fact-label { font-size: 10.5px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--ink-400); font-weight: 600; }
        .fact-value { font-size: 14px; color: var(--ink-900); display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
        .fact-value.strong { font-weight: 700; color: var(--maroon-900); font-size: 16px; }
        .copy-btn { background: none; border: 1px solid var(--stone-200); border-radius: 999px; padding: 2px 9px; font-size: 11px; color: var(--maroon-900); cursor: pointer; }
        .confirm-alert { background: #fbeacb; color: #6d4a0f; border-radius: var(--radius-sm); padding: 12px 14px; font-size: 13px; line-height: 1.6; margin: 0; }
        .confirm-card { background: var(--paper); border: 1px solid var(--stone-200); border-radius: var(--radius-md); padding: 20px 22px; }
        .confirm-card h2 { font-family: var(--font-display); font-size: 18px; color: var(--maroon-900); margin: 0 0 14px; }
        .steps { list-style: none; display: flex; padding: 0; margin: 0 0 14px; }
        .steps li { flex: 1; position: relative; display: flex; flex-direction: column; align-items: center; gap: 6px; font-size: 12px; color: var(--ink-400); }
        .steps li::before { content: ''; position: absolute; top: 6px; left: -50%; width: 100%; height: 2px; background: var(--stone-200); }
        .steps li:first-child::before { display: none; }
        .steps li.done { color: var(--maroon-900); font-weight: 600; }
        .steps li.done::before { background: var(--maroon-800); }
        .steps .dot { width: 14px; height: 14px; border-radius: 50%; background: var(--stone-200); position: relative; z-index: 1; }
        .steps li.done .dot { background: var(--maroon-800); }
        .eta { text-align: center; font-size: 13.5px; color: var(--ink-700); margin: 0; }
        .confirm-grid { display: grid; grid-template-columns: minmax(0, 1.5fr) minmax(0, 1fr); gap: 18px; align-items: start; }
        .confirm-side { display: flex; flex-direction: column; gap: 18px; }
        .confirm-items { list-style: none; padding: 0; margin: 0 0 14px; display: flex; flex-direction: column; gap: 12px; }
        .confirm-items li { display: grid; grid-template-columns: 56px minmax(0, 1fr) auto; gap: 12px; align-items: center; }
        .ci-thumb img, .ci-thumb span { width: 56px; height: 70px; object-fit: cover; border-radius: 6px; display: block; background: var(--stone-100); }
        .ci-name { margin: 0 0 3px; font-size: 14px; color: var(--ink-900); }
        .ci-meta { margin: 0; font-size: 12px; color: var(--ink-400); line-height: 1.5; }
        .ci-total { font-weight: 600; color: var(--ink-900); font-size: 14px; }
        .confirm-totals { margin: 0; border-top: 1px solid var(--stone-200); padding-top: 12px; display: flex; flex-direction: column; gap: 6px; }
        .confirm-totals div { display: flex; justify-content: space-between; font-size: 13.5px; color: var(--ink-600); }
        .confirm-totals dd { margin: 0; }
        .confirm-totals .discount { color: #2f6b2f; }
        .confirm-totals .grand { font-size: 16px; font-weight: 700; color: var(--maroon-900); border-top: 1px solid var(--stone-200); padding-top: 10px; margin-top: 4px; }
        .addr { margin: 0; font-size: 13.5px; line-height: 1.7; color: var(--ink-700); }
        .addr-phone { color: var(--ink-500); }
        .pay-line { margin: 0 0 6px; font-size: 13.5px; color: var(--ink-700); display: flex; align-items: center; gap: 8px; }
        .pay-badge { font-size: 11px; font-weight: 600; padding: 3px 9px; border-radius: 999px; }
        .pay-badge.ok { background: #e8f2e6; color: #2f6b2f; }
        .pay-badge.wait { background: #fff3d6; color: #8a5a10; }
        .pay-ref { font-size: 12px; color: var(--ink-500); margin: 0 0 12px; word-break: break-all; }
        .pay-ref code { font-size: 11.5px; }
        .small-btn { padding: 9px 16px; font-size: 12.5px; }
        .inv-error { color: #a13a3a; font-size: 12px; margin: 8px 0 0; }
        .next-steps { margin: 0; padding-left: 20px; display: flex; flex-direction: column; gap: 12px; }
        .next-steps li { font-size: 13.5px; color: var(--ink-700); }
        .next-steps strong { display: block; color: var(--ink-900); margin-bottom: 2px; }
        .next-steps span { color: var(--ink-500); line-height: 1.6; }
        .next-steps a { color: var(--maroon-900); }
        .confirm-help { display: flex; justify-content: space-between; align-items: center; gap: 16px; flex-wrap: wrap; }
        .confirm-help h2 { margin-bottom: 4px; }
        .confirm-help p { margin: 0; font-size: 13px; color: var(--ink-500); }
        .help-actions { display: flex; gap: 8px; flex-wrap: wrap; }
        .help-actions .wa { border-color: #1e7a3c; color: #1e7a3c; }
        .confirm-actions { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; margin-top: 6px; }
        @media (max-width: 760px) {
          .confirm-page { padding-top: 24px; }
          .confirm-hero h1 { font-size: 28px; }
          .confirm-facts { grid-template-columns: 1fr 1fr; }
          .confirm-grid { grid-template-columns: 1fr; }
          .confirm-card { padding: 16px; }
          .confirm-actions .btn { flex: 1 1 100%; text-align: center; }
        }
      `}</style>
    </div>
  );
}
