import { Router } from 'express';
import { query } from '../db.js';
import { requireAdmin } from '../middleware/auth.js';
import { ingestFromRequest, thumbPath } from '../lib/images.js';

const router = Router();

// Columns for every list view — never the gallery (`images`), which only
// the single-product page needs. `colors` is trimmed in mapProductList.
const LIST_COLUMNS = 'id, name, category_id, price, mrp, stock, description, image, colors, active, created_at';
const MAX_LIMIT = 60;
// Star rating from published reviews, for the product page and cards.
const RATING_COLUMNS = `(SELECT ROUND(AVG(r.rating)::numeric, 1)::float FROM reviews r WHERE r.product_id = products.id AND r.status = 'published') AS rating_avg,
  (SELECT COUNT(*)::int FROM reviews r WHERE r.product_id = products.id AND r.status = 'published') AS rating_count`;

// Builds the WHERE clause shared by the public list and the admin list.
function buildFilters({ category, q, exclude, ids }, { includeHidden = false } = {}) {
  const where = [];
  const params = [];
  if (!includeHidden) where.push('active = true');
  if (category) { params.push(category); where.push(`category_id = $${params.length}`); }
  if (q && String(q).trim()) { params.push(`%${String(q).trim()}%`); where.push(`name ILIKE $${params.length}`); }
  if (exclude) { params.push(String(exclude)); where.push(`id <> $${params.length}`); }
  if (ids) {
    params.push(String(ids).split(',').map((s) => s.trim()).filter(Boolean));
    where.push(`id = ANY($${params.length})`);
  }
  return { where: where.length ? `WHERE ${where.join(' AND ')}` : '', params };
}

const SORTS = {
  newest: 'created_at DESC',
  price_asc: 'price ASC, created_at DESC',
  price_desc: 'price DESC, created_at DESC',
};

// Shared list handler. Pagination is opt-in (?page / ?limit) so the
// currently deployed frontend, which calls this with no params, keeps
// getting the whole list — now only a few KB since images are URLs.
async function listProducts(req, res, { includeHidden }) {
  const { where, params } = buildFilters(req.query, { includeHidden });
  const order = SORTS[req.query.sort] || SORTS.newest;
  const paginate = req.query.page !== undefined || req.query.limit !== undefined;
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 12, 1), MAX_LIMIT);
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);

  let sql = `SELECT ${LIST_COLUMNS}, ${RATING_COLUMNS}, COUNT(*) OVER() AS total_count FROM products ${where} ORDER BY ${order}`;
  if (paginate) {
    params.push(limit, (page - 1) * limit);
    sql += ` LIMIT $${params.length - 1} OFFSET $${params.length}`;
  }
  const { rows } = await query(sql, params);
  const total = rows[0] ? Number(rows[0].total_count) : 0;
  const products = rows.map(({ total_count: _t, ...p }) => mapProductList(p));
  const pageInfo = paginate
    ? { page, limit, total, totalPages: Math.ceil(total / limit), hasMore: page * limit < total }
    : { page: 1, limit: total, total, totalPages: 1, hasMore: false };
  res.json({ products, ...pageInfo });
}

// GET /api/products?category=&q=&sort=newest|price_asc|price_desc&page=&limit=&exclude=&ids=
router.get('/', (req, res) => listProducts(req, res, { includeHidden: false }));

// GET /api/products/admin/all — every product regardless of active status.
// Same filters/pagination as above. `image` stays the full cover here (the
// current admin panel copies it into the edit form); `thumb` is the small
// one for list rows.
router.get('/admin/all', requireAdmin, async (req, res) => {
  const { where, params } = buildFilters(req.query, { includeHidden: true });
  const { rows } = await query(`SELECT * FROM products ${where} ORDER BY created_at DESC`, params);
  res.json({ products: rows.map((p) => ({ ...mapProduct(p), thumb: thumbPath(p.image) })) });
});

// GET /api/products/admin/similar?name=&category=&excludeId=
// Live "this might already exist" check for the add-product form. Matches
// on a normalised name (case/spacing/punctuation-insensitive), shared
// words, and identical cover photos.
router.get('/admin/similar', requireAdmin, async (req, res) => {
  const name = String(req.query.name || '');
  const image = String(req.query.image || '');
  if (normaliseName(name).length < 3 && !image) return res.json({ matches: [] });
  const matches = await findSimilar({ name, image, excludeId: req.query.excludeId });
  res.json({ matches });
});

// GET /api/products/admin/:id — one product with all columns, hidden or
// not. The public /:id below 404s for hidden products, which used to make
// the admin edit form load an empty gallery for them (and saving then
// wiped the gallery).
router.get('/admin/:id', requireAdmin, async (req, res) => {
  const { rows } = await query('SELECT * FROM products WHERE id = $1', [req.params.id]);
  if (!rows[0]) return res.status(404).json({ error: 'Product not found.' });
  res.json({ product: mapProduct(rows[0]) });
});

router.get('/:id', async (req, res) => {
  // Admins can open hidden products too (see /admin/:id above).
  const { rows } = req.user?.isAdmin
    ? await query(`SELECT *, ${RATING_COLUMNS} FROM products WHERE id = $1`, [req.params.id])
    : await query(`SELECT *, ${RATING_COLUMNS} FROM products WHERE id = $1 AND active = true`, [req.params.id]);
  if (!rows[0]) return res.status(404).json({ error: 'Product not found.' });
  res.json({ product: mapProduct(rows[0]) });
});

