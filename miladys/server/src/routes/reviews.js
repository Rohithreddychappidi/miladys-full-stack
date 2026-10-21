import { Router } from 'express';
import { query } from '../db.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { ingestFromRequest } from '../lib/images.js';

const router = Router();

// Who may review: a customer with a paid order containing this saree. One
// review per customer per saree — posting again updates it. Whether new
// reviews wait for approval is set in Admin → Reviews (CMS section
// 'review_settings'); until it's been set, they do.
const PAID = "('paid', 'paid_oversold')";

async function requireApproval() {
  const { rows } = await query("SELECT content FROM home_sections WHERE section_key = 'review_settings'");
  return rows[0]?.content?.requireApproval !== false;
}

async function hasBought(userId, productId) {
  const { rows } = await query(
    `SELECT 1 FROM orders o JOIN order_items i ON i.order_id = o.id
      WHERE o.user_id = $1 AND i.product_id = $2 AND o.status IN ${PAID} LIMIT 1`,
    [userId, productId]
  );
  return rows.length > 0;
}

// `verified` = the reviewer has a paid order for this saree.
const VERIFIED_SQL = `EXISTS (SELECT 1 FROM orders o JOIN order_items i ON i.order_id = o.id
  WHERE o.user_id = r.user_id AND i.product_id = r.product_id AND o.status IN ${PAID}) AS verified`;

// GET /api/products/:productId/reviews — published reviews and the rating
// summary for the product page.
router.get('/products/:productId/reviews', async (req, res) => {
  const { rows } = await query(
    `SELECT r.id, r.rating, r.comment, r.photos, r.created_at, r.updated_at, u.name AS user_name, ${VERIFIED_SQL}
     FROM reviews r JOIN users u ON u.id = r.user_id
     WHERE r.product_id = $1 AND r.status = 'published'
     ORDER BY r.created_at DESC`,
    [req.params.productId]
  );
  const count = rows.length;
  const average = count ? rows.reduce((s, r) => s + r.rating, 0) / count : 0;
  res.json({ reviews: rows, summary: { count, average: Math.round(average * 10) / 10 } });
});

// GET /api/products/:productId/reviews/mine — can this customer review the
// saree, and their existing review (any status) so the form can edit it.
router.get('/products/:productId/reviews/mine', requireAuth, async (req, res) => {
  const [bought, { rows }] = await Promise.all([
    hasBought(req.user.id, req.params.productId),
    query('SELECT id, rating, comment, photos, status, created_at FROM reviews WHERE product_id = $1 AND user_id = $2 ORDER BY created_at DESC LIMIT 1', [req.params.productId, req.user.id]),
  ]);
  res.json({ canReview: bought, review: rows[0] || null });
});

// POST /api/products/:productId/reviews — add or update this customer's review.
router.post('/products/:productId/reviews', requireAuth, async (req, res) => {
  const { rating, comment, photos } = req.body || {};
  const r = Number(rating);
  if (!Number.isInteger(r) || r < 1 || r > 5) return res.status(400).json({ error: 'Rating must be between 1 and 5.' });
  if (!(await hasBought(req.user.id, req.params.productId))) {
    return res.status(403).json({ error: 'Only customers who bought this saree can review it.' });
  }
  // Customer photos: only uploaded images (data URLs, or files already
  // stored via /api/uploads/image) — never arbitrary external URLs.
  const cleanPhotos = (await ingestFromRequest(req, Array.isArray(photos) ? photos.slice(0, 3) : [], { maxDimension: 1600 }))
    .filter((p) => typeof p === 'string' && p.startsWith('/uploads/img/'));
  const status = (await requireApproval()) ? 'pending' : 'published';
  const text = String(comment || '').trim().slice(0, 1000);

  const { rows: existing } = await query('SELECT id FROM reviews WHERE product_id = $1 AND user_id = $2 ORDER BY created_at DESC LIMIT 1', [req.params.productId, req.user.id]);
  const { rows } = existing[0]
    ? await query(
      `UPDATE reviews SET rating = $1, comment = $2, photos = $3::jsonb, status = $4, approved = ($4 = 'published'), updated_at = now()
        WHERE id = $5 RETURNING id, rating, comment, photos, status, created_at, updated_at`,
      [r, text, JSON.stringify(cleanPhotos), status, existing[0].id]
    )
    : await query(
      `INSERT INTO reviews (product_id, user_id, rating, comment, photos, status, approved) VALUES ($1,$2,$3,$4,$5::jsonb,$6,$6 = 'published')
       RETURNING id, rating, comment, photos, status, created_at, updated_at`,
      [req.params.productId, req.user.id, r, text, JSON.stringify(cleanPhotos), status]
    );
  const { rows: u } = await query('SELECT name FROM users WHERE id = $1', [req.user.id]);
  res.status(existing[0] ? 200 : 201).json({ review: { ...rows[0], user_name: u[0]?.name || 'Customer', verified: true }, updated: Boolean(existing[0]) });
});

