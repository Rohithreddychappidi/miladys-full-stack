import { query, pool } from '../db.js';
import { razorpay, razorpayEnabled } from './razorpay.js';
import { sendOrderConfirmationEmail } from './email.js';

// Confirms an order once Razorpay says it's paid. Three things can call it:
//   - /api/orders/verify — the customer's browser, right after paying;
//   - /api/orders/webhook — Razorpay itself (instant, if set up in the
//     Razorpay dashboard);
//   - checkUnpaidOrders() below — every 10 minutes, asks Razorpay about
//     orders still waiting, for when the browser was closed after paying.
// Whichever comes first confirms the order; the rest see it's done.
//
// Returns { result: 'confirmed' | 'already' | 'not_found' | 'conflict', order, items }.
export async function confirmPaidOrder({ razorpayOrderId, paymentId, userId = null }) {
  // Mark paid only if the order is still awaiting payment ('created',
  // 'failed' after a bad attempt, or 'expired' when the payment arrived
  // late). Doing the check inside the same UPDATE makes it atomic, so a
  // confirmation sent twice (or replayed after a cancellation and refund)
  // can't mark it paid again or take the stock a second time.
  const userClause = userId ? 'AND user_id = $3' : '';
  const params = userId ? [paymentId, razorpayOrderId, userId] : [paymentId, razorpayOrderId];
  const { rows } = await query(
    `UPDATE orders SET status = 'paid', razorpay_payment_id = $1, paid_at = now()
     WHERE razorpay_order_id = $2 ${userClause} AND status IN ('created', 'failed', 'expired') RETURNING *`,
    params
  );
  const order = rows[0];
  if (!order) {
    const { rows: existing } = userId
      ? await query('SELECT * FROM orders WHERE razorpay_order_id = $1 AND user_id = $2', [razorpayOrderId, userId])
      : await query('SELECT * FROM orders WHERE razorpay_order_id = $1', [razorpayOrderId]);
    const current = existing[0];
    if (!current) return { result: 'not_found' };
    // Same payment confirmed twice: already done, no side effects repeated.
    if ((current.status === 'paid' || current.status === 'paid_oversold') && current.razorpay_payment_id === paymentId) {
      const { rows: items } = await query('SELECT * FROM order_items WHERE order_id = $1', [current.id]);
      return { result: 'already', order: current, items };
    }
    return { result: 'conflict', order: current };
  }

  const { rows: items } = await query('SELECT * FROM order_items WHERE order_id = $1', [order.id]);

  // Take the stock now that payment is confirmed — atomically per product,
  // so two payments racing for the last unit can't both succeed in full.
  // If a saree sold out between checkout and payment, the order is still
  // honoured (the money has moved) but flagged 'paid_oversold' so it shows
  // under "Needs attention" in Admin → Orders.
  const client = await pool.connect();
  let oversold = false;
  try {
    await client.query('BEGIN');
    for (const item of items) {
      const { rows: updated } = await client.query(
        'UPDATE products SET stock = stock - $1 WHERE id = $2 AND stock >= $1 RETURNING id',
        [item.qty, item.product_id]
      );
      let reserved = item.qty;
      if (!updated.length) {
        oversold = true;
        // Only whatever was left (often 0) actually comes out of stock —
        // recorded so a later cancellation puts back exactly that.
        const { rows: prev } = await client.query('SELECT stock FROM products WHERE id = $1 FOR UPDATE', [item.product_id]);
        reserved = Math.max(0, Math.min(item.qty, prev[0]?.stock ?? 0));
        await client.query('UPDATE products SET stock = 0 WHERE id = $1', [item.product_id]);
      }
      await client.query('UPDATE order_items SET stock_reserved = $1 WHERE id = $2', [reserved, item.id]);
    }
    // Redeem the coupon now — not at "apply" time — so an abandoned
    // checkout never burns the customer's one-time use of a code.
    if (order.coupon_id) {
      await client.query(
        `INSERT INTO coupon_redemptions (coupon_id, user_id, order_id) VALUES ($1,$2,$3)
         ON CONFLICT (coupon_id, user_id) DO NOTHING`,
        [order.coupon_id, order.user_id, order.id]
      );
    }
    if (oversold) {
      await client.query("UPDATE orders SET status = 'paid_oversold' WHERE id = $1", [order.id]);
      order.status = 'paid_oversold';
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[payments] stock/coupon finalize failed', order.id, err);
  } finally {
    client.release();
  }

  const { rows: userRows } = await query('SELECT * FROM users WHERE id = $1', [order.user_id]);
  if (userRows[0]) sendOrderConfirmationEmail(userRows[0], order, items).catch(() => {});
  return { result: 'confirmed', order, items };
}

// Every 10 minutes: for orders still waiting for payment (placed in the
// last 3 days, at least 5 minutes ago), ask Razorpay whether a payment
// went through, and confirm it if so. Orders still unpaid after 24 hours
// are marked 'expired' (the customer can still use "Complete Order").
const CHECK_EVERY_MS = 10 * 60 * 1000;

export async function checkUnpaidOrders() {
  if (!razorpayEnabled) return { confirmed: 0, expired: 0 };
  // Recent unpaid orders, plus any older 'created' ones not yet expired
  // (so nothing is expired without first asking Razorpay about it).
  const { rows: waiting } = await query(
    `SELECT id, status, razorpay_order_id, created_at < now() - interval '24 hours' AS overdue FROM orders
      WHERE razorpay_order_id IS NOT NULL AND created_at < now() - interval '5 minutes'
        AND (status = 'created' OR (status = 'failed' AND created_at > now() - interval '3 days'))
      ORDER BY created_at`
  );
  let confirmed = 0;
  let expired = 0;
  for (const o of waiting) {
    try {
      const { items: payments = [] } = await razorpay.orders.fetchPayments(o.razorpay_order_id);
      const captured = payments.find((p) => p.status === 'captured');
      if (captured) {
        const { result } = await confirmPaidOrder({ razorpayOrderId: o.razorpay_order_id, paymentId: captured.id });
        if (result === 'confirmed') {
          confirmed += 1;
          console.log(`[payments] order #MLD${o.id} confirmed from Razorpay (the browser never came back)`);
        }
      } else if (o.status === 'created' && o.overdue) {
        const { rowCount } = await query("UPDATE orders SET status = 'expired' WHERE id = $1 AND status = 'created'", [o.id]);
        expired += rowCount;
      }
    } catch (err) {
      console.error(`[payments] could not check order #MLD${o.id}`, err?.error?.description || err.message);
    }
  }
  return { confirmed, expired };
}

export function startPaymentChecks() {
  const run = () => checkUnpaidOrders()
    .then(({ confirmed, expired }) => (confirmed || expired) && console.log(`[payments] check: ${confirmed} confirmed, ${expired} expired`))
    .catch((err) => console.error('[payments] check failed', err.message));
  setTimeout(run, 30 * 1000);
  setInterval(run, CHECK_EVERY_MS).unref();
}
