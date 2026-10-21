import { Router } from 'express';
import { query } from '../db.js';
import { requireAdmin } from '../middleware/auth.js';
import { ingestFromRequest, thumbPath } from '../lib/images.js';

const router = Router();

// Category web address: lower-case letters, numbers and dashes.
const slugify = (v) => String(v || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

// Checks an admin-chosen address (or makes one from the name). Returns
// { slug } or { error }. Must not clash with another category's address
// or id (old links use ids).
async function chooseSlug(wanted, name, exceptId = null) {
  const slug = slugify(wanted || name);
  if (!slug) return { error: 'Enter a web address using letters and numbers.' };
  if (slug.length > 60) return { error: 'The web address is too long (60 characters at most).' };
  const { rows } = await query('SELECT name FROM categories WHERE (slug = $1 OR id = $1) AND id IS DISTINCT FROM $2', [slug, exceptId]);
  if (rows[0]) {
    if (wanted) return { error: `The web address "${slug}" is already used by ${rows[0].name}.` };
    return { slug: `${slug}-${Date.now().toString(36).slice(-4)}` };
  }
  return { slug };
}

router.get('/', async (_req, res) => {
  const { rows } = await query('SELECT * FROM categories WHERE active = true ORDER BY sort_order ASC, created_at ASC');
  // Category cards are ~200-240px wide, so the storefront gets the small
  // variant; the admin list below keeps the full image.
  res.json({ categories: rows.map((c) => ({ ...c, image: thumbPath(c.image) })) });
});

// GET /api/categories/admin/all — every category regardless of active
// status, for the admin panel (which needs to see hidden ones to unhide
// them).
router.get('/admin/all', requireAdmin, async (_req, res) => {
  const { rows } = await query('SELECT * FROM categories ORDER BY sort_order ASC, created_at ASC');
  res.json({ categories: rows });
});

router.post('/', requireAdmin, async (req, res) => {
  const { id, name, image, tagline, sortOrder, slug: wantedSlug } = await ingestFromRequest(req, req.body || {}, { maxDimension: 1600 });
  if (!id?.trim() || !name?.trim()) return res.status(400).json({ error: 'id and name are required.' });
  const { slug, error } = await chooseSlug(wantedSlug, name, id.trim());
  if (error) return res.status(400).json({ error });
  const { rows } = await query(
    `INSERT INTO categories (id, name, image, tagline, sort_order, slug) VALUES ($1,$2,$3,$4,$5,$6)
     ON CONFLICT (id) DO UPDATE SET name=$2, image=$3, tagline=$4, sort_order=$5 RETURNING *`,
    [id.trim(), name.trim(), image || null, tagline || null, sortOrder ?? 0, slug]
  );
  res.status(201).json({ category: rows[0] });
});

// PUT /api/categories/admin/order — { ids: [...] } in the order they should
// appear on the website. One statement, so the order changes all at once.
router.put('/admin/order', requireAdmin, async (req, res) => {
  const ids = Array.isArray(req.body?.ids) ? req.body.ids.map(String) : [];
  if (ids.length === 0) return res.status(400).json({ error: 'ids is required.' });
  await query(
    `UPDATE categories c SET sort_order = o.pos
       FROM unnest($1::text[]) WITH ORDINALITY AS o(id, pos)
      WHERE c.id = o.id`,
    [ids]
  );
  const { rows } = await query('SELECT * FROM categories ORDER BY sort_order ASC, created_at ASC');
  res.json({ categories: rows });
});

router.put('/:id', requireAdmin, async (req, res) => {
  const { name, image, tagline, sortOrder, active, slug: wantedSlug } = await ingestFromRequest(req, req.body || {}, { maxDimension: 1600 });
  let slug = null;
  if (wantedSlug !== undefined) {
    const chosen = await chooseSlug(wantedSlug, name, req.params.id);
    if (chosen.error) return res.status(400).json({ error: chosen.error });
    slug = chosen.slug;
  }
  const { rows } = await query(
    `UPDATE categories SET name = COALESCE($1,name), image = COALESCE($2,image),
       tagline = COALESCE($3,tagline), sort_order = COALESCE($4,sort_order),
       active = COALESCE($5,active), slug = COALESCE($7, slug)
     WHERE id = $6 RETURNING *`,
    [name, image, tagline, sortOrder, active, req.params.id, slug]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Category not found.' });
  res.json({ category: rows[0] });
});

router.delete('/:id', requireAdmin, async (req, res) => {
  await query('DELETE FROM categories WHERE id = $1', [req.params.id]);
  res.json({ ok: true });
});

export default router;
