import { Router } from 'express';
import { query, pool } from '../db.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { razorpay, razorpayEnabled, verifyPaymentSignature } from '../lib/razorpay.js';
import { sendOrderConfirmationEmail, sendCancellationEmail, sendShippedEmail, sendDeliveredEmail } from '../lib/email.js';
import { renderInvoice, renderInvoices } from '../lib/invoice.js';
import { getStoreInfo } from '../lib/storeInfo.js';
import { ingestFromRequest, thumbPath } from '../lib/images.js';
import { findUsableCoupon, computeDiscount } from './coupons.js';
import { findApplicableTier } from './cancellationPolicy.js';

const router = Router();

// Reads the admin-configurable shipping fee / free-shipping threshold from
// the "shipping_settings" CMS section (edited in /admin/home). Falls back
// to a flat ₹100 if that section is ever missing, so checkout never
// breaks even before the row exists in an older database.
async function getShippingSettings() {
  const { rows } = await query(`SELECT content FROM home_sections WHERE section_key = 'shipping_settings'`);
  const content = rows[0]?.content || {};
  const fee = Number.isFinite(content.fee) ? content.fee : 100;
  const freeThreshold = Number.isFinite(content.freeThreshold) ? content.freeThreshold : 0;
  return { fee, freeThreshold };
}

// POST /api/orders/create
// Body: { items: [{ productId, qty }], address: {name, mobile, line1, city, state, pincode} }
// Prices are looked up from the DB — never trust a price sent by the client.
router.post('/create', requireAuth, async (req, res) => {
  if (!razorpayEnabled) {
    return res.status(503).json({ error: 'Payments are not configured yet. Add RAZORPAY_KEY_ID/SECRET to server/.env.' });
  }
  const { items, address, couponCode } = req.body || {};
  if (!Array.isArray(items) || !items.length) return res.status(400).json({ error: 'Cart is empty.' });
  if (!address?.name || !address?.mobile || !address?.line1 || !address?.city || !address?.pincode) {
    return res.status(400).json({ error: 'A complete shipping address is required.' });
  }

  // Quantities come from the browser: each must be a whole number 1–10.
  // (A negative quantity used to lower the order total — and the payment
  // step then ADDED stock for it.)
  const MAX_QTY = 10;
  const wanted = {};
  for (const item of items) {
    const n = Number(item.qty);
    if (!Number.isInteger(n) || n < 1 || n > MAX_QTY) {
      return res.status(400).json({ error: `Please choose a quantity between 1 and ${MAX_QTY}.` });
    }
    item.qty = n;
    wanted[item.productId] = (wanted[item.productId] || 0) + n;
  }

  const productIds = items.map((i) => i.productId);
  const { rows: products } = await query('SELECT * FROM products WHERE id = ANY($1) AND active = true', [productIds]);
  const byId = Object.fromEntries(products.map((p) => [p.id, p]));

  let subtotal = 0;
  const lineItems = [];
  for (const { productId, qty, color, image: chosenImage } of items) {
    const p = byId[productId];
    if (!p) return res.status(400).json({ error: `Product ${productId} not found.` });
    // Total across every cart line for this saree (e.g. two colours of it).
    if (p.stock < wanted[productId]) return res.status(400).json({ error: `${p.name} is out of stock.` });
    subtotal += p.price * qty;
    // The line-item photo is whatever the customer was looking at (e.g. a
    // colour variant), but only if it's genuinely one of this product's own
    // photos — never store an arbitrary client-supplied string.
    const colorMatch = color && Array.isArray(p.colors) ? p.colors.find((c) => c.name === color) : null;
    const ownPhotos = [p.image, ...(p.images || []), ...(p.colors || []).flatMap((c) => [c.image, ...(c.images || [])])]
      .filter(Boolean);
    const chosenPath = await ingestFromRequest(req, typeof chosenImage === 'string' && !chosenImage.startsWith('data:') ? chosenImage : '');
    const itemImage = ownPhotos.includes(chosenPath) ? chosenPath : (colorMatch?.image || p.image);
    lineItems.push({ product: p, qty, color: color || null, image: thumbPath(itemImage) });
  }

  // Re-validate the coupon server-side rather than trusting a discount
  // amount from the client — same checks as /coupons/validate (active,
  // not expired, minimum order, not already used by this user).
  let coupon = null;
  let discount = 0;
  if (couponCode) {
    const result = await findUsableCoupon(couponCode, req.user.id);
    if (result.error) return res.status(400).json({ error: result.error });
    coupon = result.coupon;
    if (coupon.min_order && subtotal < coupon.min_order) {
      return res.status(400).json({ error: `This coupon needs a minimum order of ₹${coupon.min_order}.` });
    }
    discount = computeDiscount(coupon, subtotal);
  }
  // Free-shipping threshold is checked against the raw subtotal (before
  // any coupon discount) — so a discount code can't also unintentionally
  // unlock free shipping.
  const { fee, freeThreshold } = await getShippingSettings();
  const shippingFee = freeThreshold > 0 && subtotal >= freeThreshold ? 0 : fee;
  const total = subtotal - discount + shippingFee;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const orderInsert = await client.query(
      `INSERT INTO orders (user_id, status, subtotal, shipping_fee, coupon_id, coupon_code, discount, address_name, address_mobile, address_line1, address_city, address_state, address_pincode)
       VALUES ($1,'created',$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [req.user.id, subtotal, shippingFee, coupon?.id || null, coupon?.code || null, discount, address.name, address.mobile, address.line1, address.city, address.state || '', address.pincode]
    );
    const order = orderInsert.rows[0];

    for (const { product, qty, color, image } of lineItems) {
      await client.query(
        `INSERT INTO order_items (order_id, product_id, product_name, product_image, price, qty, color)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [order.id, product.id, product.name, image || product.image, product.price, qty, color || null]
      );
    }

    // Razorpay wants the amount in paise.
    const rpOrder = await razorpay.orders.create({
      amount: total * 100,
      currency: 'INR',
      receipt: `MLD${order.id}`,
      notes: { orderId: String(order.id), userId: String(req.user.id) },
    });

    await client.query('UPDATE orders SET razorpay_order_id = $1 WHERE id = $2', [rpOrder.id, order.id]);
    await client.query('COMMIT');

    res.status(201).json({
      orderId: order.id,
      razorpayOrderId: rpOrder.id,
      amount: rpOrder.amount,
      currency: rpOrder.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
      discount,
      shippingFee,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[orders/create]', err);
    res.status(500).json({ error: 'Could not create order. Please try again.' });
  } finally {
    client.release();
  }
});

