import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { isDataImage, storeDataUrl, thumbPath } from '../lib/images.js';

const router = Router();

// POST /api/uploads/image — body: { image: "data:image/...;base64,..." }
// Stores the photo as WebP files and returns its URL, so a form can
// upload each photo as it's picked and then save the product with plain
// URLs instead of sending every photo inline in one huge request.
// (Product/category/etc. routes also still accept data URLs directly and
// convert them the same way, for older admin-panel builds.)
router.post('/image', requireAuth, async (req, res) => {
  const { image, maxDimension } = req.body || {};
  if (!isDataImage(image)) return res.status(400).json({ error: 'Send the photo as a data:image/... base64 string.' });
  try {
    const url = await storeDataUrl(image, { maxDimension: Math.min(Number(maxDimension) || 2400, 3000) });
    res.status(201).json({ url, thumb: thumbPath(url) });
  } catch (err) {
    console.error('[uploads/image]', err.message);
    res.status(400).json({ error: 'That file could not be read as an image.' });
  }
});

export default router;
