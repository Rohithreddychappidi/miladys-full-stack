import { Router } from 'express';
import { query } from '../db.js';

const router = Router();

const SITE_URL = 'https://www.themiladys.com';

function escapeXml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function urlEntry(loc, { lastmod, changefreq, priority } = {}) {
  return [
    '  <url>',
    `    <loc>${escapeXml(loc)}</loc>`,
    lastmod ? `    <lastmod>${lastmod}</lastmod>` : null,
    changefreq ? `    <changefreq>${changefreq}</changefreq>` : null,
    priority !== undefined ? `    <priority>${priority}</priority>` : null,
    '  </url>',
  ].filter(Boolean).join('\n');
}

// GET /sitemap.xml — generated fresh on every request from live data, so
// newly added products/categories show up automatically with no manual
// regeneration step or build-time step required.
router.get('/sitemap.xml', async (_req, res) => {
  try {
    const [{ rows: products }, { rows: categories }] = await Promise.all([
      query('SELECT id, created_at FROM products ORDER BY created_at DESC'),
      query('SELECT id FROM categories ORDER BY sort_order ASC'),
    ]);

    const staticUrls = [
      urlEntry(`${SITE_URL}/`, { changefreq: 'daily', priority: '1.0' }),
      urlEntry(`${SITE_URL}/products`, { changefreq: 'daily', priority: '0.9' }),
      urlEntry(`${SITE_URL}/about`, { changefreq: 'monthly', priority: '0.5' }),
      urlEntry(`${SITE_URL}/contact`, { changefreq: 'monthly', priority: '0.4' }),
    ];

    const categoryUrls = categories.map((c) =>
      urlEntry(`${SITE_URL}/products?category=${encodeURIComponent(c.id)}`, {
        changefreq: 'weekly',
        priority: '0.7',
      })
    );

    const productUrls = products.map((p) =>
      urlEntry(`${SITE_URL}/products/${encodeURIComponent(p.id)}`, {
        lastmod: p.created_at ? new Date(p.created_at).toISOString().slice(0, 10) : undefined,
        changefreq: 'weekly',
        priority: '0.8',
      })
    );

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${[...staticUrls, ...categoryUrls, ...productUrls].join('\n')}
</urlset>`;

    res.set('Content-Type', 'application/xml');
    res.send(xml);
  } catch (err) {
    console.error('[sitemap] failed to generate', err);
    res.status(500).send('Could not generate sitemap.');
  }
});

export default router;
