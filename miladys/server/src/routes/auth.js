import { Router } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { query } from '../db.js';
import { signToken, requireAuth } from '../middleware/auth.js';
import { sendLoginEmail, sendPasswordResetEmail } from '../lib/email.js';

const router = Router();
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || '').toLowerCase();
const RESET_TOKEN_TTL_MS = 30 * 60 * 1000; // 30 minutes
// A link inside an email needs exactly ONE url — CLIENT_URL can be a
// comma-separated list of allowed CORS origins, so only the first is used
// here (same approach already used for the other emailed links).
const SITE_URL = (process.env.CLIENT_URL || 'http://localhost:5173').split(',')[0].trim();

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

// Always responds the same way whether or not the email is registered —
// otherwise the response itself would let someone check which emails have
// an account (a common "user enumeration" issue with forgot-password
// endpoints).
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body || {};
  if (!email?.trim()) return res.status(400).json({ error: 'Email is required.' });

  const normalizedEmail = email.trim().toLowerCase();
  const { rows } = await query('SELECT id, name, email FROM users WHERE email = $1', [normalizedEmail]);
  const user = rows[0];

  if (user) {
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);

    // Only one live reset link per account at a time — clears out any
    // earlier request before issuing a new one.
    await query('DELETE FROM password_resets WHERE user_id = $1', [user.id]);
    await query(
      'INSERT INTO password_resets (user_id, token_hash, expires_at) VALUES ($1,$2,$3)',
      [user.id, tokenHash, expiresAt]
    );

    const resetUrl = `${SITE_URL}/reset-password?token=${rawToken}`;
    sendPasswordResetEmail(user, resetUrl).catch(() => {});
  }

  res.json({ ok: true, message: "If an account exists for that email, we've sent a password reset link." });
});

router.post('/reset-password', async (req, res) => {
  const { token, newPassword } = req.body || {};
  if (!token || !newPassword) return res.status(400).json({ error: 'Reset token and new password are required.' });
  if (newPassword.length < 6) return res.status(400).json({ error: 'New password must be at least 6 characters.' });

  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const { rows } = await query(
    `SELECT pr.id, pr.user_id, pr.expires_at, pr.used_at
     FROM password_resets pr WHERE pr.token_hash = $1`,
    [tokenHash]
  );
  const reset = rows[0];
  if (!reset || reset.used_at || new Date(reset.expires_at) < new Date()) {
    return res.status(400).json({ error: 'This reset link is invalid or has expired. Please request a new one.' });
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await query('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, reset.user_id]);
  await query('UPDATE password_resets SET used_at = now() WHERE id = $1', [reset.id]);
  // Any other outstanding reset link for this account is invalidated too,
  // so an old emailed link can't still be used after this one succeeds.
  await query('DELETE FROM password_resets WHERE user_id = $1 AND id != $2', [reset.user_id, reset.id]);

  const { rows: userRows } = await query('SELECT id, name, email, mobile, is_admin FROM users WHERE id = $1', [reset.user_id]);
  const user = userRows[0];
  const authToken = signToken(user);
  res.json({ ok: true, token: authToken, user: publicUser(user) });
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

router.post('/change-password', requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current and new password are required.' });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters.' });
  }

  const { rows } = await query('SELECT * FROM users WHERE id = $1', [req.user.id]);
  const user = rows[0];
  if (!user) return res.status(404).json({ error: 'User not found.' });

  const ok = await bcrypt.compare(currentPassword, user.password_hash);
  if (!ok) return res.status(401).json({ error: 'Current password is incorrect.' });

  const newHash = await bcrypt.hash(newPassword, 10);
  await query('UPDATE users SET password_hash = $1 WHERE id = $2', [newHash, req.user.id]);
  res.json({ ok: true });
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
