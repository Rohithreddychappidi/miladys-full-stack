import { useState } from 'react';
import { api } from '../../data/api';
import { formatINR } from '../../data/store';

// Admin → Orders, inside each paid/cancelled order: the order's refunds
// with their Razorpay status, "Retry" for failed ones, and the
// "Cancel & refund" / "Refund" actions with a small form.
const STATUS = {
  processed: { label: 'Refunded', tone: 'ok' },
  pending: { label: 'Processing at Razorpay', tone: 'wait' },
  failed: { label: 'Failed', tone: 'bad' },
};
const KIND = { cancellation: 'Customer cancelled', admin_cancel: 'Cancelled by store', refund: 'Refund' };

export const orderTotal = (o) => o.subtotal - (o.discount || 0) + (o.shipping_fee || 0);
export const refundedTotal = (o) => (o.refunds || []).filter((r) => r.status !== 'failed').reduce((s, r) => s + r.amount, 0);

export default function OrderRefunds({ order, onChanged, onMessage }) {
  const [form, setForm] = useState(null); // { mode: 'cancel' | 'refund', amount, reason, restock, notify }
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const refunds = order.refunds || [];
  const paid = order.status === 'paid' || order.status === 'paid_oversold';
  const left = Math.max(0, orderTotal(order) - refundedTotal(order));
  const canRefund = Boolean(order.paid_at) && (paid || order.status === 'cancelled') && left > 0;

  function open(mode) {
    setError('');
    setForm({
      mode,
      amount: String(left),
      reason: '',
      restock: (order.shipping_status || 'pending') === 'pending',
      notify: true,
    });
  }

  async function submit(e) {
    e.preventDefault();
    const amount = Math.round(Number(form.amount));
    if (form.mode === 'refund' && !(amount > 0)) { setError('Enter the amount to refund.'); return; }
    if (amount < 0 || amount > left) { setError(`The refund can be up to ${formatINR(left)}.`); return; }
    const what = form.mode === 'cancel'
      ? `Cancel order #MLD${order.id}${amount ? ` and refund ${formatINR(amount)}` : ' with no refund'}?`
      : `Refund ${formatINR(amount)} on order #MLD${order.id}?`;
    if (!window.confirm(`${what}\n\nThe money goes back through Razorpay to the customer's original payment method.`)) return;
    setBusy(true);
    setError('');
    try {
      let result;
      if (form.mode === 'cancel') {
        result = await api.adminCancelOrder(order.id, { refundAmount: amount, reason: form.reason, restock: form.restock, notify: form.notify });
      } else {
        result = await api.adminRefundOrder(order.id, { amount, reason: form.reason });
      }
      const r = result.refund;
      const bad = Boolean(result.refundError) || r?.status === 'failed';
      onMessage(
        result.refundError ? `Order cancelled, but the refund could not be created: ${result.refundError}`
          : !r ? 'Order cancelled (no refund).'
            : r.status === 'failed' ? `Refund of ${formatINR(r.amount)} FAILED — ${r.error} You can retry it below.`
              : `Refund of ${formatINR(r.amount)} sent to Razorpay (${STATUS[r.status].label.toLowerCase()}).`,
        bad ? 'error' : 'ok'
      );
      setForm(null);
      onChanged();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function retry(refund) {
    setBusy(true);
    setError('');
    try {
      const { refund: r } = await api.retryRefund(refund.id);
      onMessage(r.status === 'failed' ? `Retry failed — ${r.error}` : `Refund of ${formatINR(r.amount)} sent again (${STATUS[r.status].label.toLowerCase()}).`, r.status === 'failed' ? 'error' : 'ok');
      onChanged();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (!refunds.length && !canRefund) return null;

  return (
    <div className="refunds-box">
      {refunds.length > 0 && (
        <ul className="refund-list">
          {refunds.map((r) => (
            <li key={r.id} className={`refund-item tone-${STATUS[r.status]?.tone}`}>
              <strong>{formatINR(r.amount)}</strong>
              <span className="refund-status">{STATUS[r.status]?.label || r.status}</span>
              <span className="refund-meta">
                {KIND[r.kind] || r.kind} · {new Date(r.created_at).toLocaleDateString('en-IN')}
                {r.razorpay_refund_id && ` · ${r.razorpay_refund_id}`}
                {r.reason && ` · “${r.reason}”`}
              </span>
              {r.status === 'failed' && (
                <>
                  <span className="refund-error">{r.error}</span>
                  <button type="button" className="btn btn-outline small" disabled={busy} onClick={() => retry(r)}>Retry refund</button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
      {!form && (
        <div className="refund-actions">
          {paid && <button type="button" className="link-btn danger-link" disabled={busy} onClick={() => open('cancel')}>Cancel &amp; refund…</button>}
          {canRefund && <button type="button" className="link-btn" disabled={busy} onClick={() => open('refund')}>Refund{refunds.length ? ' more' : ''}…</button>}
          {refunds.length > 0 && <span className="refund-left">{left > 0 ? `${formatINR(left)} of ${formatINR(orderTotal(order))} can still be refunded` : 'Fully refunded'}</span>}
        </div>
      )}
      {form && (
        <form className="refund-form" onSubmit={submit}>
          <p className="refund-form-title">{form.mode === 'cancel' ? `Cancel order #MLD${order.id}` : `Refund on order #MLD${order.id}`}</p>
          <div className="refund-fields">
            <label>
              Refund amount (₹)
              <input type="number" min={form.mode === 'cancel' ? 0 : 1} max={left} value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} />
              <span className="hint">Up to {formatINR(left)}{form.mode === 'cancel' ? ' · 0 for no refund' : ''}</span>
            </label>
            <label>
              Reason {form.mode === 'cancel' ? '(shown to the customer)' : '(for your records)'}
              <input type="text" maxLength={300} value={form.reason} placeholder={form.mode === 'cancel' ? 'e.g. Sorry — this saree is no longer available.' : 'e.g. Returned — damaged in transit'} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))} />
            </label>
          </div>
          {form.mode === 'cancel' && (
            <div className="refund-checks">
              <label><input type="checkbox" checked={form.restock} onChange={(e) => setForm((f) => ({ ...f, restock: e.target.checked }))} /> Put the sarees back in stock{(order.shipping_status || 'pending') !== 'pending' ? ' (only if they have come back to you)' : ''}</label>
              <label><input type="checkbox" checked={form.notify} onChange={(e) => setForm((f) => ({ ...f, notify: e.target.checked }))} /> Email the customer</label>
            </div>
          )}
          {error && <p className="refund-form-error" role="alert">{error}</p>}
          <div className="refund-form-actions">
            <button type="submit" className={`btn small ${form.mode === 'cancel' ? 'btn-danger' : 'btn-primary'}`} disabled={busy}>
              {busy ? 'Working…' : form.mode === 'cancel' ? 'Cancel order' : 'Send refund'}
            </button>
            <button type="button" className="btn btn-outline small" disabled={busy} onClick={() => setForm(null)}>Back</button>
          </div>
        </form>
      )}
      {error && !form && <p className="refund-form-error" role="alert">{error}</p>}
      <style>{`
        .refunds-box { margin-top: 10px; padding-top: 10px; border-top: 1px solid var(--stone-100); display: flex; flex-direction: column; gap: 8px; }
        .refund-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
        .refund-item { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 10px; font-size: 12.5px; padding: 8px 10px; border-radius: var(--radius-sm); background: var(--stone-100); }
        .refund-item.tone-ok { background: #e8f2e6; }
        .refund-item.tone-wait { background: #fff3d6; }
        .refund-item.tone-bad { background: #f6e3e3; }
        .refund-status { font-weight: 600; }
        .tone-ok .refund-status { color: #2f6b2f; }
        .tone-wait .refund-status { color: #8a5a10; }
        .tone-bad .refund-status { color: #a13a3a; }
        .refund-meta { color: var(--ink-500); font-size: 11.5px; }
        .refund-error { flex-basis: 100%; color: #a13a3a; font-size: 11.5px; }
        .refund-actions { display: flex; flex-wrap: wrap; gap: 14px; align-items: center; }
        .refund-left { font-size: 11.5px; color: var(--ink-400); }
        .refund-form { background: #fbf8f6; border: 1px solid var(--stone-200); border-radius: var(--radius-sm); padding: 12px 14px; display: flex; flex-direction: column; gap: 10px; }
        .refund-form-title { margin: 0; font-weight: 600; font-size: 13px; color: var(--maroon-900); }
        .refund-fields { display: grid; grid-template-columns: 180px 1fr; gap: 10px; }
        .refund-fields label { display: flex; flex-direction: column; gap: 4px; font-size: 12px; color: var(--ink-600); }
        .refund-fields input { padding: 8px 10px; border: 1px solid var(--stone-200); border-radius: var(--radius-sm); font-size: 13px; }
        .refund-fields .hint { font-size: 11px; color: var(--ink-400); }
        .refund-checks { display: flex; flex-direction: column; gap: 6px; font-size: 12.5px; color: var(--ink-700); }
        .refund-checks label { display: flex; gap: 8px; align-items: center; }
        .refund-form-error { color: #a13a3a; font-size: 12px; margin: 0; }
        .refund-form-actions { display: flex; gap: 8px; }
        .btn-danger { background: #a13a3a; color: #fff; border: 1px solid #a13a3a; }
        .btn-danger:disabled { opacity: 0.6; }
        @media (max-width: 640px) { .refund-fields { grid-template-columns: 1fr; } }
      `}</style>
    </div>
  );
}
