import { query } from '../db.js';
import { sendReviewRequestEmail } from './email.js';

// Asks for a review when an order was shipped 7+ days ago but never marked
// delivered (marking it delivered already sends the review links). Each
// order is claimed with one UPDATE before emailing, so it's asked once
// even if the check overlaps itself or the API restarts.
const AFTER_DAYS = 7;
const EVERY_MS = 60 * 60 * 1000; // hourly

export async function sendDueReviewRequests() {
  const { rows: due } = await query(
    `UPDATE orders SET review_requested_at = now()
      WHERE status IN ('paid', 'paid_oversold') AND shipping_status = 'shipped'
        AND shipped_at < now() - make_interval(days => $1)
        AND review_requested_at IS NULL
      RETURNING *`,
    [AFTER_DAYS]
  );
  for (const order of due) {
    const [{ rows: users }, { rows: items }] = await Promise.all([
      query('SELECT name, email FROM users WHERE id = $1', [order.user_id]),
      query('SELECT * FROM order_items WHERE order_id = $1 ORDER BY id', [order.id]),
    ]);
    if (users[0]) await sendReviewRequestEmail(users[0], order, items);
  }
  return due.length;
}

export function startReviewReminders() {
  const run = () => sendDueReviewRequests()
    .then((n) => n && console.log(`[reviews] sent ${n} review reminder email(s)`))
    .catch((err) => console.error('[reviews] reminder check failed', err.message));
  setTimeout(run, 60 * 1000); // shortly after start, then hourly
  setInterval(run, EVERY_MS).unref();
}
