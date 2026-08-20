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

const app = express();
app.use(cors({ origin: process.env.CLIENT_URL || '*' }));
app.use(express.json());
app.use(attachUser);

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/products', productRoutes);
app.use('/api/home-sections', homeSectionRoutes);
app.use('/api', reviewRoutes); // mounts /api/products/:id/reviews and /api/admin/reviews
app.use('/api/orders', orderRoutes);

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
