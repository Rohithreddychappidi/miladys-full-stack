import { query } from '../db.js';
import { razorpay, razorpayEnabled } from './razorpay.js';
import { sendRefundProcessedEmail, sendRefundFailedAlert } from './email.js';
import { getStoreInfo } from './storeInfo.js';

// Refunds through Razorpay, recorded in the `refunds` table so the admin
// and the customer can see whether the money actually went back.
// Razorpay answers a refund request with 'processed' or 'pending'; a
// pending one is settled later by the webhook (refund.processed /
// refund.failed). A request Razorpay refuses is saved as 'failed' with the
// reason, and can be retried from Admin → Orders.

const orderTotal = (o) => (o.subtotal || 0) - (o.discount || 0) + (o.shipping_fee || 0);

// Money already refunded or on its way (failed refunds don't count).
export async function refundedSoFar(orderId) {
  const { rows } = await query("SELECT COALESCE(SUM(amount), 0)::int AS n FROM refunds WHERE order_id = $1 AND status <> 'failed'", [orderId]);
  return rows[0].n;
}

export async function refundableLeft(order) {
  return Math.max(0, orderTotal(order) - (await refundedSoFar(order.id)));
}

async function syncOrderTotal(orderId) {
  await query(
    "UPDATE orders SET refund_amount = (SELECT COALESCE(SUM(amount), 0) FROM refunds WHERE order_id = $1 AND status <> 'failed') WHERE id = $1",
    [orderId]
  );
}

// Razorpay's own explanation, or a plain one from the HTTP status.
function reasonOf(err) {
  const d = err?.error?.description || err?.message;
  if (d) return d;
  const code = err?.statusCode;
  if (code === 401) return 'Razorpay rejected the server\'s API keys — check RAZORPAY_KEY_ID / SECRET.';
  if (code === 404) return 'Razorpay could not find this payment.';
  if (code === 400) return 'Razorpay refused the refund request.';
  if (code >= 500) return 'Razorpay is having a problem right now — try again in a while.';
  return code ? `Razorpay did not accept the refund (error ${code}).` : 'Razorpay could not be reached — try again in a while.';
}

// Sends the refund request for an existing refunds row (new or retried).
async function sendToRazorpay(refund, order) {
  if (!razorpayEnabled || !order.razorpay_payment_id) {
    const why = !order.razorpay_payment_id ? 'No Razorpay payment on this order — refund it manually.' : 'Payments are not configured on the server.';
    const { rows } = await query("UPDATE refunds SET status = 'failed', error = $2, updated_at = now() WHERE id = $1 RETURNING *", [refund.id, why]);
    return rows[0];
  }
  try {
    const rp = await razorpay.payments.refund(order.razorpay_payment_id, {
      amount: refund.amount * 100,
      notes: { order: `MLD${order.id}`, refund_row: String(refund.id), reason: (refund.reason || '').slice(0, 200) },
    });
    const status = rp.status === 'processed' ? 'processed' : rp.status === 'failed' ? 'failed' : 'pending';
    const { rows } = await query(
      'UPDATE refunds SET razorpay_refund_id = $2, status = $3, error = NULL, updated_at = now() WHERE id = $1 RETURNING *',
      [refund.id, rp.id, status]
    );
    return rows[0];
  } catch (err) {
    console.error(`[refunds] Razorpay refused refund #${refund.id} for order #MLD${order.id}:`, reasonOf(err));
    const { rows } = await query("UPDATE refunds SET status = 'failed', error = $2, updated_at = now() WHERE id = $1 RETURNING *", [refund.id, reasonOf(err)]);
    return rows[0];
  }
}

