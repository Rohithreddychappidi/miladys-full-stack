import { Router } from 'express';
import { query, pool } from '../db.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { razorpay, razorpayEnabled, verifyPaymentSignature } from '../lib/razorpay.js';
import { sendOrderConfirmationEmail } from '../lib/email.js';
import { findUsableCoupon, computeDiscount } from './coupons.js';

const router = Router();

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

  const productIds = items.map((i) => i.productId);
  const { rows: products } = await query('SELECT * FROM products WHERE id = ANY($1)', [productIds]);
  const byId = Object.fromEntries(products.map((p) => [p.id, p]));

  let subtotal = 0;
  const lineItems = [];
  for (const { productId, qty } of items) {
    const p = byId[productId];
    if (!p) return res.status(400).json({ error: `Product ${productId} not found.` });
    if (p.stock < qty) return res.status(400).json({ error: `${p.name} is out of stock.` });
    subtotal += p.price * qty;
    lineItems.push({ product: p, qty });
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
  const total = subtotal - discount;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const orderInsert = await client.query(
      `INSERT INTO orders (user_id, status, subtotal, coupon_id, coupon_code, discount, address_name, address_mobile, address_line1, address_city, address_state, address_pincode)
       VALUES ($1,'created',$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [req.user.id, subtotal, coupon?.id || null, coupon?.code || null, discount, address.name, address.mobile, address.line1, address.city, address.state || '', address.pincode]
    );
    const order = orderInsert.rows[0];

    for (const { product, qty } of lineItems) {
      await client.query(
        `INSERT INTO order_items (order_id, product_id, product_name, product_image, price, qty)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [order.id, product.id, product.name, product.image, product.price, qty]
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
    await query(`UPDATE orders SET status = 'failed' WHERE razorpay_order_id = $1`, [razorpay_order_id]);
    return res.status(400).json({ error: 'Payment verification failed.' });
  }

  const { rows } = await query(
    `UPDATE orders SET status = 'paid', razorpay_payment_id = $1, paid_at = now()
     WHERE razorpay_order_id = $2 AND user_id = $3 RETURNING *`,
    [razorpay_payment_id, razorpay_order_id, req.user.id]
  );
  const order = rows[0];
  if (!order) return res.status(404).json({ error: 'Order not found.' });

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
      if (!updated.length) {
        oversold = true;
        await client.query(`UPDATE products SET stock = 0 WHERE id = $1`, [item.product_id]);
      }
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

// GET /api/orders — the logged-in user's own orders, with items + payment status.
router.get('/', requireAuth, async (req, res) => {
  const { rows: orders } = await query('SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC', [req.user.id]);
  const { rows: items } = orders.length
    ? await query('SELECT * FROM order_items WHERE order_id = ANY($1)', [orders.map((o) => o.id)])
    : { rows: [] };
  res.json({ orders: orders.map((o) => ({ ...o, items: items.filter((i) => i.order_id === o.id) })) });
});

// GET /api/orders/admin — every order + payment details, for the admin panel.
router.get('/admin/all', requireAdmin, async (_req, res) => {
  const { rows: orders } = await query(
    `SELECT o.*, u.name AS customer_name, u.email AS customer_email
     FROM orders o JOIN users u ON u.id = o.user_id
     ORDER BY o.created_at DESC`
  );
  const { rows: items } = orders.length
    ? await query('SELECT * FROM order_items WHERE order_id = ANY($1)', [orders.map((o) => o.id)])
    : { rows: [] };
  res.json({ orders: orders.map((o) => ({ ...o, items: items.filter((i) => i.order_id === o.id) })) });
});

export default router;
