import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Seo from '../components/Seo';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const { forgotPassword } = useAuth();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await forgotPassword(email);
      // Always shows the same success state, whether or not the email is
      // registered — the backend responds identically either way so this
      // page can't be used to check which emails have an account.
      setSent(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-page">
      <Seo title="Forgot Password" path="/forgot-password" noindex />
      <div className="container auth-wrap">
        <div className="auth-card">
          <p className="eyebrow">Reset password</p>
          <h1>Forgot your password?</h1>

          {sent ? (
            <>
              <p className="auth-sub" style={{ marginBottom: 0 }}>
                If an account exists for <strong>{email}</strong>, we&rsquo;ve sent a link to reset your password. It expires in 30 minutes.
              </p>
              <Link to="/login" className="back-link">← Back to log in</Link>
            </>
          ) : (
            <>
              <p className="auth-sub">Enter the email on your account and we&rsquo;ll send you a link to reset your password.</p>

              <form onSubmit={handleSubmit} className="auth-form">
                <label>
                  Email
                  <input type="email" required autoFocus value={email} onChange={(e) => setEmail(e.target.value)} />
                </label>

                {error && <p className="auth-error">{error}</p>}

                <button type="submit" className="btn btn-primary" disabled={busy}>
                  {busy ? 'Sending…' : 'Send reset link'}
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
