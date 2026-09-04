import { Router } from 'express';
import { query } from '../db.js';
import { requireAdmin } from '../middleware/auth.js';

const router = Router();

router.get('/', async (req, res) => {
  const { category } = req.query;
  // The collection grid only ever shows the cover thumbnail (`image`) per
  // card — it never touches `images` (the full per-product photo gallery,
  // shown only on the single-product detail page). That gallery column is
  // JSONB full of base64 data URLs (every admin-uploaded photo, raw and
  // uncompressed), so a `SELECT *` here was shipping every gallery photo
  // of every product on every visit to /products — often tens of MB of
  // JSON that has to fully download and parse before the grid can even
  // start rendering, and unlike normal <img> URLs, data URLs don't get
  // browser HTTP image caching either. Excluding it here (the detail
  // route below still selects it, where it's actually needed) is what
  // was making the collection page feel slow on every device equally —
  // it was never a device/rendering issue, it was payload size.
  const listColumns = 'id, name, category_id, price, mrp, stock, description, image, created_at';
  const { rows } = category
    ? await query(`SELECT ${listColumns} FROM products WHERE category_id = $1 ORDER BY created_at DESC`, [category])
    : await query(`SELECT ${listColumns} FROM products ORDER BY created_at DESC`);
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
