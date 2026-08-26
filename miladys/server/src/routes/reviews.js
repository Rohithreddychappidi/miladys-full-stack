import { Router } from 'express';
import { query } from '../db.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = Router();

// GET /api/products/:productId/reviews  — public, plus a rating summary for
// the star average shown on the product card / page.
router.get('/products/:productId/reviews', async (req, res) => {
  const { rows } = await query(
    `SELECT r.id, r.rating, r.comment, r.photos, r.created_at, u.name AS user_name
     FROM reviews r JOIN users u ON u.id = r.user_id
     WHERE r.product_id = $1 AND r.approved = TRUE
     ORDER BY r.created_at DESC`,
    [req.params.productId]
  );
  const count = rows.length;
  const average = count ? rows.reduce((s, r) => s + r.rating, 0) / count : 0;
  res.json({ reviews: rows, summary: { count, average: Math.round(average * 10) / 10 } });
});

router.post('/products/:productId/reviews', requireAuth, async (req, res) => {
  const { rating, comment, photos } = req.body || {};
  const r = Number(rating);
  if (!r || r < 1 || r > 5) return res.status(400).json({ error: 'Rating must be between 1 and 5.' });
  const cleanPhotos = Array.isArray(photos) ? photos.slice(0, 3) : [];

  const { rows } = await query(
    `INSERT INTO reviews (product_id, user_id, rating, comment, photos) VALUES ($1,$2,$3,$4,$5::jsonb)
     RETURNING id, rating, comment, photos, created_at`,
    [req.params.productId, req.user.id, r, (comment || '').trim().slice(0, 1000), JSON.stringify(cleanPhotos)]
  );
  res.status(201).json({ review: { ...rows[0], user_name: req.user.email.split('@')[0] } });
});

// Admin moderation
router.get('/admin/reviews', requireAdmin, async (_req, res) => {
  const { rows } = await query(
    `SELECT r.*, u.name AS user_name, u.email AS user_email, p.name AS product_name
     FROM reviews r
     JOIN users u ON u.id = r.user_id
     JOIN products p ON p.id = r.product_id
     ORDER BY r.created_at DESC`
  );
  res.json({ reviews: rows });
});

router.put('/admin/reviews/:id/approve', requireAdmin, async (req, res) => {
  const { approved } = req.body || {};
  await query('UPDATE reviews SET approved = $1 WHERE id = $2', [approved !== false, req.params.id]);
  res.json({ ok: true });
});

router.delete('/admin/reviews/:id', requireAdmin, async (req, res) => {
  await query('DELETE FROM reviews WHERE id = $1', [req.params.id]);
  res.json({ ok: true });
});

export default router;
