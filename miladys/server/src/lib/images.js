// Image storage. Every admin/customer-uploaded photo used to be stored as a
// base64 data URL straight inside Postgres and shipped inside every JSON
// response — 8MB+ for the product list alone, uncacheable by the browser.
//
// Now any incoming `data:image/...` string is decoded, re-encoded with
// sharp as WebP, and written to disk under uploads/img/. Only the short
// path ("/uploads/img/<hash>.webp") is stored in the database. Two
// variants are written per photo:
//   <hash>.webp     full size (product page, zoom, banners)
//   <hash>-sm.webp  small thumbnail (product cards, admin lists, carts)
//
// Filenames are a hash of the original bytes, so the same photo uploaded
// twice is stored once, and the files can be cached forever (immutable).

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const UPLOADS_DIR = path.join(__dirname, '..', '..', 'uploads');
export const IMG_DIR = path.join(UPLOADS_DIR, 'img');
if (!fs.existsSync(IMG_DIR)) fs.mkdirSync(IMG_DIR, { recursive: true });

const IMG_URL_PREFIX = '/uploads/img/';
const DATA_URL_RE = /^data:image\/(png|jpe?g|webp|gif|avif|heic|heif);base64,/i;
const THUMB_WIDTH = 600;
const THUMB_HEIGHT = 900;
const QUALITY = 80;

export function isDataImage(value) {
  return typeof value === 'string' && DATA_URL_RE.test(value);
}

// Writes the full + thumbnail WebP files for one data URL and returns the
// stored path. Already-written hashes are reused, not re-encoded.
export async function storeDataUrl(dataUrl, { maxDimension = 2400 } = {}) {
  const comma = dataUrl.indexOf(',');
  const buffer = Buffer.from(dataUrl.slice(comma + 1), 'base64');
  const hash = crypto.createHash('sha256').update(buffer).digest('hex').slice(0, 24);
  const fullFile = path.join(IMG_DIR, `${hash}.webp`);
  const thumbFile = path.join(IMG_DIR, `${hash}-sm.webp`);

  if (!fs.existsSync(fullFile)) {
    const source = sharp(buffer, { failOn: 'none' }).rotate(); // honour EXIF orientation from phone photos
    await source
      .clone()
      .resize({ width: maxDimension, height: maxDimension, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: QUALITY, effort: 4 })
      .toFile(fullFile + '.tmp');
    fs.renameSync(fullFile + '.tmp', fullFile);
  }
  if (!fs.existsSync(thumbFile)) {
    await sharp(fullFile)
      .resize({ width: THUMB_WIDTH, height: THUMB_HEIGHT, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 76, effort: 4 })
      .toFile(thumbFile + '.tmp');
    fs.renameSync(thumbFile + '.tmp', thumbFile);
  }
  return `${IMG_URL_PREFIX}${hash}.webp`;
}

// The public origin images are served from, e.g. https://api.themiladys.com.
// PUBLIC_URL in .env wins; otherwise it's derived from the request (needs
// `trust proxy` so the https scheme survives Nginx).
export function publicBase(req) {
  if (process.env.PUBLIC_URL) return process.env.PUBLIC_URL.replace(/\/+$/, '');
  return `${req.protocol}://${req.get('host')}`;
}

// "/uploads/img/abc.webp" -> "/uploads/img/abc-sm.webp". Anything else
// (external URLs, legacy data URLs not yet migrated) is returned as-is.
export function thumbPath(value) {
  if (typeof value !== 'string' || !value.startsWith(IMG_URL_PREFIX) || value.endsWith('-sm.webp')) return value;
  return value.replace(/\.webp$/, '-sm.webp');
}

// Walks any JSON value and rewrites every string with `fn(str, { isVideo })`.
// `isVideo` is true for the `url` of objects with `type: 'video'` (hero
// video slides), which must never go through the image encoder.
async function mapStringsAsync(value, fn, isVideo = false) {
  if (typeof value === 'string') return fn(value, { isVideo });
  if (Array.isArray(value)) {
    const out = [];
    for (const item of value) out.push(await mapStringsAsync(item, fn));
    return out;
  }
  if (value && typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = await mapStringsAsync(v, fn, value.type === 'video' && k === 'url');
    }
    return out;
  }
  return value;
}

export function mapStrings(value, fn) {
  if (typeof value === 'string') return fn(value);
  if (Array.isArray(value)) return value.map((v) => mapStrings(v, fn));
  if (value && typeof value === 'object' && !(value instanceof Date) && !Buffer.isBuffer(value)) {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = mapStrings(v, fn);
    return out;
  }
  return value;
}

// Prepares an incoming value for storage: data URLs become files, and
// absolute URLs pointing back at our own /uploads (which is what the API
// now returns, and so what the admin panel sends back on edit) are
// stored as relative paths again. Thumbnails sent back are mapped to the
// full image so a cover never gets downgraded to its thumbnail.
// `base` is this API's public origin (see publicBase) — only URLs on that
// origin are made relative, never someone else's.
export async function ingestImages(value, { base, maxDimension = 2400, stats } = {}) {
  return mapStringsAsync(value, async (s, { isVideo }) => {
    if (!isVideo && isDataImage(s)) {
      const before = s.length;
      const stored = await storeDataUrl(s, { maxDimension });
      if (stats) { stats.count += 1; stats.bytesBefore += before; }
      return stored;
    }
    if (base && s.startsWith(base + '/uploads/')) s = s.slice(base.length);
    if (s.startsWith(IMG_URL_PREFIX) && s.endsWith('-sm.webp')) s = s.replace(/-sm\.webp$/, '.webp');
    return s;
  });
}

// Route helper: ingestImages with this request's public origin filled in.
export function ingestFromRequest(req, value, opts) {
  return ingestImages(value, { ...opts, base: publicBase(req) });
}

// Express middleware: every JSON response has its relative /uploads/...
// paths turned into absolute URLs, so <img src> works from the frontend's
// own domain without each route having to remember to do it.
export function absoluteUploadUrls(req, res, next) {
  const json = res.json.bind(res);
  res.json = (body) => {
    const base = publicBase(req);
    return json(mapStrings(body, (s) => (s.startsWith('/uploads/') ? base + s : s)));
  };
  next();
}
