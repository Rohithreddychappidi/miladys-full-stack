import { Router } from 'express';
import { query } from '../db.js';
import { requireAdmin } from '../middleware/auth.js';

const router = Router();

// GET /api/cancellation-policy — public. Sorted so the fastest/most
// generous tier shows first, matching how it reads on the product page.
router.get('/', async (_req, res) => {
  const { rows } = await query('SELECT * FROM cancellation_policy ORDER BY max_days ASC');
  res.json({ policy: rows });
});

router.post('/', requireAdmin, async (req, res) => {
  const { label, maxDays, refundPercent, sortOrder } = req.body || {};
  if (!label?.trim()) return res.status(400).json({ error: 'A label is required, e.g. "Within 24 hours".' });
  const days = Number(maxDays);
  const percent = Number(refundPercent);
  if (!Number.isFinite(days) || days < 0) return res.status(400).json({ error: 'Enter a valid number of days.' });
  if (!Number.isFinite(percent) || percent < 0 || percent > 100) return res.status(400).json({ error: 'Refund percent must be between 0 and 100.' });

  const { rows } = await query(
    `INSERT INTO cancellation_policy (label, max_days, refund_percent, sort_order) VALUES ($1,$2,$3,$4) RETURNING *`,
    [label.trim(), days, percent, Number(sortOrder) || 0]
  );
  res.status(201).json({ tier: rows[0] });
});

router.put('/:id', requireAdmin, async (req, res) => {
  const { label, maxDays, refundPercent, sortOrder } = req.body || {};
  const { rows } = await query(
    `UPDATE cancellation_policy SET
       label = COALESCE($1,label), max_days = COALESCE($2,max_days),
       refund_percent = COALESCE($3,refund_percent), sort_order = COALESCE($4,sort_order)
     WHERE id = $5 RETURNING *`,
    [label, maxDays !== undefined ? Number(maxDays) : null, refundPercent !== undefined ? Number(refundPercent) : null, sortOrder !== undefined ? Number(sortOrder) : null, req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Policy tier not found.' });
  res.json({ tier: rows[0] });
});

router.delete('/:id', requireAdmin, async (req, res) => {
  await query('DELETE FROM cancellation_policy WHERE id = $1', [req.params.id]);
  res.json({ ok: true });
});

export default router;

// Shared with orders.js — finds the tier an order still qualifies for
// based on whole days elapsed since payment. Tiers are evaluated in
// ascending max_days order; the first one the order fits under wins.
export async function findApplicableTier(daysSincePaid) {
  const { rows } = await query('SELECT * FROM cancellation_policy ORDER BY max_days ASC');
  return rows.find((tier) => daysSincePaid <= tier.max_days) || null;
}
