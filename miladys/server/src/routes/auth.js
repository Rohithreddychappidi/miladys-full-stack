import { Router } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import { query } from '../db.js';
import { signToken, requireAuth, requireAdmin } from '../middleware/auth.js';
import { sendLoginEmail, sendPasswordResetEmail, sendPasswordChangedEmail } from '../lib/email.js';
import { limits } from '../middleware/rateLimit.js';
import { checkAddress, normalizePhone } from '../lib/address.js';

const router = Router();
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || '').toLowerCase();
const RESET_TOKEN_TTL_MS = 30 * 60 * 1000; // 30 minutes
// A link inside an email needs exactly ONE url — CLIENT_URL can be a
// comma-separated list of allowed CORS origins, so only the first is used
// here (same approach already used for the other emailed links).
const SITE_URL = (process.env.CLIENT_URL || 'http://localhost:5173').split(',')[0].trim();
const googleClient = process.env.GOOGLE_CLIENT_ID ? new OAuth2Client(process.env.GOOGLE_CLIENT_ID) : null;

router.post('/signup', ...limits.signup, async (req, res) => {
  const { name, email, password, mobile } = req.body || {};
  if (!name?.trim() || !email?.trim() || !password || password.length < 6) {
    return res.status(400).json({ error: 'Name, email and a password (6+ chars) are required.' });
  }
  const cleanMobile = mobile ? normalizePhone(mobile) : null;
  if (mobile && !cleanMobile) return res.status(400).json({ error: 'Please enter a valid 10-digit mobile number, or an international number starting with + and the country code.' });

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
    [name.trim(), normalizedEmail, passwordHash, cleanMobile, isAdmin]
  );

  const user = rows[0];
  const token = signToken(user);
  res.status(201).json({ token, user: publicUser(user) });
});

