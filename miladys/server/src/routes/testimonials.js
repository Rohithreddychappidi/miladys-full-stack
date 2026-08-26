import { Router } from 'express';
import { query } from '../db.js';
import { requireAdmin } from '../middleware/auth.js';

const router = Router();

// GET /api/testimonials — public. Pass ?productId=xxx for a specific
// product's testimonials, or leave it off for the general homepage band
// (product_id IS NULL rows), or ?all=1 for every active testimonial.
router.get('/', async (req, res) => {
  const { productId, all } = req.query;
  let sql = 'SELECT * FROM testimonials WHERE active = TRUE';
  const params = [];
  if (all) {
    // no product filter
  } else if (productId) {
    params.push(productId);
    sql += ` AND product_id = $${params.length}`;
  } else {
    sql += ' AND product_id IS NULL';
  }
  sql += ' ORDER BY sort_order ASC, created_at DESC';
  const { rows } = await query(sql, params);
  res.json({ testimonials: rows });
});

// --- Admin CRUD ---

router.get('/admin/all', requireAdmin, async (_req, res) => {
  const { rows } = await query('SELECT * FROM testimonials ORDER BY sort_order ASC, created_at DESC');
  res.json({ testimonials: rows });
});

router.post('/', requireAdmin, async (req, res) => {
  const { productId, name, rating, text, photo, active, sortOrder } = req.body || {};
  if (!name?.trim() || !text?.trim()) return res.status(400).json({ error: 'Name and testimonial text are required.' });
  const { rows } = await query(
    `INSERT INTO testimonials (product_id, name, rating, text, photo, active, sort_order)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [productId || null, name.trim(), Number(rating) || 5, text.trim(), photo || null, active !== false, Number(sortOrder) || 0]
  );
  res.status(201).json({ testimonial: rows[0] });
});

router.put('/:id', requireAdmin, async (req, res) => {
  const { productId, name, rating, text, photo, active, sortOrder } = req.body || {};
  const { rows } = await query(
    `UPDATE testimonials SET
       product_id = $1, name = COALESCE($2,name), rating = COALESCE($3,rating),
       text = COALESCE($4,text), photo = $5, active = COALESCE($6,active), sort_order = COALESCE($7,sort_order)
     WHERE id = $8 RETURNING *`,
    [productId || null, name, rating ? Number(rating) : null, text, photo || null, active, sortOrder !== undefined ? Number(sortOrder) : null, req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Testimonial not found.' });
  res.json({ testimonial: rows[0] });
});

router.delete('/:id', requireAdmin, async (req, res) => {
  await query('DELETE FROM testimonials WHERE id = $1', [req.params.id]);
  res.json({ ok: true });
});

export default router;
