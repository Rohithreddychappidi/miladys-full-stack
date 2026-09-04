import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Seo from '../components/Seo';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const { resetPassword } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setBusy(true);
    try {
      await resetPassword(token, password);
      // Successful reset also logs the user in (backend returns a fresh
      // token), so send them straight to their account.
      navigate('/profile', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-page">
      <Seo title="Reset Password" path="/reset-password" noindex />
      <div className="container auth-wrap">
        <div className="auth-card">
          <p className="eyebrow">Reset password</p>
          <h1>Choose a new password</h1>

          {!token ? (
            <>
              <p className="auth-sub" style={{ marginBottom: 0 }}>
                This reset link is missing or invalid. Please request a new one.
              </p>
              <Link to="/forgot-password" className="back-link">← Request a new link</Link>
            </>
          ) : (
            <>
              <p className="auth-sub">Enter a new password for your account.</p>

              <form onSubmit={handleSubmit} className="auth-form">
                <label>
                  New password
                  <input type="password" required minLength={6} autoFocus value={password} onChange={(e) => setPassword(e.target.value)} />
                </label>
                <label>
                  Confirm new password
                  <input type="password" required minLength={6} value={confirm} onChange={(e) => setConfirm(e.target.value)} />
                </label>

                {error && <p className="auth-error">{error}</p>}

                <button type="submit" className="btn btn-primary" disabled={busy}>
                  {busy ? 'Saving…' : 'Reset password'}
                </button>
              </form>

              <Link to="/login" className="back-link">← Back to log in</Link>
            </>
          )}
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
        .auth-sub { font-size: 13px; color: var(--ink-600); margin-bottom: 22px; line-height: 1.6; }
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
        .auth-form .btn { margin-top: 6px; }
        .back-link { display: inline-block; margin-top: 20px; font-size: 12.5px; color: var(--ink-400); }
      `}</style>
    </div>
  );
}
