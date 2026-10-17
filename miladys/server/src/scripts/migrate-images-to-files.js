// One-off migration: moves every base64 image still stored inside the
// database out to WebP files under uploads/img/ (see lib/images.js), and
// replaces it in the row with the file's path. After this the API ships
// image URLs instead of megabytes of embedded image data.
//
// Usage (on the VPS, from server/):
//   pg_dump "$DATABASE_URL" -Fc -f ~/miladys-before-images.dump   # backup first!
//   node src/scripts/migrate-images-to-files.js            # dry run: reports only
//   node src/scripts/migrate-images-to-files.js --apply    # writes files + updates rows
//
// Safe to re-run: rows with no data URLs left are skipped, and identical
// photos map to the same file (content-hashed), so nothing is duplicated.
// Hero *videos* are left alone (homeSections.js already writes those to disk).

import { pool } from '../db.js';
import { ingestImages, isDataImage } from '../lib/images.js';

const APPLY = process.argv.includes('--apply');

// table, primary key, image-bearing columns (json = JSONB), max dimension
const TARGETS = [
  { table: 'products', key: 'id', columns: [['image'], ['images', 'json'], ['colors', 'json']], max: 2400 },
  { table: 'categories', key: 'id', columns: [['image']], max: 1600 },
  { table: 'testimonials', key: 'id', columns: [['photo']], max: 800 },
  { table: 'reviews', key: 'id', columns: [['photos', 'json']], max: 1600 },
  { table: 'home_sections', key: 'section_key', columns: [['content', 'json']], max: 2400 },
  { table: 'order_items', key: 'id', columns: [['product_image']], max: 2400, thumb: true },
];

function containsDataImage(value) {
  if (typeof value === 'string') return isDataImage(value);
  if (Array.isArray(value)) return value.some(containsDataImage);
  if (value && typeof value === 'object') return Object.values(value).some(containsDataImage);
  return false;
}

function mb(bytes) {
  return (bytes / (1024 * 1024)).toFixed(1) + 'MB';
}

async function run() {
  console.log(APPLY ? 'APPLYING migration\n' : 'DRY RUN — nothing will be changed (pass --apply to run it for real)\n');
  const totals = { rows: 0, images: 0, bytes: 0 };

  for (const t of TARGETS) {
    const cols = t.columns.map(([c]) => c);
    // Only fetch rows that actually still contain a data URL (text match on
    // the column cast to text), so re-runs are quick.
    const filter = cols.map((c) => `${c}::text LIKE '%data:image/%'`).join(' OR ');
    const { rows } = await pool.query(`SELECT ${t.key}, ${cols.join(', ')} FROM ${t.table} WHERE ${filter}`);
    let tableImages = 0;
    let tableBytes = 0;

    for (const row of rows) {
      const stats = { count: 0, bytesBefore: 0 };
      const updates = {};
      for (const [col] of t.columns) {
        if (!containsDataImage(row[col])) continue;
        if (APPLY) {
          let next = await ingestImages(row[col], { maxDimension: t.max, stats });
          // Order line items only ever show a small thumbnail.
          if (t.thumb && typeof next === 'string') next = next.replace(/\.webp$/, '-sm.webp');
          updates[col] = next;
        } else {
          countDataImages(row[col], stats);
        }
      }
      tableImages += stats.count;
      tableBytes += stats.bytesBefore;

      if (APPLY && Object.keys(updates).length) {
        const sets = [];
        const params = [];
        for (const [col, kind] of t.columns) {
          if (!(col in updates)) continue;
          params.push(kind === 'json' ? JSON.stringify(updates[col]) : updates[col]);
          sets.push(`${col} = $${params.length}${kind === 'json' ? '::jsonb' : ''}`);
        }
        params.push(row[t.key]);
        await pool.query(`UPDATE ${t.table} SET ${sets.join(', ')} WHERE ${t.key} = $${params.length}`, params);
      }
    }

    console.log(`${t.table.padEnd(14)} ${String(rows.length).padStart(4)} row(s), ${String(tableImages).padStart(4)} embedded image(s), ${mb(tableBytes)}`);
    totals.rows += rows.length;
    totals.images += tableImages;
    totals.bytes += tableBytes;
  }

  console.log(`\nTotal: ${totals.images} image(s) in ${totals.rows} row(s), ${mb(totals.bytes)} of embedded data.`);
  console.log(APPLY ? 'Done. Files are in server/uploads/img/.' : 'Dry run only. Re-run with --apply to migrate.');
  await pool.end();
}

function countDataImages(value, stats) {
  if (typeof value === 'string') {
    if (isDataImage(value)) { stats.count += 1; stats.bytesBefore += value.length; }
  } else if (Array.isArray(value)) value.forEach((v) => countDataImages(v, stats));
  else if (value && typeof value === 'object') Object.values(value).forEach((v) => countDataImages(v, stats));
}

run().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
