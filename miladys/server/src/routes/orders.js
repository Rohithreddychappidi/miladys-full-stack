import { Router } from 'express';
import { query, pool } from '../db.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { razorpay, razorpayEnabled, verifyPaymentSignature } from '../lib/razorpay.js';
import { sendOrderConfirmationEmail } from '../lib/email.js';

const router = Router();

// POST /api/orders/create
// Body: { items: [{ productId, qty }], address: {name, mobile, line1, city, state, pincode} }
// Prices are looked up from the DB — never trust a price sent by the client.
router.post('/create', requireAuth, async (req, res) => {
  if (!razorpayEnabled) {
    return res.status(503).json({ error: 'Payments are not configured yet. Add RAZORPAY_KEY_ID/SECRET to server/.env.' });
  }
  const { items, address } = req.body || {};
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

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const orderInsert = await client.query(
      `INSERT INTO orders (user_id, status, subtotal, address_name, address_mobile, address_line1, address_city, address_state, address_pincode)
       VALUES ($1,'created',$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [req.user.id, subtotal, address.name, address.mobile, address.line1, address.city, address.state || '', address.pincode]
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
      amount: subtotal * 100,
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

  // Decrement stock now that payment is confirmed.
  for (const item of items) {
    await query('UPDATE products SET stock = GREATEST(stock - $1, 0) WHERE id = $2', [item.qty, item.product_id]);
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