// POST /api/orders/verify — called by the frontend from Razorpay Checkout's
// handler once payment succeeds. This is what actually confirms the order.
router.post('/verify', requireAuth, async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body || {};
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json({ error: 'Missing payment verification fields.' });
  }

  const valid = verifyPaymentSignature({
    orderId: razorpay_order_id,
    paymentId: razorpay_payment_id,
    signature: razorpay_signature,
  });
  if (!valid) {
    // Only the customer's own order, and only while it's still awaiting
    // payment — a bad signature must never downgrade a paid or cancelled one.
    await query(
      `UPDATE orders SET status = 'failed' WHERE razorpay_order_id = $1 AND user_id = $2 AND status = 'created'`,
      [razorpay_order_id, req.user.id]
    );
    return res.status(400).json({ error: 'Payment verification failed.' });
  }

  // Mark paid only if the order is still awaiting payment ('created', or
  // 'failed' after an earlier bad attempt). Doing the check inside the same
  // UPDATE makes it atomic, so a confirmation that's sent twice (or
  // replayed later — e.g. after the order was cancelled and refunded)
  // can't mark it paid again or take the stock a second time.
  const { rows } = await query(
    `UPDATE orders SET status = 'paid', razorpay_payment_id = $1, paid_at = now()
     WHERE razorpay_order_id = $2 AND user_id = $3 AND status IN ('created', 'failed') RETURNING *`,
    [razorpay_payment_id, razorpay_order_id, req.user.id]
  );
  const order = rows[0];
  if (!order) {
    const { rows: existing } = await query(
      'SELECT * FROM orders WHERE razorpay_order_id = $1 AND user_id = $2',
      [razorpay_order_id, req.user.id]
    );
    const current = existing[0];
    if (!current) return res.status(404).json({ error: 'Order not found.' });
    // Same payment confirmed twice (double-sent by the browser): already
    // done, so just report success without repeating any side effects.
    if ((current.status === 'paid' || current.status === 'paid_oversold') && current.razorpay_payment_id === razorpay_payment_id) {
      const { rows: items } = await query('SELECT * FROM order_items WHERE order_id = $1', [current.id]);
      return res.json({ ok: true, order: current, items });
    }
    return res.status(409).json({ error: 'This order can no longer be confirmed — it was already completed or cancelled.' });
  }

  const { rows: items } = await query('SELECT * FROM order_items WHERE order_id = $1', [order.id]);

  // Decrement stock now that payment is confirmed — atomically per product,
  // so two payments racing for the last unit can't both succeed in full.
  // This matters most exactly when it's needed most: a sudden traffic
  // spike where many people are checking out at once. If a product
  // genuinely sells out between checkout and payment confirmation, the
  // order is still honoured (money has already moved via Razorpay) but
  // flagged 'paid_oversold' so it surfaces in Admin → Orders for manual
  // follow-up (refund or restock) instead of silently going stock-negative
  // or double-selling the same unit without anyone noticing.
  const client = await pool.connect();
  let oversold = false;
  try {
    await client.query('BEGIN');
    for (const item of items) {
      const { rows: updated } = await client.query(
        `UPDATE products SET stock = stock - $1 WHERE id = $2 AND stock >= $1 RETURNING id`,
        [item.qty, item.product_id]
      );
      let reserved = item.qty;
      if (!updated.length) {
        oversold = true;
        // Only whatever was left (often 0) actually comes out of stock —
        // record that, so a later cancellation doesn't put back units that
        // never existed.
        const { rows: prev } = await client.query(`SELECT stock FROM products WHERE id = $1 FOR UPDATE`, [item.product_id]);
        reserved = Math.max(0, Math.min(item.qty, prev[0]?.stock ?? 0));
        await client.query(`UPDATE products SET stock = 0 WHERE id = $1`, [item.product_id]);
      }
      await client.query(`UPDATE order_items SET stock_reserved = $1 WHERE id = $2`, [reserved, item.id]);
    }

    // Redeem the coupon now — not at "apply" time — so an abandoned
    // checkout never burns the customer's one-time use of a code. The
    // unique (coupon_id, user_id) constraint is the real guarantee here;
    // ON CONFLICT DO NOTHING just makes a retried /verify call idempotent.
    if (order.coupon_id) {
      await client.query(
        `INSERT INTO coupon_redemptions (coupon_id, user_id, order_id) VALUES ($1,$2,$3)
         ON CONFLICT (coupon_id, user_id) DO NOTHING`,
        [order.coupon_id, req.user.id, order.id]
      );
    }

    if (oversold) {
      await client.query(`UPDATE orders SET status = 'paid_oversold' WHERE id = $1`, [order.id]);
      order.status = 'paid_oversold';
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[orders/verify] stock/coupon finalize failed', err);
  } finally {
    client.release();
  }

  const { rows: userRows } = await query('SELECT * FROM users WHERE id = $1', [req.user.id]);
  sendOrderConfirmationEmail(userRows[0], order, items).catch(() => {});

  res.json({ ok: true, order, items });
});

