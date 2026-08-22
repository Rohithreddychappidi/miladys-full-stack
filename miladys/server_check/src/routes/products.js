import { Router } from 'express';
import { query } from '../db.js';
import { requireAdmin } from '../middleware/auth.js';

const router = Router();

router.get('/', async (req, res) => {
  const { category } = req.query;
  const { rows } = category
    ? await query('SELECT * FROM products WHERE category_id = $1 ORDER BY created_at DESC', [category])
    : await query('SELECT * FROM products ORDER BY created_at DESC');
  res.json({ products: rows.map(mapProduct) });
});

router.get('/:id', async (req, res) => {
  const { rows } = await query('SELECT * FROM products WHERE id = $1', [req.params.id]);
  if (!rows[0]) return res.status(404).json({ error: 'Product not found.' });
  res.json({ product: mapProduct(rows[0]) });
});

router.post('/', requireAdmin, async (req, res) => {
  const { name, category, price, mrp, stock, description, image, images } = req.body || {};
  if (!name?.trim() || !category) return res.status(400).json({ error: 'name and category are required.' });
  const id = 'p' + Date.now();
  const { rows } = await query(
    `INSERT INTO products (id, name, category_id, price, mrp, stock, description, image, images)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb) RETURNING *`,
    [id, name.trim(), category, Number(price) || 0, Number(mrp) || Number(price) || 0, Number(stock) || 0, description || '', image || '', JSON.stringify(Array.isArray(images) ? images : [])]
  );
  res.status(201).json({ product: mapProduct(rows[0]) });
});

router.put('/:id', requireAdmin, async (req, res) => {
  const { name, category, price, mrp, stock, description, image, images } = req.body || {};
  const { rows } = await query(
    `UPDATE products SET
       name = COALESCE($1,name), category_id = COALESCE($2,category_id),
       price = COALESCE($3,price), mrp = COALESCE($4,mrp), stock = COALESCE($5,stock),
       description = COALESCE($6,description), image = COALESCE($7,image),
       images = COALESCE($8::jsonb, images)
     WHERE id = $9 RETURNING *`,
    [name, category, price, mrp, stock, description, image, images !== undefined ? JSON.stringify(images) : null, req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Product not found.' });
  res.json({ product: mapProduct(rows[0]) });
});

router.delete('/:id', requireAdmin, async (req, res) => {
  await query('DELETE FROM products WHERE id = $1', [req.params.id]);
  res.json({ ok: true });
});

function mapProduct(p) {
  return { ...p, category: p.category_id };
}

export default router;