// Admin moderation
router.get('/admin/reviews', requireAdmin, async (_req, res) => {
  const { rows } = await query(
    `SELECT r.*, u.name AS user_name, u.email AS user_email, p.name AS product_name, ${VERIFIED_SQL}
     FROM reviews r
     JOIN users u ON u.id = r.user_id
     JOIN products p ON p.id = r.product_id
     ORDER BY r.created_at DESC`
  );
  res.json({ reviews: rows, requireApproval: await requireApproval() });
});

router.get('/admin/reviews/pending', requireAdmin, async (_req, res) => {
  const { rows } = await query("SELECT COUNT(*)::int AS n FROM reviews WHERE status = 'pending'");
  res.json({ pending: rows[0].n });
});

// PUT /api/admin/reviews/:id/approve — { approved: true|false } publishes or hides.
router.put('/admin/reviews/:id/approve', requireAdmin, async (req, res) => {
  const publish = req.body?.approved !== false;
  await query('UPDATE reviews SET approved = $1, status = $2 WHERE id = $3', [publish, publish ? 'published' : 'hidden', req.params.id]);
  res.json({ ok: true });
});

// PUT /api/admin/reviews/bulk — { action: 'publish'|'hide'|'delete', ids: [..] }
// or { action: 'publish', allPending: true } for "Approve all".
router.put('/admin/reviews/bulk', requireAdmin, async (req, res) => {
  const { action, ids, allPending } = req.body || {};
  if (!['publish', 'hide', 'delete'].includes(action)) return res.status(400).json({ error: 'Unknown action.' });
  let target;
  if (allPending && action === 'publish') {
    target = "status = 'pending'";
  } else {
    const clean = (Array.isArray(ids) ? ids : []).map(Number).filter(Number.isInteger);
    if (!clean.length) return res.status(400).json({ error: 'Select at least one review.' });
    target = `id = ANY(ARRAY[${clean.join(',')}]::int[])`;
  }
  const { rowCount } = action === 'delete'
    ? await query(`DELETE FROM reviews WHERE ${target}`)
    : await query(`UPDATE reviews SET status = $1, approved = $2 WHERE ${target}`, [action === 'publish' ? 'published' : 'hidden', action === 'publish']);
  res.json({ ok: true, count: rowCount });
});

// PUT /api/admin/reviews/settings — { requireApproval: boolean }
router.put('/admin/reviews/settings', requireAdmin, async (req, res) => {
  const requireApprovalValue = req.body?.requireApproval !== false;
  await query(
    `INSERT INTO home_sections (section_key, title, content, enabled, sort_order)
     VALUES ('review_settings', 'Reviews — settings', $1::jsonb, true, 40)
     ON CONFLICT (section_key) DO UPDATE SET content = EXCLUDED.content, updated_at = now()`,
    [JSON.stringify({ requireApproval: requireApprovalValue })]
  );
  res.json({ requireApproval: requireApprovalValue });
});

router.delete('/admin/reviews/:id', requireAdmin, async (req, res) => {
  await query('DELETE FROM reviews WHERE id = $1', [req.params.id]);
  res.json({ ok: true });
});

export default router;
