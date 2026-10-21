// Simple in-memory request limits (one API process, so memory is enough).
// rateLimit({ windowMs, max, key, message }) → Express middleware that
// answers 429 once `key(req)` has made more than `max` requests in the
// last `windowMs`. Several limits can be stacked on one route.
export function rateLimit({ windowMs, max, key = (req) => req.ip, message }) {
  const hits = new Map();
  return (req, res, next) => {
    const k = key(req);
    if (!k) return next();
    const now = Date.now();
    const recent = (hits.get(k) || []).filter((t) => now - t < windowMs);
    recent.push(now);
    hits.set(k, recent);
    // Forget idle keys now and then so memory stays small.
    if (hits.size > 10000) for (const [kk, v] of hits) if (!v.some((t) => now - t < windowMs)) hits.delete(kk);
    if (recent.length > max) {
      const retry = Math.ceil((recent[recent.length - max - 1] + windowMs - now) / 1000);
      res.set('Retry-After', String(Math.max(retry, 1)));
      return res.status(429).json({ error: message || 'Too many attempts — please wait a few minutes and try again.' });
    }
    next();
  };
}

const MIN = 60 * 1000;
const emailKey = (req) => String(req.body?.email || '').trim().toLowerCase() || null;

export const limits = {
  // Password guessing: per account from one address, and per address overall.
  login: [
    rateLimit({ windowMs: 15 * MIN, max: 10, key: (req) => `${req.ip}|${emailKey(req)}`, message: 'Too many login attempts — please wait 15 minutes, or reset your password.' }),
    rateLimit({ windowMs: 15 * MIN, max: 40, message: 'Too many login attempts — please wait 15 minutes.' }),
  ],
  // Reset emails: never flood one inbox.
  forgotPassword: [
    rateLimit({ windowMs: 60 * MIN, max: 3, key: emailKey, message: 'A reset link was already sent several times — please check your inbox and spam folder, or try again in an hour.' }),
    rateLimit({ windowMs: 60 * MIN, max: 10 }),
  ],
  resetPassword: [rateLimit({ windowMs: 15 * MIN, max: 10 })],
  signup: [rateLimit({ windowMs: 60 * MIN, max: 10, message: 'Too many sign-ups from this connection — please try again later.' })],
  google: [rateLimit({ windowMs: 15 * MIN, max: 30 })],
  changePassword: [rateLimit({ windowMs: 15 * MIN, max: 10, key: (req) => req.user?.id })],
};