router.post('/', requireAdmin, async (req, res) => {
  const body = await ingestFromRequest(req, req.body || {});
  const { name, category, price, mrp, stock, description, image, images, colors, active, allowDuplicate } = body;
  if (!name?.trim() || !category) return res.status(400).json({ error: 'name and category are required.' });

  // Block exact re-uploads (same name, or the very same cover photo) unless
  // the admin explicitly confirms. Near matches are only surfaced via
  // /admin/similar, not blocked.
  if (!allowDuplicate) {
    const exact = (await findSimilar({ name, image })).filter((m) => m.reason !== 'similar name');
    if (exact.length) {
      const m = exact[0];
      return res.status(409).json({
        error: `Looks like this product already exists: "${m.name}" (${m.reason}). Edit that one instead, or rename this one.`,
        duplicates: exact,
      });
    }
  }

  const id = 'p' + Date.now();
  const { rows } = await query(
    `INSERT INTO products (id, name, category_id, price, mrp, stock, description, image, images, colors, active)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10::jsonb,$11) RETURNING *`,
    [
      id,
      name.trim(),
      category,
      Number(price) || 0,
      Number(mrp) || Number(price) || 0,
      Number(stock) || 0,
      description || '',
      image || '',
      JSON.stringify(Array.isArray(images) ? images : []),
      JSON.stringify(Array.isArray(colors) ? colors : []),
      active !== false,
    ]
  );
  res.status(201).json({ product: mapProduct(rows[0]) });
});

// POST /api/products/:id/duplicate — copies an existing product (details,
// photos, colours) as a new HIDDEN product named "<name> (Copy)", so the
// admin can tweak it and unhide it, instead of re-entering everything.
router.post('/:id/duplicate', requireAdmin, async (req, res) => {
  const { rows: src } = await query('SELECT * FROM products WHERE id = $1', [req.params.id]);
  if (!src[0]) return res.status(404).json({ error: 'Product not found.' });
  const p = src[0];
  const { rows } = await query(
    `INSERT INTO products (id, name, category_id, price, mrp, stock, description, image, images, colors, active)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10::jsonb,false) RETURNING *`,
    ['p' + Date.now(), `${p.name} (Copy)`, p.category_id, p.price, p.mrp, p.stock, p.description, p.image,
      JSON.stringify(p.images || []), JSON.stringify(p.colors || [])]
  );
  res.status(201).json({ product: mapProduct(rows[0]) });
});

router.put('/:id', requireAdmin, async (req, res) => {
  const body = await ingestFromRequest(req, req.body || {});
  const { name, category, price, mrp, stock, description, image, images, colors, active } = body;
  const { rows } = await query(
    `UPDATE products SET
       name = COALESCE($1,name), category_id = COALESCE($2,category_id),
       price = COALESCE($3,price), mrp = COALESCE($4,mrp), stock = COALESCE($5,stock),
       description = COALESCE($6,description), image = COALESCE($7,image),
       images = COALESCE($8::jsonb, images), colors = COALESCE($9::jsonb, colors),
       active = COALESCE($10,active)
     WHERE id = $11 RETURNING *`,
    [
      name,
      category,
      price,
      mrp,
      stock,
      description,
      image,
      images !== undefined ? JSON.stringify(images) : null,
      colors !== undefined ? JSON.stringify(colors) : null,
      active,
      req.params.id,
    ]
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

// List rows: thumbnail cover (`image`), full cover as `image_full`, and
// colour swatches without their photo galleries.
function mapProductList(p) {
  const colors = Array.isArray(p.colors)
    ? p.colors.map((c) => ({
        name: c.name,
        hex: c.hex,
        stock: c.stock,
        image: thumbPath(c.image),
      }))
    : [];
  const thumb = thumbPath(p.image);
  // image_full only when it differs — for a not-yet-migrated data URL it
  // would just be the same multi-hundred-KB string a second time.
  return { ...p, image: thumb, ...(thumb !== p.image && { image_full: p.image }), category: p.category_id, colors };
}

// "Kanjeevaram  Neha!" -> "kanjeevaram neha"
function normaliseName(name) {
  return String(name || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

const STOP_WORDS = new Set(['saree', 'sarees', 'silk', 'with', 'and', 'the', 'copy']);

function nameWords(name) {
  return new Set(normaliseName(name).split(' ').filter((w) => w.length > 2 && !STOP_WORDS.has(w)));
}

// Returns up to 6 existing products that look like the one described.
// reason: 'same name' | 'same photo' | 'similar name'
async function findSimilar({ name, image, excludeId }) {
  const { rows } = await query('SELECT id, name, category_id, price, image, active FROM products');
  const target = normaliseName(name);
  const targetWords = nameWords(name);
  const out = [];
  for (const p of rows) {
    if (excludeId && p.id === excludeId) continue;
    let reason = null;
    if (target && normaliseName(p.name) === target) reason = 'same name';
    else if (image && image.startsWith('/uploads/') && p.image === image) reason = 'same photo';
    else if (targetWords.size) {
      const words = nameWords(p.name);
      const shared = [...targetWords].filter((w) => words.has(w)).length;
      const union = new Set([...targetWords, ...words]).size;
      if (shared && shared / union >= 0.5) reason = 'similar name';
    }
    if (reason) {
      out.push({ id: p.id, name: p.name, category: p.category_id, price: p.price, active: p.active, image: thumbPath(p.image), reason });
    }
  }
  const rank = { 'same name': 0, 'same photo': 1, 'similar name': 2 };
  return out.sort((a, b) => rank[a.reason] - rank[b.reason]).slice(0, 6);
}

export default router;