router.post('/login', ...limits.login, async (req, res) => {
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

// Sign in (or sign up, on first use) with Google. The frontend uses Google
// Identity Services to get an ID token directly in the browser — that
// token is verified here against Google's own keys before we trust
// anything in it, so a forged/tampered token is rejected before it ever
// reaches a database query.
router.post('/google', ...limits.google, async (req, res) => {
  if (!googleClient) {
    return res.status(503).json({ error: 'Google sign-in is not configured yet.' });
  }
  const { credential } = req.body || {};
  if (!credential) return res.status(400).json({ error: 'Missing Google credential.' });

  let payload;
  try {
    const ticket = await googleClient.verifyIdToken({ idToken: credential, audience: process.env.GOOGLE_CLIENT_ID });
    payload = ticket.getPayload();
  } catch {
    return res.status(401).json({ error: 'Could not verify Google sign-in. Please try again.' });
  }
  if (!payload?.email || !payload.email_verified) {
    return res.status(401).json({ error: 'Your Google account email is not verified.' });
  }

  const normalizedEmail = payload.email.toLowerCase();
  const { rows } = await query('SELECT * FROM users WHERE email = $1', [normalizedEmail]);
  let user = rows[0];

  if (!user) {
    // New account via Google. There's no password to check yet — a
    // random, never-shown hash keeps password_hash's NOT NULL constraint
    // satisfied; the person can set a real password anytime afterward via
    // "Forgot password", which works regardless of how the account started.
    const randomPasswordHash = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10);
    const isAdmin = normalizedEmail === ADMIN_EMAIL;
    const insert = await query(
      `INSERT INTO users (name, email, password_hash, google_id, is_admin)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [payload.name?.trim() || normalizedEmail.split('@')[0], normalizedEmail, randomPasswordHash, payload.sub, isAdmin]
    );
    user = insert.rows[0];
  } else if (!user.google_id) {
    // Existing email/password account signing in with Google for the
    // first time — link it rather than creating a second account with
    // the same email (email is already UNIQUE, so this is also the only
    // safe option, not just the friendlier one).
    const update = await query('UPDATE users SET google_id = $1 WHERE id = $2 RETURNING *', [payload.sub, user.id]);
    user = update.rows[0];
  }

  const token = signToken(user);
  // Google only ever gives us name + email — mobile is required at
  // checkout, so the frontend uses this flag to prompt for it right after
  // a first-time Google sign-in instead of waiting until checkout to ask.
  res.json({ token, user: publicUser(user), needsMobile: !user.mobile });
});

// Always responds the same way whether or not the email is registered —
// otherwise the response itself would let someone check which emails have
// an account (a common "user enumeration" issue with forgot-password
// endpoints).
router.post('/forgot-password', ...limits.forgotPassword, async (req, res) => {
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

router.post('/reset-password', ...limits.resetPassword, async (req, res) => {
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
  // token_version + 1 signs out every other admin session on this account.
  await query('UPDATE users SET password_hash = $1, token_version = token_version + 1 WHERE id = $2', [passwordHash, reset.user_id]);
  await query('UPDATE password_resets SET used_at = now() WHERE id = $1', [reset.id]);
  // Any other outstanding reset link for this account is invalidated too,
  // so an old emailed link can't still be used after this one succeeds.
  await query('DELETE FROM password_resets WHERE user_id = $1 AND id != $2', [reset.user_id, reset.id]);

  const { rows: userRows } = await query('SELECT id, name, email, mobile, is_admin, token_version FROM users WHERE id = $1', [reset.user_id]);
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
  let cleanMobile = null;
  if (mobile !== undefined && mobile !== null && mobile !== '') {
    cleanMobile = normalizePhone(mobile);
    if (!cleanMobile) return res.status(400).json({ error: 'Please enter a valid 10-digit mobile number, or an international number starting with + and the country code.' });
  }
  if (name !== undefined && !String(name).trim()) return res.status(400).json({ error: 'Your name can\'t be empty.' });
  const { rows } = await query(
    'UPDATE users SET name = COALESCE($1, name), mobile = COALESCE($2, mobile) WHERE id = $3 RETURNING id, name, email, mobile, is_admin',
    [name !== undefined ? String(name).trim() : null, cleanMobile, req.user.id]
  );
  res.json({ user: publicUser(rows[0]) });
});

router.post('/change-password', requireAuth, ...limits.changePassword, async (req, res) => {
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

  // Admin passwords change from Admin → Account & Security, which also
  // asks the security questions.
  if (user.is_admin) return res.status(403).json({ error: 'Admin passwords are changed from Admin → Account & Security.' });

  const ok = await bcrypt.compare(currentPassword, user.password_hash);
  if (!ok) return res.status(401).json({ error: 'Current password is incorrect.' });

  const newHash = await bcrypt.hash(newPassword, 10);
  await query('UPDATE users SET password_hash = $1 WHERE id = $2', [newHash, req.user.id]);
  res.json({ ok: true });
});

// ---------------------------------------------------------------------
// Admin account security: security questions, password change (asks the
// questions too) and "forgot password" with the questions.
// ---------------------------------------------------------------------
const QUESTION_COUNT = 3;
const MAX_WRONG = 5;            // wrong answer sets before recovery locks
const LOCK_MINUTES = 30;
// Answers compare without caring about case, spaces or punctuation
// ("St. Ann's School" = "st anns school" = "StAnnsSchool").
const normAnswer = (a) => String(a || '').toLowerCase().normalize('NFKC').replace(/[^\p{L}\p{N}]+/gu, '');
function adminPasswordProblem(pw) {
  if (typeof pw !== 'string' || pw.length < 8) return 'Use at least 8 characters for the admin password.';
  if (pw.length > 128) return 'That password is too long (128 characters at most).';
  if (!/[A-Za-z]/.test(pw) || !/[0-9]/.test(pw)) return 'Use both letters and numbers in the admin password.';
  return null;
}
async function securityRow(userId) {
  const { rows } = await query('SELECT * FROM admin_security WHERE user_id = $1', [userId]);
  return rows[0] || null;
}
const lockedMessage = (until) => {
  const mins = Math.max(1, Math.ceil((new Date(until) - Date.now()) / 60000));
  return `Too many wrong answers — please try again in ${mins} minute${mins === 1 ? '' : 's'}.`;
};
// Checks every answer; counts wrong sets towards the lock. Returns an
// error message, or null when all answers match.
async function checkAnswers(row, answers) {
  if (row.locked_until && new Date(row.locked_until) > new Date()) return lockedMessage(row.locked_until);
  const list = Array.isArray(answers) ? answers : [];
  let allRight = list.length === row.questions.length;
  for (let i = 0; i < row.questions.length; i++) {
    const given = normAnswer(list[i]);
    // Compare every answer (no early exit) so timing doesn't hint which was wrong.
    const ok = given ? await bcrypt.compare(given, row.questions[i].answer_hash) : false;
    if (!ok) allRight = false;
  }
  if (allRight) {
    await query('UPDATE admin_security SET failed_attempts = 0, locked_until = NULL WHERE user_id = $1', [row.user_id]);
    return null;
  }
  const failed = row.failed_attempts + 1;
  const lock = failed >= MAX_WRONG;
  await query(
    `UPDATE admin_security SET failed_attempts = $2, locked_until = ${lock ? `now() + interval '${LOCK_MINUTES} minutes'` : 'NULL'} WHERE user_id = $1`,
    [row.user_id, lock ? 0 : failed]
  );
  if (lock) return `Too many wrong answers — please try again in ${LOCK_MINUTES} minutes.`;
  const left = MAX_WRONG - failed;
  return `One or more answers don't match. ${left} attempt${left === 1 ? '' : 's'} left before a ${LOCK_MINUTES}-minute lock.`;
}

router.get('/admin/security', requireAdmin, async (req, res) => {
  const row = await securityRow(req.user.id);
  res.json({
    configured: !!row,
    questions: row ? row.questions.map((q) => q.question) : [],
    updatedAt: row?.updated_at || null,
  });
});

// Set or replace the security questions (current password required).
router.put('/admin/security', requireAdmin, ...limits.changePassword, async (req, res) => {
  const { currentPassword, items } = req.body || {};
  if (!currentPassword) return res.status(400).json({ error: 'Enter your current password to save security questions.' });
  if (!Array.isArray(items) || items.length !== QUESTION_COUNT) return res.status(400).json({ error: `Please set ${QUESTION_COUNT} security questions.` });
  const clean = items.map((it) => ({ question: String(it?.question || '').trim().replace(/\s+/g, ' '), answer: normAnswer(it?.answer) }));
  if (clean.some((c) => c.question.length < 5 || c.question.length > 200)) return res.status(400).json({ error: 'Each question needs 5–200 characters.' });
  if (new Set(clean.map((c) => c.question.toLowerCase())).size !== clean.length) return res.status(400).json({ error: 'Please pick three different questions.' });
  if (items.some((it) => String(it?.answer || '').length > 100) || clean.some((c) => c.answer.length < 2)) return res.status(400).json({ error: 'Each answer needs at least 2 letters or numbers (100 characters at most).' });

  const { rows } = await query('SELECT * FROM users WHERE id = $1', [req.user.id]);
  const user = rows[0];
  if (!user || !(await bcrypt.compare(currentPassword, user.password_hash))) {
    return res.status(401).json({ error: 'Current password is incorrect.' });
  }
  const questions = [];
  for (const c of clean) questions.push({ question: c.question, answer_hash: await bcrypt.hash(c.answer, 10) });
  await query(
    `INSERT INTO admin_security (user_id, questions) VALUES ($1, $2)
     ON CONFLICT (user_id) DO UPDATE SET questions = EXCLUDED.questions, failed_attempts = 0, locked_until = NULL, updated_at = now()`,
    [user.id, JSON.stringify(questions)]
  );
  res.json({ ok: true, configured: true, questions: questions.map((q) => q.question) });
});

// Change password: current password + new password + the security answers.
router.post('/admin/change-password', requireAdmin, ...limits.changePassword, async (req, res) => {
  const { currentPassword, newPassword, answers } = req.body || {};
  if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Current and new password are required.' });
  const problem = adminPasswordProblem(newPassword);
  if (problem) return res.status(400).json({ error: problem });

  const { rows } = await query('SELECT * FROM users WHERE id = $1', [req.user.id]);
  const user = rows[0];
  if (!user) return res.status(404).json({ error: 'User not found.' });
  if (!(await bcrypt.compare(currentPassword, user.password_hash))) {
    return res.status(401).json({ error: 'Current password is incorrect.' });
  }
  if (await bcrypt.compare(newPassword, user.password_hash)) {
    return res.status(400).json({ error: 'The new password must be different from the current one.' });
  }
  const row = await securityRow(user.id);
  if (!row) return res.status(400).json({ error: 'Set up your security questions first.', code: 'NO_QUESTIONS' });
  const wrong = await checkAnswers(row, answers);
  if (wrong) return res.status(401).json({ error: wrong, code: 'WRONG_ANSWERS' });

  const hash = await bcrypt.hash(newPassword, 10);
  const { rows: upd } = await query(
    'UPDATE users SET password_hash = $1, token_version = token_version + 1 WHERE id = $2 RETURNING *',
    [hash, user.id]
  );
  sendPasswordChangedEmail(upd[0], { how: 'changed' }).catch(() => {});
  // This browser stays signed in with a fresh token; every other session ends.
  res.json({ ok: true, token: signToken(upd[0]), user: publicUser(upd[0]) });
});

// Forgot password (admin): step 1 — the questions for this email. Only
// admins with questions set get them; everyone else gets the same reply.
router.post('/admin/recovery/questions', ...limits.resetPassword, async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  if (!email) return res.status(400).json({ error: 'Enter your admin email.' });
  const { rows } = await query(
    `SELECT s.questions, s.locked_until FROM users u JOIN admin_security s ON s.user_id = u.id
     WHERE u.email = $1 AND u.is_admin`,
    [email]
  );
  if (!rows[0]) {
    return res.status(404).json({ error: 'Security-question reset isn\'t available for this email. Use the email reset link from the main sign-in page instead.' });
  }
  if (rows[0].locked_until && new Date(rows[0].locked_until) > new Date()) {
    return res.status(429).json({ error: lockedMessage(rows[0].locked_until) });
  }
  res.json({ questions: rows[0].questions.map((q) => q.question) });
});

// Forgot password (admin): step 2 — answers + new password.
router.post('/admin/recovery/reset', ...limits.resetPassword, async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const { answers, newPassword } = req.body || {};
  if (!email) return res.status(400).json({ error: 'Enter your admin email.' });
  const problem = adminPasswordProblem(newPassword);
  if (problem) return res.status(400).json({ error: problem });
  const { rows } = await query(
    `SELECT s.* FROM users u JOIN admin_security s ON s.user_id = u.id WHERE u.email = $1 AND u.is_admin`,
    [email]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Security-question reset isn\'t available for this email.' });
  const wrong = await checkAnswers(rows[0], answers);
  if (wrong) return res.status(401).json({ error: wrong, code: 'WRONG_ANSWERS' });

  const hash = await bcrypt.hash(newPassword, 10);
  const { rows: upd } = await query(
    'UPDATE users SET password_hash = $1, token_version = token_version + 1 WHERE id = $2 RETURNING *',
    [hash, rows[0].user_id]
  );
  await query('DELETE FROM password_resets WHERE user_id = $1', [upd[0].id]);
  sendPasswordChangedEmail(upd[0], { how: 'reset' }).catch(() => {});
  res.json({ ok: true, token: signToken(upd[0]), user: publicUser(upd[0]) });
});

// --- Addresses ---
router.get('/addresses', requireAuth, async (req, res) => {
  const { rows } = await query('SELECT * FROM addresses WHERE user_id = $1 ORDER BY id DESC', [req.user.id]);
  res.json({ addresses: rows });
});

router.post('/addresses', requireAuth, async (req, res) => {
  const { address: a, error } = checkAddress(req.body || {});
  if (error) return res.status(400).json({ error });
  const { rows } = await query(
    `INSERT INTO addresses (user_id, name, mobile, line1, city, state, pincode, country)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [req.user.id, a.name, a.mobile, a.line1, a.city, a.state, a.pincode, a.country]
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
