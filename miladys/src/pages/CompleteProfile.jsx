import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../data/api';
import Seo from '../components/Seo';

export default function CompleteProfile() {
  const { user } = useAuth();
  const [mobile, setMobile] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = location.state?.from || '/';

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await api.updateMe({ mobile });
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-page">
      <Seo title="Complete Your Profile" path="/complete-profile" noindex />
      <div className="container auth-wrap">
        <div className="auth-card">
          <p className="eyebrow">Almost there</p>
          <h1>Welcome{user?.name ? `, ${user.name.split(' ')[0]}` : ''}!</h1>
          <p className="auth-sub">
            One last thing — we need a mobile number on file for order updates and delivery.
          </p>

          <form onSubmit={handleSubmit} className="auth-form">
            <label>
              Mobile number
              <input
                type="tel"
                required
                autoFocus
                placeholder="e.g. 98765 43210"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
              />
            </label>

            {error && <p className="auth-error">{error}</p>}

            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? 'Saving…' : 'Continue'}
            </button>
          </form>
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
      `}</style>
    </div>
  );
}
