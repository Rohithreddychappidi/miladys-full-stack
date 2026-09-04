import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Seo from '../components/Seo';

export default function Login() {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '', mobile: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const { login, signup } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = location.state?.from || '/profile';

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (mode === 'login') {
        await login(form.email, form.password);
      } else {
        await signup(form);
      }
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-page">
      <Seo title="Log In" path="/login" noindex />
      <div className="container auth-wrap">
        <div className="auth-card">
          <p className="eyebrow">Welcome</p>
          <h1>{mode === 'login' ? 'Log in' : 'Create your account'}</h1>
          <p className="auth-sub">
            {mode === 'login' ? "New to Milady's? " : 'Already have an account? '}
            <button type="button" className="link-btn" onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); }}>
              {mode === 'login' ? 'Sign up' : 'Log in'}
            </button>
          </p>

          <form onSubmit={handleSubmit} className="auth-form">
            {mode === 'signup' && (
              <label>
                Full name
                <input type="text" required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
              </label>
            )}
            <label>
              Email
              <input type="email" required value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
            </label>
            {mode === 'signup' && (
              <label>
                Mobile
                <input type="tel" value={form.mobile} onChange={(e) => setForm((f) => ({ ...f, mobile: e.target.value }))} />
              </label>
            )}
            <label>
              Password
              <input type="password" required minLength={6} value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} />
            </label>
            {mode === 'login' && (
              <Link to="/forgot-password" className="forgot-link">Forgot password?</Link>
            )}

            {error && <p className="auth-error">{error}</p>}

            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Create account'}
            </button>
          </form>

          <Link to="/" className="back-link">← Back to home</Link>
        </div>
      </div>

      <style>{`
        .auth-page { padding: 90px 0 80px; min-height: 60vh; display: flex; align-items: center; }
        .auth-wrap { display: flex; justify-content: center; }
        .auth-card {
          width: 100%;
          max-width: 400px;
          background: var(--paper);
          border: 1px solid var(--stone-200);
          border-radius: var(--radius-md);
          padding: 32px;
        }
        .auth-card h1 { font-size: 26px; margin: 6px 0 4px; }
        .auth-sub { font-size: 13px; color: var(--ink-600); margin-bottom: 22px; }
        .link-btn { background: none; border: none; color: var(--gold-600); border-bottom: 1px solid var(--gold-500); font-size: 13px; padding: 0; }
        .auth-form { display: flex; flex-direction: column; gap: 14px; }
        .auth-form label { display: flex; flex-direction: column; gap: 6px; font-size: 12.5px; color: var(--ink-600); }
        .auth-form input {
          padding: 11px 12px;
          border-radius: var(--radius-sm);
          border: 1px solid var(--stone-200);
          font-family: var(--font-body);
          font-size: 13.5px;
        }
        .auth-error { font-size: 12.5px; color: #a13a3a; margin: 0; }
        .forgot-link { align-self: flex-start; font-size: 12.5px; color: var(--gold-600); margin-top: -6px; }
        .auth-form .btn { margin-top: 6px; }
        .back-link { display: inline-block; margin-top: 20px; font-size: 12.5px; color: var(--ink-400); }
      `}</style>
    </div>
  );
}
