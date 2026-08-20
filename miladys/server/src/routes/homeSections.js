import { Router } from 'express';
import { query } from '../db.js';
import { requireAdmin } from '../middleware/auth.js';

const router = Router();

// Public: only enabled sections, in display order — this is what the home
// screen renders from.
router.get('/', async (_req, res) => {
  const { rows } = await query(
    'SELECT * FROM home_sections WHERE enabled = TRUE ORDER BY sort_order ASC'
  );
  res.json({ sections: rows });
});

// Admin: every section including disabled ones, so the CMS can toggle them.
router.get('/all', requireAdmin, async (_req, res) => {
  const { rows } = await query('SELECT * FROM home_sections ORDER BY sort_order ASC');
  res.json({ sections: rows });
});

router.put('/:key', requireAdmin, async (req, res) => {
  const { title, enabled, content, sortOrder } = req.body || {};
  const { rows } = await query(
    `INSERT INTO home_sections (section_key, title, enabled, content, sort_order, updated_at)
     VALUES ($1,$2,$3,$4,$5, now())
     ON CONFLICT (section_key) DO UPDATE SET
       title = COALESCE($2, home_sections.title),
       enabled = COALESCE($3, home_sections.enabled),
       content = COALESCE($4, home_sections.content),
       sort_order = COALESCE($5, home_sections.sort_order),
       updated_at = now()
     RETURNING *`,
    [req.params.key, title ?? null, enabled ?? true, content ? JSON.stringify(content) : '{}', sortOrder ?? 0]
  );
  res.json({ section: rows[0] });
});

router.delete('/:key', requireAdmin, async (req, res) => {
  await query('DELETE FROM home_sections WHERE section_key = $1', [req.params.key]);
  res.json({ ok: true });
});

export default router;
