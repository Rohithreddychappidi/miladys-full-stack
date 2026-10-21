import { Router } from 'express';
import { query } from '../db.js';
import { requireAdmin } from '../middleware/auth.js';
import { sendContactNotification } from '../lib/email.js';
import { getStoreInfo } from '../lib/storeInfo.js';

const router = Router();

// Simple in-memory limit: 5 messages per address per 10 minutes. Enough to
// stop a bot flooding the inbox; real customers never get near it.
const WINDOW_MS = 10 * 60 * 1000;
const LIMIT = 5;
const recent = new Map();
function rateLimited(ip) {
  const now = Date.now();
  const hits = (recent.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  hits.push(now);
  recent.set(ip, hits);
  if (recent.size > 5000) for (const [k, v] of recent) if (!v.some((t) => now - t < WINDOW_MS)) recent.delete(k);
  return hits.length > LIMIT;
}

// POST /api/contact — the Contact page form. Body: { name, contact, message }
// where `contact` is an email address or a phone number (one box on the form).
// `website` is a hidden trap field: people leave it empty, bots fill it in.
router.post('/', async (req, res) => {
  const { name, contact, email, phone, message, website } = req.body || {};
  if (website) return res.json({ ok: true }); // bot: pretend success, store nothing
  const cleanName = String(name || '').trim().slice(0, 120);
  const cleanMsg = String(message || '').trim().slice(0, 4000);
  const raw = String(contact || email || phone || '').trim().slice(0, 160);
  if (!cleanName || !cleanMsg || !raw) return res.status(400).json({ error: 'Please fill in your name, how to reach you, and your message.' });
  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw);
  const digits = raw.replace(/\D/g, '');
  if (!isEmail && digits.length < 10) return res.status(400).json({ error: 'Please enter a valid email address or a phone number with at least 10 digits.' });
  if (rateLimited(req.ip)) return res.status(429).json({ error: 'Too many messages — please try again in a few minutes, or reach us on WhatsApp.' });

  const { rows } = await query(
    'INSERT INTO contact_messages (name, email, phone, message) VALUES ($1,$2,$3,$4) RETURNING *',
    [cleanName, isEmail ? raw : null, isEmail ? null : raw, cleanMsg]
  );
  getStoreInfo()
    .then((store) => sendContactNotification(store.email, rows[0]))
    .catch(() => {});
  res.status(201).json({ ok: true });
});

// GET /api/contact/admin — every message, newest first, for Admin → Messages.
router.get('/admin', requireAdmin, async (_req, res) => {
  const { rows } = await query('SELECT * FROM contact_messages ORDER BY created_at DESC');
  res.json({ messages: rows });
});

// GET /api/contact/admin/unread — count for the admin menu badge.
router.get('/admin/unread', requireAdmin, async (_req, res) => {
  const { rows } = await query("SELECT COUNT(*)::int AS n FROM contact_messages WHERE status = 'new'");
  res.json({ unread: rows[0].n });
});

// PUT /api/contact/admin/:id — { status: new | read | replied | archived }
router.put('/admin/:id', requireAdmin, async (req, res) => {
  const { status } = req.body || {};
  if (!['new', 'read', 'replied', 'archived'].includes(status)) return res.status(400).json({ error: 'Unknown status.' });
  const { rows } = await query('UPDATE contact_messages SET status = $1 WHERE id = $2 RETURNING *', [status, req.params.id]);
  if (!rows[0]) return res.status(404).json({ error: 'Message not found.' });
  res.json({ message: rows[0] });
});

router.delete('/admin/:id', requireAdmin, async (req, res) => {
  await query('DELETE FROM contact_messages WHERE id = $1', [req.params.id]);
  res.json({ ok: true });
});

export default router;
