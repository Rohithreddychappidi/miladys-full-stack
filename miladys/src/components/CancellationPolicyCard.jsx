import { useEffect, useState } from 'react';
import { api } from '../data/api';

export default function CancellationPolicyCard() {
  const [tiers, setTiers] = useState([]);

  useEffect(() => {
    api.getCancellationPolicy().then(({ policy }) => setTiers(policy)).catch(() => {});
  }, []);

  if (!tiers.length) return null;

  return (
    <div className="cancel-policy-card">
      <div className="cancel-policy-head">
        <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path d="M10 2.5a7.5 7.5 0 100 15 7.5 7.5 0 000-15z" stroke="currentColor" strokeWidth="1.3" />
          <path d="M10 6v4l2.6 2.6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <p>Easy Cancellation</p>
      </div>
      <ul>
        {tiers.map((t) => (
          <li key={t.id}>
            <span className="tier-label">{t.label}</span>
            <span className="tier-refund">{t.refund_percent}% refund</span>
          </li>
        ))}
      </ul>
      <p className="cancel-policy-note">Cancel anytime from My Orders — refund amount depends on how soon after payment you cancel.</p>

      <style>{`
        .cancel-policy-card {
          background: var(--stone-100);
          border-radius: var(--radius-md);
          padding: 18px 20px;
          margin-top: 20px;
        }
        .cancel-policy-head { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
        .cancel-policy-head svg { width: 18px; height: 18px; color: var(--maroon-900); flex: 0 0 auto; }
        .cancel-policy-head p { font-size: 13.5px; font-weight: 600; color: var(--maroon-900); margin: 0; }
        .cancel-policy-card ul { list-style: none; margin: 0 0 10px; padding: 0; display: flex; flex-direction: column; gap: 7px; }
        .cancel-policy-card li { display: flex; justify-content: space-between; font-size: 12.5px; color: var(--ink-600); }
        .tier-refund { font-weight: 600; color: #3c7a3c; }
        .cancel-policy-note { font-size: 11.5px; color: var(--ink-400); line-height: 1.6; margin: 0; }
      `}</style>
    </div>
  );
}