// POST /api/orders/:id/cancel — self-service cancellation for the order's
// owner. Refund percentage comes entirely from the admin-editable
// cancellation_policy table, evaluated against whole days since payment.
router.post('/:id/cancel', requireAuth, async (req, res) => {
  const { rows } = await query('SELECT * FROM orders WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
  const order = rows[0];
  if (!order) return res.status(404).json({ error: 'Order not found.' });
  if (order.status !== 'paid' && order.status !== 'paid_oversold') {
    return res.status(400).json({ error: 'Only paid orders can be cancelled.' });
  }
  if (order.shipping_status === 'shipped' || order.shipping_status === 'delivered') {
    return res.status(400).json({ error: 'This order has already been shipped, so it can no longer be cancelled here — please contact us for a return.' });
  }

  const daysSincePaid = order.paid_at ? Math.floor((Date.now() - new Date(order.paid_at).getTime()) / 86400000) : 0;
  const tier = await findApplicableTier(daysSincePaid);
  if (!tier) {
    return res.status(400).json({ error: 'This order is past the cancellation window and can no longer be cancelled here — please contact support.' });
  }

  // Refund is based on merchandise value only — shipping isn't refunded on
  // a self-service cancellation, matching common practice (the order was
  // already picked/shipped, or shipping was already incurred).
  const payable = order.subtotal - (order.discount || 0);
  const refundAmount = Math.round((payable * tier.refund_percent) / 100);

  const { rows: items } = await query('SELECT * FROM order_items WHERE order_id = $1', [order.id]);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Flip to cancelled only if it's still paid — checked inside the UPDATE
    // so two cancel requests arriving together can't both go through (which
    // would put the stock back twice and send two refunds).
    const { rows: flipped } = await client.query(
      `UPDATE orders SET status = 'cancelled', cancelled_at = now(), refund_percent = $1, refund_amount = $2
       WHERE id = $3 AND status IN ('paid', 'paid_oversold') AND shipping_status = 'pending' RETURNING id`,
      [tier.refund_percent, refundAmount, order.id]
    );
    if (!flipped.length) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'This order has already been cancelled or shipped.' });
    }
    // Put the stock back — exactly the units this order took. An oversold
    // line took fewer than it ordered (see /verify); orders paid before
    // stock_reserved existed have NULL there and fall back to qty.
    for (const item of items) {
      const back = item.stock_reserved ?? item.qty;
      if (back > 0) await client.query('UPDATE products SET stock = stock + $1 WHERE id = $2', [back, item.product_id]);
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[orders/cancel] failed', err);
    return res.status(500).json({ error: 'Could not cancel the order. Please try again.' });
  } finally {
    client.release();
  }

  // Attempt the actual money-back via Razorpay. This is best-effort: the
  // order is already cancelled and stock already restored above regardless
  // of whether the refund call itself succeeds, so a Razorpay hiccup here
  // doesn't leave the order stuck — worst case, an admin issues the refund
  // manually from the Razorpay dashboard using the payment ID on the order.
  if (refundAmount > 0 && razorpayEnabled && order.razorpay_payment_id) {
    try {
      await razorpay.payments.refund(order.razorpay_payment_id, { amount: refundAmount * 100 });
    } catch (err) {
      console.error('[orders/cancel] Razorpay refund failed — needs manual refund', order.id, err.message);
    }
  }

  // Fire the cancellation confirmation from our own side — separate from
  // whatever Razorpay itself may send for the refund, since that's a
  // payment-gateway notification, not an order-status one, and customers
  // expect a clear "your order was cancelled" email from the store itself.
  const { rows: userRows } = await query('SELECT * FROM users WHERE id = $1', [req.user.id]);
  if (userRows[0]) {
    sendCancellationEmail(userRows[0], order, { refundPercent: tier.refund_percent, refundAmount, tierLabel: tier.label }).catch(() => {});
  }

  res.json({ ok: true, refundPercent: tier.refund_percent, refundAmount, tierLabel: tier.label });
});

