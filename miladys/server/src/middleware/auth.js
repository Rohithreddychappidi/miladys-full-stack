import jwt from 'jsonwebtoken';
import { query } from '../db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

// Admin sign-ins last 8 hours (and the admin panel keeps them only until
// the browser closes); customers stay signed in for 30 days. `tv` is the
// account's token_version — an admin token stops working as soon as the
// admin's password changes.
export const ADMIN_SESSION_HOURS = 8;
export function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, isAdmin: user.is_admin, tv: user.token_version ?? 0 },
    JWT_SECRET,
    { expiresIn: user.is_admin ? `${ADMIN_SESSION_HOURS}h` : '30d' }
  );
}

// Attaches req.user if a valid token is present. Does NOT reject requests
// with no token — use requireAuth for that. Lets public routes optionally
// know who's asking (e.g. to show "your review" state).
export async function attachUser(req, _res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (token) {
    try {
      req.user = jwt.verify(token, JWT_SECRET);
    } catch {
      req.user = null;
    }
  }
  // Admin tokens: still an admin, and signed in since the last password
  // change? (A token from before a password change no longer works.)
  if (req.user?.isAdmin) {
    try {
      const { rows } = await query('SELECT is_admin, token_version FROM users WHERE id = $1', [req.user.id]);
      if (!rows[0] || !rows[0].is_admin || rows[0].token_version !== (req.user.tv ?? 0)) req.user = null;
    } catch {
      req.user = null;
    }
  }
  next();
}

export function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Please log in to continue.', code: 'SIGNED_OUT' });
  next();
}

export function requireAdmin(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Please log in to continue.', code: 'SIGNED_OUT' });
  if (!req.user.isAdmin) return res.status(403).json({ error: 'Admin access only.' });
  next();
}
