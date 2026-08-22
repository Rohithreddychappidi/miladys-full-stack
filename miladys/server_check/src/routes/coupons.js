import { Router } from 'express';
import { query } from '../db.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = Router();

function computeDiscount(coupon, subtotal) {
  const raw = coupon.type === 'flat' ? coupon.value : Math.round((subtotal * coupon.value) / 100);
  return Math.max(0, Math.min(raw, subtotal)); // never discount below ₹0 or more than the subtotal
}

async function findUsableCoupon(code, userId) {
  const { rows } = await query('SELECT * FROM coupons WHERE code = $1', [String(code || '').trim().toUpperCase()]);
  const coupon = rows[0];
  if (!coupon) return { error: 'Invalid coupon code.' };
  if (!coupon.active) return { error: 'This coupon is no longer active.' };
  if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) return { error: 'This coupon has expired.' };

  const { rows: used } = await query(
    'SELECT 1 FROM coupon_redemptions WHERE coupon_id = $1 AND user_id = $2',
    [coupon.id, userId]
  );
  if (used.length) return { error: "You've already used this coupon." };

  return { coupon };
}

// POST /api/coupons/validate — checked when the customer clicks "Apply" on
// the cart/checkout page. Doesn't reserve or redeem anything yet; the
// redemption only gets recorded once payment is confirmed (see
// orders.js /verify), so re-checking the same code before paying is fine.
router.post('/validate', requireAuth, async (req, res) => {
  const { code, subtotal } = req.body || {};
  if (!code) return res.status(400).json({ error: 'Enter a coupon code.' });

  const { coupon, error } = await findUsableCoupon(code, req.user.id);
  if (error) return res.status(400).json({ error });

  const sub = Number(subtotal) || 0;
  if (coupon.min_order && sub < coupon.min_order) {
    return res.status(400).json({ error: `This coupon needs a minimum order of ₹${coupon.min_order}.` });
  }

  const discount = computeDiscount(coupon, sub);
  res.json({
    valid: true,
    code: coupon.code,
    type: coupon.type,
    value: coupon.value,
    discount,
  });
});

// --- Admin CRUD ---

router.get('/', requireAdmin, async (_req, res) => {
  const { rows } = await query('SELECT * FROM coupons ORDER BY created_at DESC');
  res.json({ coupons: rows });
});

router.post('/', requireAdmin, async (req, res) => {
  const { code, type, value, minOrder, expiresAt, active } = req.body || {};
  const cleanCode = String(code || '').trim().toUpperCase();
  if (!cleanCode) return res.status(400).json({ error: 'Coupon code is required.' });
  if (!['percent', 'flat'].includes(type)) return res.status(400).json({ error: 'Type must be percent or flat.' });
  const numValue = Number(value);
  if (!numValue || numValue <= 0) return res.status(400).json({ error: 'Enter a discount value greater than 0.' });
  if (type === 'percent' && numValue > 100) return res.status(400).json({ error: 'Percent discount cannot exceed 100.' });

  try {
    const { rows } = await query(
      `INSERT INTO coupons (code, type, value, min_order, active, expires_at)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [cleanCode, type, numValue, Number(minOrder) || 0, active !== false, expiresAt || null]
    );
    res.status(201).json({ coupon: rows[0] });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'A coupon with this code already exists.' });
    throw err;
  }
});

router.put('/:id', requireAdmin, async (req, res) => {
  const { code, type, value, minOrder, expiresAt, active } = req.body || {};
  const { rows } = await query(
    `UPDATE coupons SET
       code = COALESCE($1, code),
       type = COALESCE($2, type),
       value = COALESCE($3, value),
       min_order = COALESCE($4, min_order),
       expires_at = COALESCE($5, expires_at),
       active = COALESCE($6, active)
     WHERE id = $7 RETURNING *`,
    [
      code ? String(code).trim().toUpperCase() : null,
      type || null,
      value !== undefined ? Number(value) : null,
      minOrder !== undefined ? Number(minOrder) : null,
      expiresAt !== undefined ? expiresAt : null,
      active !== undefined ? active : null,
      req.params.id,
    ]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Coupon not found.' });
  res.json({ coupon: rows[0] });
});

router.delete('/:id', requireAdmin, async (req, res) => {
  await query('DELETE FROM coupons WHERE id = $1', [req.params.id]);
  res.json({ ok: true });
});

export default router;
export { findUsableCoupon, computeDiscount };
