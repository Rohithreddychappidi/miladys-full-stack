// One-off cleanup script for images that were uploaded BEFORE the
// admin-panel compression fix went in. That fix only shrinks images from
// the moment it was deployed onward — everything already sitting in the
// database is still full-size, uncompressed base64, which is what's
// still making /api/products and /api/categories slow (or, once the
// response gets big enough, time out and fail to load at all).
//
// This walks every table that can hold an admin-uploaded photo, finds any
// base64 image data still oversized, and shrinks it in place — same
// resize + JPEG re-encode the admin panel now does automatically on
// upload, just applied retroactively. Video slides are left untouched
// (can't be resized this way).
//
// Usage (on the VPS, from server/):
//   npm install            # picks up the new "sharp" dependency
//   node src/scripts/recompress-images.js
//
// Safe to re-run — already-small images are skipped, and it only ever
// touches the *(cover/photo) columns, never anything else in a row.

import sharp from 'sharp';
import { pool } from '../db.js';

const MAX_DIMENSION = 1600;
const QUALITY = 82;
// Skip images already smaller than this — no point re-encoding something
// that isn't part of the problem.
const SKIP_UNDER_BYTES = 150 * 1024;

const DATA_URL_RE = /^data:image\/(png|jpe?g|jpg|webp|gif);base64,(.+)$/i;

async function compressDataUrl(dataUrl, maxDimension = MAX_DIMENSION) {
  const match = DATA_URL_RE.exec(dataUrl);
  if (!match) return { value: dataUrl, changed: false }; // not a base64 image (e.g. already a hosted URL) — leave alone
  const buffer = Buffer.from(match[2], 'base64');
  if (buffer.byteLength < SKIP_UNDER_BYTES) return { value: dataUrl, changed: false };

  const out = await sharp(buffer)
    .resize({ width: maxDimension, height: maxDimension, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: QUALITY })
    .toBuffer();

  // Only keep the recompressed version if it's actually smaller — a tiny
  // or already-efficient source image can occasionally come out larger
  // after JPEG re-encoding, and there's no reason to keep that.
  if (out.byteLength >= buffer.byteLength) return { value: dataUrl, changed: false };
  return { value: `data:image/jpeg;base64,${out.toString('base64')}`, changed: true, before: buffer.byteLength, after: out.byteLength };
}

// Recursively walks any JSON-ish value (string / array / object) looking
// for base64 image strings to compress. Skips the `url` field of any
// object shaped like a hero slide with `type: 'video'`, since those can't
// go through this resize.
async function compressValue(value, maxDimension, stats) {
  if (typeof value === 'string') {
    const { value: next, changed, before, after } = await compressDataUrl(value, maxDimension);
    if (changed) {
      stats.count += 1;
      stats.bytesBefore += before;
      stats.bytesAfter += after;
    }
    return next;
  }
  if (Array.isArray(value)) {
    const out = [];
    for (const item of value) out.push(await compressValue(item, maxDimension, stats));
    return out;
  }
  if (value && typeof value === 'object') {
    const isVideoSlide = value.type === 'video';
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = isVideoSlide && k === 'url' ? v : await compressValue(v, maxDimension, stats);
    }
    return out;
  }
  return value;
}

async function run() {
  const stats = { count: 0, bytesBefore: 0, bytesAfter: 0 };

  // --- products: cover image + gallery array ---
  const { rows: products } = await pool.query('SELECT id, image, images FROM products');
  for (const p of products) {
    const newImage = await compressValue(p.image, MAX_DIMENSION, stats);
    const newImages = await compressValue(p.images, MAX_DIMENSION, stats);
    if (newImage !== p.image || JSON.stringify(newImages) !== JSON.stringify(p.images)) {
      await pool.query('UPDATE products SET image = $1, images = $2::jsonb WHERE id = $3', [newImage, JSON.stringify(newImages), p.id]);
      console.log(`  product ${p.id} updated`);
    }
  }

  // --- categories: cover image only, shown small so cap it tighter ---
  const { rows: categories } = await pool.query('SELECT id, image FROM categories');
  for (const c of categories) {
    const newImage = await compressValue(c.image, 1200, stats);
    if (newImage !== c.image) {
      await pool.query('UPDATE categories SET image = $1 WHERE id = $2', [newImage, c.id]);
      console.log(`  category ${c.id} updated`);
    }
  }

  // --- testimonials: small avatar photo ---
  const { rows: testimonials } = await pool.query('SELECT id, photo FROM testimonials');
  for (const t of testimonials) {
    const newPhoto = await compressValue(t.photo, 600, stats);
    if (newPhoto !== t.photo) {
      await pool.query('UPDATE testimonials SET photo = $1 WHERE id = $2', [newPhoto, t.id]);
      console.log(`  testimonial ${t.id} updated`);
    }
  }

  // --- customer review photos ---
  const { rows: reviews } = await pool.query('SELECT id, photos FROM reviews');
  for (const r of reviews) {
    const newPhotos = await compressValue(r.photos, 1200, stats);
    if (JSON.stringify(newPhotos) !== JSON.stringify(r.photos)) {
      await pool.query('UPDATE reviews SET photos = $1::jsonb WHERE id = $2', [JSON.stringify(newPhotos), r.id]);
      console.log(`  review ${r.id} updated`);
    }
  }

  // --- home page CMS sections: hero slides (images only, not video),
  // story photo, about-page gallery, etc. — whatever shape `content` is,
  // compressValue walks it and only touches base64 image strings it finds. ---
  const { rows: sections } = await pool.query('SELECT section_key, content FROM home_sections');
  for (const s of sections) {
    const newContent = await compressValue(s.content, 2000, stats);
    if (JSON.stringify(newContent) !== JSON.stringify(s.content)) {
      await pool.query('UPDATE home_sections SET content = $1::jsonb WHERE section_key = $2', [JSON.stringify(newContent), s.section_key]);
      console.log(`  home section "${s.section_key}" updated`);
    }
  }

  const savedMb = (stats.bytesBefore - stats.bytesAfter) / (1024 * 1024);
  console.log(`\nDone. Recompressed ${stats.count} image(s), saved ~${savedMb.toFixed(1)}MB total.`);
  await pool.end();
}

run().catch((err) => {
  console.error('Recompress script failed:', err);
  process.exit(1);
});