// GET /api/orders — the logged-in user's own orders, with items + payment status.
router.get('/', requireAuth, async (req, res) => {
  const { rows: orders } = await query('SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC, id DESC', [req.user.id]);
  const { rows: items } = orders.length
    ? await query('SELECT * FROM order_items WHERE order_id = ANY($1)', [orders.map((o) => o.id)])
    : { rows: [] };
  res.json({ orders: orders.map((o) => ({ ...o, items: items.filter((i) => i.order_id === o.id) })) });
});

// GET /api/orders/admin — every order + payment details, for the admin panel.
router.get('/admin/all', requireAdmin, async (_req, res) => {
  const { rows: orders } = await query(
    `SELECT o.*, u.name AS customer_name, u.email AS customer_email, u.mobile AS customer_mobile
     FROM orders o JOIN users u ON u.id = o.user_id
     ORDER BY o.created_at DESC, o.id DESC`
  );
  const { rows: items } = orders.length
    ? await query('SELECT * FROM order_items WHERE order_id = ANY($1)', [orders.map((o) => o.id)])
    : { rows: [] };
  res.json({ orders: orders.map((o) => ({ ...o, items: items.filter((i) => i.order_id === o.id) })) });
});

// PUT /api/orders/admin/shipping — update fulfilment for one or many paid
// orders. Body: { ids: [..], status: 'pending'|'shipped'|'delivered',
// courier?, trackingNumber?, trackingUrl? }. Courier/tracking are only
// written when given (so a bulk "mark delivered" keeps each order's own
// tracking). Customers are emailed when an order becomes shipped or
// delivered. Unpaid or cancelled orders are skipped and reported back.
router.put('/admin/shipping', requireAdmin, async (req, res) => {
  const { ids, status, courier, trackingNumber, trackingUrl } = req.body || {};
  if (!Array.isArray(ids) || !ids.length) return res.status(400).json({ error: 'Select at least one order.' });
  if (!['pending', 'shipped', 'delivered'].includes(status)) return res.status(400).json({ error: 'Unknown shipping status.' });
  const cleanIds = ids.map(Number).filter(Number.isInteger);
  const url = typeof trackingUrl === 'string' && trackingUrl.trim() ? trackingUrl.trim() : null;
  if (url && !/^https?:\/\//i.test(url)) return res.status(400).json({ error: 'The tracking link must start with http:// or https://' });

  const { rows: before } = await query('SELECT id, shipping_status FROM orders WHERE id = ANY($1)', [cleanIds]);
  const prev = Object.fromEntries(before.map((o) => [o.id, o.shipping_status]));
  const { rows: updated } = await query(
    `UPDATE orders SET
       shipping_status = $2,
       courier = COALESCE($3, courier),
       tracking_number = COALESCE($4, tracking_number),
       tracking_url = COALESCE($5, tracking_url),
       shipped_at = CASE WHEN $2 = 'pending' THEN NULL WHEN shipped_at IS NULL THEN now() ELSE shipped_at END,
       delivered_at = CASE WHEN $2 = 'delivered' THEN COALESCE(delivered_at, now()) ELSE NULL END
     WHERE id = ANY($1) AND status IN ('paid', 'paid_oversold')
     RETURNING *`,
    [cleanIds, status, courier?.trim() || null, trackingNumber?.trim() || null, url]
  );
  const skipped = cleanIds.filter((id) => !updated.some((o) => o.id === id));

  // Email customers whose order just moved forward to shipped / delivered
  // (not when the admin undoes a step, e.g. delivered → shipped).
  const rank = { pending: 0, shipped: 1, delivered: 2 };
  const changed = updated.filter((o) => rank[o.shipping_status] > rank[prev[o.id] || 'pending']);
  if (changed.length) {
    (async () => {
      for (const o of changed) {
        const { rows: u } = await query('SELECT name, email FROM users WHERE id = $1', [o.user_id]);
        if (!u[0]) continue;
        const { rows: items } = await query('SELECT * FROM order_items WHERE order_id = $1', [o.id]);
        if (o.shipping_status === 'shipped') {
          await sendShippedEmail(u[0], o, items);
        } else {
          // The Delivered email carries the review links, so the 7-day
          // review reminder (lib/reviewReminders.js) isn't needed after it.
          await query('UPDATE orders SET review_requested_at = COALESCE(review_requested_at, now()) WHERE id = $1', [o.id]);
          await sendDeliveredEmail(u[0], o, items);
        }
      }
    })().catch((err) => console.error('[orders/shipping] email failed', err.message));
  }
  res.json({ ok: true, updated: updated.map((o) => o.id), skipped, emailed: changed.length });
});

// GET /api/orders/admin/invoices?ids=1,2,3 — one PDF with an invoice per
// page, for every PAID order among the ids (unpaid ones are left out).
router.get('/admin/invoices', requireAdmin, async (req, res) => {
  const ids = String(req.query.ids || '').split(',').map(Number).filter(Number.isInteger);
  if (!ids.length) return res.status(400).json({ error: 'Select at least one order.' });
  const { rows: orders } = await query(
    'SELECT * FROM orders WHERE id = ANY($1) AND paid_at IS NOT NULL ORDER BY created_at DESC, id DESC',
    [ids]
  );
  if (!orders.length) return res.status(400).json({ error: 'None of the selected orders has been paid, so there are no invoices to download.' });
  const { rows: items } = await query('SELECT * FROM order_items WHERE order_id = ANY($1) ORDER BY id', [orders.map((o) => o.id)]);
  const { rows: users } = await query('SELECT id, name, email FROM users WHERE id = ANY($1)', [orders.map((o) => o.user_id)]);
  const store = await getStoreInfo();
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="Miladys-Invoices-${orders.length}.pdf"`);
  renderInvoices(res, orders.map((o) => ({ order: o, items: items.filter((i) => i.order_id === o.id), customer: users.find((u) => u.id === o.user_id) })), store);
});

// GET /api/orders/:id/invoice — PDF invoice/receipt for one order.
// Available to the order's own owner or an admin — nobody else, even with
// a guessed order id, since this carries the customer's address and
// payment id.
router.get('/:id/invoice', requireAuth, async (req, res) => {
  const { rows } = await query('SELECT * FROM orders WHERE id = $1', [req.params.id]);
  const order = rows[0];
  if (!order) return res.status(404).json({ error: 'Order not found.' });
  if (order.user_id !== req.user.id && !req.user.isAdmin) {
    return res.status(403).json({ error: 'Not allowed.' });
  }
  // An invoice only makes sense once money has actually moved.
  if (!order.paid_at) {
    return res.status(400).json({ error: 'This order has not been paid yet — no invoice to generate.' });
  }

  const { rows: items } = await query('SELECT * FROM order_items WHERE order_id = $1 ORDER BY id', [order.id]);
  const { rows: userRows } = await query('SELECT name, email FROM users WHERE id = $1', [order.user_id]);

  const store = await getStoreInfo();
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="Miladys-Invoice-${order.id}.pdf"`);
  renderInvoice(res, { order, items, customer: userRows[0] }, store);
});

export default router;
