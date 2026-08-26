import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { ensureSchema } from './db.js';
import { attachUser } from './middleware/auth.js';

import authRoutes from './routes/auth.js';
import categoryRoutes from './routes/categories.js';
import productRoutes from './routes/products.js';
import homeSectionRoutes from './routes/homeSections.js';
import reviewRoutes from './routes/reviews.js';
import orderRoutes from './routes/orders.js';
import couponRoutes from './routes/coupons.js';
import testimonialRoutes from './routes/testimonials.js';
import cancellationPolicyRoutes from './routes/cancellationPolicy.js';

const app = express();

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
    callback(new Error('Not allowed by CORS'));
  },
}));
// Raised from Express's 100kb default — the home-page CMS stores uploaded
// hero photos/videos as base64 directly in the database, which inflates
// file size by roughly a third, so this needs real headroom.
app.use(express.json({ limit: '30mb' }));
app.use(attachUser);

app.get('/api/health', (_req, res) => res.json({ ok: true }));

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
  console.error(err);
  res.status(500).json({ error: 'Something went wrong on our end.' });
});

const PORT = process.env.PORT || 4000;

ensureSchema()
  .then(() => {
    app.listen(PORT, () => console.log(`Milady's API listening on http://localhost:${PORT}`));
  })
  .catch((err) => {
    console.error('Failed to connect to the database. Check DATABASE_URL in server/.env');
    console.error(err.message);
    process.exit(1);
  });
