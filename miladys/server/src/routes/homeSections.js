import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { query } from '../db.js';
import { requireAdmin } from '../middleware/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

function processContentVideos(content) {
  if (!content || typeof content !== 'object') return content;
  const clone = JSON.parse(JSON.stringify(content));
  for (const field of ['slides', 'mobileSlides']) {
    if (Array.isArray(clone[field])) {
      clone[field] = clone[field].map((s, idx) => {
        if (s && s.url && typeof s.url === 'string' && s.url.startsWith('data:video/')) {
          const match = /^data:video\/([a-zA-Z0-9]+);base64,(.+)$/.exec(s.url);
          if (match) {
            const ext = match[1] === 'quicktime' ? 'mov' : (match[1] || 'mp4');
            const filename = `hero-video-${Date.now()}-${idx}.${ext}`;
            const filePath = path.join(uploadsDir, filename);
            const buffer = Buffer.from(match[2], 'base64');
            fs.writeFileSync(filePath, buffer);
            return { ...s, url: `/uploads/${filename}` };
          }
        }
        return s;
      });
    }
  }
  return clone;
}

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
// Must be registered BEFORE the public GET /:key below — Express matches
// routes in registration order, and /:key matches any single path segment
// including literally "all", which would otherwise shadow this admin
// route entirely.
router.get('/all', requireAdmin, async (_req, res) => {
  const { rows } = await query('SELECT * FROM home_sections ORDER BY sort_order ASC');
  res.json({ sections: rows });
});

// Public: a single section by key. For anything that only needs ONE
// section's content (e.g. the footer reading social_links) rather than
// the whole home page — GET / returns every enabled section's full
// content in one payload, which includes things like hero video (stored
// raw, since video can't be resized the way photos are; easily several
// MB). Footer.jsx renders on every page site-wide, so before this existed
// it was fetching that entire payload — hero video included — on every
// single page view, not just when someone visited Home.
router.get('/:key', async (req, res) => {
  const { rows } = await query(
    'SELECT * FROM home_sections WHERE section_key = $1 AND enabled = TRUE',
    [req.params.key]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Section not found.' });
  res.json({ section: rows[0] });
});

router.put('/:key', requireAdmin, async (req, res) => {
  const { title, enabled, content, sortOrder } = req.body || {};
  const processedContent = content !== undefined ? processContentVideos(content) : undefined;
  const { rows } = await query(
    `INSERT INTO home_sections (section_key, title, enabled, content, sort_order, updated_at)
     VALUES ($1,$2,$3, COALESCE($4::jsonb, '{}'::jsonb), $5, now())
     ON CONFLICT (section_key) DO UPDATE SET
       title = COALESCE($2, home_sections.title),
       enabled = COALESCE($3, home_sections.enabled),
       content = COALESCE($4::jsonb, home_sections.content),
       sort_order = COALESCE($5, home_sections.sort_order),
       updated_at = now()
     RETURNING *`,
    [req.params.key, title ?? null, enabled ?? true, processedContent !== undefined ? JSON.stringify(processedContent) : null, sortOrder ?? 0]
  );
  res.json({ section: rows[0] });
});

router.delete('/:key', requireAdmin, async (req, res) => {
  await query('DELETE FROM home_sections WHERE section_key = $1', [req.params.key]);
  res.json({ ok: true });
});

export default router;
