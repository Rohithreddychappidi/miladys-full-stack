import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../db.js';
import { signToken, requireAuth } from '../middleware/auth.js';
import { sendLoginEmail } from '../lib/email.js';

const router = Router();
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || '').toLowerCase();

router.post('/signup', async (req, res) => {
  const { name, email, password, mobile } = req.body || {};
  if (!name?.trim() || !email?.trim() || !password || password.length < 6) {
    return res.status(400).json({ error: 'Name, email and a password (6+ chars) are required.' });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const existing = await query('SELECT id FROM users WHERE email = $1', [normalizedEmail]);
  if (existing.rows.length) {
    return res.status(409).json({ error: 'An account with this email already exists.' });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const isAdmin = normalizedEmail === ADMIN_EMAIL;

  const { rows } = await query(
    `INSERT INTO users (name, email, password_hash, mobile, is_admin)
     VALUES ($1,$2,$3,$4,$5) RETURNING id, name, email, mobile, is_admin`,
    [name.trim(), normalizedEmail, passwordHash, mobile || null, isAdmin]
  );

  const user = rows[0];
  const token = signToken(user);
  res.status(201).json({ token, user: publicUser(user) });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required.' });

  const normalizedEmail = email.trim().toLowerCase();
  const { rows } = await query('SELECT * FROM users WHERE email = $1', [normalizedEmail]);
  const user = rows[0];
  if (!user) return res.status(401).json({ error: 'Invalid email or password.' });

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: 'Invalid email or password.' });

  const token = signToken(user);

  // Fire-and-forget: don't make the user wait on email delivery to log in.
  sendLoginEmail(user).catch(() => {});

  res.json({ token, user: publicUser(user) });
});

router.get('/me', requireAuth, async (req, res) => {
  const { rows } = await query('SELECT id, name, email, mobile, is_admin FROM users WHERE id = $1', [req.user.id]);
  if (!rows[0]) return res.status(404).json({ error: 'User not found.' });
  res.json({ user: publicUser(rows[0]) });
});

router.put('/me', requireAuth, async (req, res) => {
  const { name, mobile } = req.body || {};
  const { rows } = await query(
    'UPDATE users SET name = COALESCE($1, name), mobile = COALESCE($2, mobile) WHERE id = $3 RETURNING id, name, email, mobile, is_admin',
    [name, mobile, req.user.id]
  );
  res.json({ user: publicUser(rows[0]) });
});

// --- Addresses ---
router.get('/addresses', requireAuth, async (req, res) => {
  const { rows } = await query('SELECT * FROM addresses WHERE user_id = $1 ORDER BY id DESC', [req.user.id]);
  res.json({ addresses: rows });
});

router.post('/addresses', requireAuth, async (req, res) => {
  const { name, mobile, line1, city, state, pincode } = req.body || {};
  if (!name || !mobile || !line1 || !city || !pincode) {
    return res.status(400).json({ error: 'Name, mobile, address, city and pincode are required.' });
  }
  const { rows } = await query(
    `INSERT INTO addresses (user_id, name, mobile, line1, city, state, pincode)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [req.user.id, name, mobile, line1, city, state || '', pincode]
  );
  res.status(201).json({ address: rows[0] });
});

router.delete('/addresses/:id', requireAuth, async (req, res) => {
  await query('DELETE FROM addresses WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
  res.json({ ok: true });
});

function publicUser(u) {
  return { id: u.id, name: u.name, email: u.email, mobile: u.mobile, isAdmin: u.is_admin };
}

export default router;
