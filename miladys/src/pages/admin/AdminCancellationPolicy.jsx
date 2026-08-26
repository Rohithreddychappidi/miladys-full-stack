import { useEffect, useState } from 'react';
import { api } from '../../data/api';

const emptyForm = { label: '', maxDays: '', refundPercent: '' };

export default function AdminCancellationPolicy() {
  const [tiers, setTiers] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => { refresh(); }, []);

  function refresh() {
    api.getCancellationPolicy()
      .then(({ policy }) => setTiers(policy))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.label.trim() || form.maxDays === '' || form.refundPercent === '') return;
    setError('');
    try {
      await api.createPolicyTier({
        label: form.label.trim(),
        maxDays: Number(form.maxDays),
        refundPercent: Number(form.refundPercent),
        sortOrder: tiers.length,
      });
      setForm(emptyForm);
      refresh();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this cancellation tier?')) return;
    try {
      await api.deletePolicyTier(id);
      refresh();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <div className="admin-page-head">
        <h1>Cancellation Policy</h1>
        <p>
          Define refund tiers by how many days have passed since payment. The customer's "Cancel Order" button uses
          the first tier their order still qualifies for — set these in ascending day order. This same list is
          shown to customers as a card on every product page.
        </p>
      </div>

      {error && <p className="admin-error">{error}</p>}

      <div className="cms-layout">
        <form className="cms-form" onSubmit={handleSubmit}>
          <h3>Add a tier</h3>

          <label>
            Label (shown to customers)
            <input
              type="text"
              value={form.label}
              placeholder="e.g. Within 24 hours of payment"
              onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
              required
            />
          </label>

          <div className="form-row">
            <label>
              Up to how many days
              <input
                type="number"
                min="0"
                value={form.maxDays}
                placeholder="e.g. 1"
                onChange={(e) => setForm((f) => ({ ...f, maxDays: e.target.value }))}
                required
              />
            </label>
            <label>
              Refund (%)
              <input
                type="number"
                min="0"
                max="100"
                value={form.refundPercent}
                placeholder="e.g. 100"
                onChange={(e) => setForm((f) => ({ ...f, refundPercent: e.target.value }))}
                required
              />
            </label>
          </div>

          <div className="form-actions">
            <button type="submit" className="btn btn-primary">Add Tier</button>
          </div>
        </form>

        <div className="cms-list">
          {loading && <p className="empty">Loading…</p>}
          {!loading && tiers.length === 0 && <p className="empty">No tiers yet — orders can't be cancelled until you add at least one.</p>}
          {tiers.map((t) => (
            <div className="cms-row" key={t.id}>
              <div className="row-info">
                <strong>{t.label}</strong>
                <span>Up to {t.max_days} day{t.max_days === 1 ? '' : 's'} after payment · {t.refund_percent}% refund</span>
              </div>
              <div className="row-actions">
                <button onClick={() => handleDelete(t.id)} className="danger">Delete</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        .admin-page-head { margin-bottom: 30px; }
        .admin-page-head h1 { font-size: 26px; margin-bottom: 8px; }
        .admin-page-head p { font-size: 13px; color: var(--ink-400); max-width: 600px; line-height: 1.6; }
        .admin-error { font-size: 12.5px; color: #a13a3a; margin-bottom: 16px; }

        .cms-layout { display: grid; grid-template-columns: 340px 1fr; gap: 28px; align-items: flex-start; }
        .cms-form {
          background: var(--paper);
          border-radius: var(--radius-md);
          padding: 26px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .cms-form h3 { font-family: var(--font-display); font-size: 18px; color: var(--maroon-900); margin: 0; }
        .cms-form label { display: flex; flex-direction: column; gap: 6px; font-size: 12.5px; color: var(--ink-600); }
        .cms-form input {
          padding: 11px 12px;
          border-radius: var(--radius-sm);
          border: 1px solid var(--stone-200);
          font-family: var(--font-body);
          font-size: 13.5px;
        }
        .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .form-actions .btn { padding: 11px 20px; font-size: 13px; }

        .cms-list { display: flex; flex-direction: column; gap: 10px; }
        .cms-row {
          background: var(--paper);
          border-radius: var(--radius-md);
          padding: 14px 16px;
          display: flex;
          align-items: center;
          gap: 14px;
        }
        .row-info { flex: 1; display: flex; flex-direction: column; gap: 2px; }
        .row-info strong { font-size: 14px; color: var(--ink-900); }
        .row-info span { font-size: 12px; color: var(--ink-400); }
        .row-actions button { background: none; border: none; font-size: 12.5px; color: #a13a3a; }
        .empty { color: var(--ink-400); font-size: 13.5px; }

        @media (max-width: 980px) {
          .cms-layout { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}
