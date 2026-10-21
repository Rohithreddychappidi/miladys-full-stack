import 'dotenv/config';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import express from 'express';
import cors from 'cors';
import compression from 'compression';
import { ensureSchema } from './db.js';
import { startReviewReminders } from './lib/reviewReminders.js';
import { startPaymentChecks } from './lib/payments.js';
import { attachUser } from './middleware/auth.js';
import { absoluteUploadUrls, IMG_DIR } from './lib/images.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

import authRoutes from './routes/auth.js';
import categoryRoutes from './routes/categories.js';
import productRoutes from './routes/products.js';
import homeSectionRoutes from './routes/homeSections.js';
import reviewRoutes from './routes/reviews.js';
import orderRoutes, { razorpayWebhook } from './routes/orders.js';
import couponRoutes from './routes/coupons.js';
import testimonialRoutes from './routes/testimonials.js';
import cancellationPolicyRoutes from './routes/cancellationPolicy.js';
import sitemapRoutes from './routes/sitemap.js';
import uploadRoutes from './routes/uploads.js';
import contactRoutes from './routes/contact.js';

const app = express();
// Behind Nginx — lets req.protocol report https (used to build absolute
// image URLs when PUBLIC_URL isn't set) and req.ip the visitor's address.
app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(compression());

// Standard protective headers. Images and videos here are shown on the
// themiladys.com pages, so they must stay loadable cross-origin.
app.use((_req, res, next) => {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'Cross-Origin-Resource-Policy': 'cross-origin',
  });
  next();
});

// CLIENT_URL can be a single origin or a comma-separated list — handy once
// you're on Vercel, since preview deployments get their own throwaway URL
// alongside your main production domain.
const allowedOrigins = (process.env.CLIENT_URL || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    // No Origin header (curl, server-to-server, Razorpay webhook) — allow.
    if (!origin) return callback(null, true);
    if (!allowedOrigins.length) return callback(null, true); // CLIENT_URL unset — allow all (dev convenience)
    if (allowedOrigins.includes(origin)) return callback(null, true);
    // Log the exact origin that got rejected — without this, "Not allowed
    // by CORS" in the logs gives no way to tell whether it's a legitimate
    // domain that's missing from CLIENT_URL or just background bot/scanner
    // noise (which every public API gets constantly and can be ignored).
    console.warn(`[cors] rejected origin: ${origin} — allowed: ${allowedOrigins.join(', ')}`);
    callback(new Error('Not allowed by CORS'));
  },
}));
// Razorpay's payment notifications: signed over the raw body, so this is
// registered before the JSON parser.
app.post('/api/orders/webhook', express.raw({ type: '*/*', limit: '1mb' }), razorpayWebhook);

// Request size: photos and videos are sent as base64, which is about a
// third larger than the file, so this needs headroom (~15 MB files).
app.use(express.json({ limit: '20mb' }));
app.use(attachUser);
app.use(absoluteUploadUrls);

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.use(sitemapRoutes);

// Product/category/etc. photos. Filenames are content hashes, so a given
// URL never changes content — safe to cache for a year. (In production
// Nginx serves /uploads directly; this is the fallback and for local dev.)
app.use('/uploads/img', express.static(IMG_DIR, {
  immutable: true,
  maxAge: '365d',
  fallthrough: false,
}));
app.use('/uploads', express.static(uploadsDir, {
  maxAge: '30d',
  setHeaders(res) {
    res.setHeader('Accept-Ranges', 'bytes');
  },
}));

app.use('/api/uploads', uploadRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/products', productRoutes);
app.use('/api/home-sections', homeSectionRoutes);
app.use('/api', reviewRoutes); // mounts /api/products/:id/reviews and /api/admin/reviews
app.use('/api/orders', orderRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/testimonials', testimonialRoutes);
app.use('/api/cancellation-policy', cancellationPolicyRoutes);

app.use((err, _req, res, _next) => {
  // e.g. a missing /uploads/img file — a plain 404, not a logged server error.
  if (err.status === 404 || err.statusCode === 404) return res.status(404).json({ error: 'Not found.' });
  // Malformed or oversized request bodies are the sender's mistake, not ours.
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'The request could not be read.' });
  if (err.type === 'entity.too.large') return res.status(413).json({ error: 'That upload is too large.' });
  console.error(err);
  res.status(500).json({ error: 'Something went wrong on our end.' });
});

const PORT = process.env.PORT || 4000;

ensureSchema()
  .then(() => {
    app.listen(PORT, () => console.log(`Milady's API listening on http://localhost:${PORT}`));
    startReviewReminders();
    startPaymentChecks();
  })
  .catch((err) => {
    console.error('Failed to connect to the database. Check DATABASE_URL in server/.env');
    console.error(err.message);
    process.exit(1);
  });