// Refunds `amount` (₹) on a paid order. Returns the refunds row (check its
// status), or throws an Error with a message for the admin.
export async function issueRefund(order, { amount, kind = 'cancellation', reason = null, by = 'customer' }) {
  const amt = Math.round(Number(amount));
  if (!(amt > 0)) throw new Error('Enter an amount to refund.');
  const left = await refundableLeft(order);
  if (amt > left) throw new Error(left > 0 ? `At most ₹${left.toLocaleString('en-IN')} can still be refunded on this order.` : 'This order has already been fully refunded.');
  const { rows } = await query(
    'INSERT INTO refunds (order_id, amount, kind, reason, requested_by) VALUES ($1,$2,$3,$4,$5) RETURNING *',
    [order.id, amt, kind, reason ? String(reason).slice(0, 300) : null, by]
  );
  const refund = await sendToRazorpay(rows[0], order);
  await syncOrderTotal(order.id);
  await afterStatus(refund, order, null);
  return refund;
}

// Retries a failed refund (Admin → Orders).
export async function retryRefund(refundId) {
  const { rows } = await query("SELECT r.*, o.razorpay_payment_id AS payment_id FROM refunds r JOIN orders o ON o.id = r.order_id WHERE r.id = $1", [refundId]);
  const refund = rows[0];
  if (!refund) throw new Error('Refund not found.');
  if (refund.status !== 'failed') throw new Error('Only a failed refund can be retried.');
  const { rows: o } = await query('SELECT * FROM orders WHERE id = $1', [refund.order_id]);
  // The amount must still fit (another refund may have been made since).
  const othersOk = (await refundedSoFar(refund.order_id)) + refund.amount <= orderTotal(o[0]);
  if (!othersOk) throw new Error('This refund no longer fits — the order has been refunded in the meantime.');
  await query("UPDATE refunds SET status = 'pending', error = NULL, updated_at = now() WHERE id = $1", [refund.id]);
  const updated = await sendToRazorpay({ ...refund, status: 'pending' }, o[0]);
  await syncOrderTotal(refund.order_id);
  await afterStatus(updated, o[0], 'failed');
  return updated;
}

// Razorpay webhook: refund.created / refund.processed / refund.failed.
export async function applyRefundEvent(event, entity) {
  const status = event === 'refund.processed' ? 'processed' : event === 'refund.failed' ? 'failed' : null;
  if (!status || !entity?.id) return null;
  // Find our row by Razorpay's refund id, or (if Razorpay's reply never
  // reached us) by the row number we put in the refund's notes.
  let { rows } = await query('SELECT * FROM refunds WHERE razorpay_refund_id = $1', [entity.id]);
  if (!rows[0] && entity.notes?.refund_row) {
    ({ rows } = await query('SELECT * FROM refunds WHERE id = $1 AND razorpay_refund_id IS NULL', [Number(entity.notes.refund_row)]));
  }
  const refund = rows[0];
  if (!refund) return null; // e.g. a refund made by hand in the Razorpay dashboard
  if (refund.status === status) return refund;
  const { rows: up } = await query(
    'UPDATE refunds SET status = $2, razorpay_refund_id = $3, error = $4, updated_at = now() WHERE id = $1 RETURNING *',
    [refund.id, status, entity.id, status === 'failed' ? 'Razorpay could not complete this refund.' : null]
  );
  await syncOrderTotal(refund.order_id);
  const { rows: o } = await query('SELECT * FROM orders WHERE id = $1', [refund.order_id]);
  await afterStatus(up[0], o[0], refund.status);
  return up[0];
}

// Emails when a refund's status changes: the customer when the money has
// been returned, the store when a refund failed.
async function afterStatus(refund, order, previous) {
  if (!refund || refund.status === previous) return;
  try {
    if (refund.status === 'processed') {
      const { rows } = await query('SELECT name, email FROM users WHERE id = $1', [order.user_id]);
      if (rows[0]) await sendRefundProcessedEmail(rows[0], order, refund);
    } else if (refund.status === 'failed') {
      const store = await getStoreInfo();
      await sendRefundFailedAlert(store.email, order, refund);
    }
  } catch (err) {
    console.error('[refunds] email failed', err.message);
  }
}

export async function refundsFor(orderIds) {
  if (!orderIds.length) return {};
  const { rows } = await query('SELECT * FROM refunds WHERE order_id = ANY($1) ORDER BY created_at', [orderIds]);
  const by = {};
  for (const r of rows) (by[r.order_id] ||= []).push(r);
  return by;
}
