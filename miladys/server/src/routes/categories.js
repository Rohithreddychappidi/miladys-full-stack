import { Router } from 'express';
import { query } from '../db.js';
import { requireAdmin } from '../middleware/auth.js';

const router = Router();

router.get('/', async (_req, res) => {
  const { rows } = await query('SELECT * FROM categories ORDER BY sort_order ASC, created_at ASC');
  res.json({ categories: rows });
});

router.post('/', requireAdmin, async (req, res) => {
  const { id, name, image, tagline, sortOrder } = req.body || {};
  if (!id?.trim() || !name?.trim()) return res.status(400).json({ error: 'id and name are required.' });
  const { rows } = await query(
    `INSERT INTO categories (id, name, image, tagline, sort_order) VALUES ($1,$2,$3,$4,$5)
     ON CONFLICT (id) DO UPDATE SET name=$2, image=$3, tagline=$4, sort_order=$5 RETURNING *`,
    [id.trim(), name.trim(), image || null, tagline || null, sortOrder ?? 0]
  );
  res.status(201).json({ category: rows[0] });
});

router.put('/:id', requireAdmin, async (req, res) => {
  const { name, image, tagline, sortOrder } = req.body || {};
  const { rows } = await query(
    `UPDATE categories SET name = COALESCE($1,name), image = COALESCE($2,image),
       tagline = COALESCE($3,tagline), sort_order = COALESCE($4,sort_order)
     WHERE id = $5 RETURNING *`,
    [name, image, tagline, sortOrder, req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Category not found.' });
  res.json({ category: rows[0] });
});

router.delete('/:id', requireAdmin, async (req, res) => {
  await query('DELETE FROM categories WHERE id = $1', [req.params.id]);
  res.json({ ok: true });
});

export default router;
