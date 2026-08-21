import { useEffect, useState } from 'react';
import { api } from '../../data/api';

export default function AdminReviews() {
  const [reviews, setReviews] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    refresh();
  }, []);

  function refresh() {
    api.getAdminReviews().then(({ reviews }) => setReviews(reviews)).catch((err) => setError(err.message));
  }

  async function toggleApprove(review) {
    try {
      await api.approveReview(review.id, !review.approved);
      refresh();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this review?')) return;
    try {
      await api.deleteReview(id);
      refresh();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <div className="admin-page-head">
        <h1>Reviews</h1>
        <p>Star ratings and comments customers left on product pages. Hide a review to remove it from the storefront without deleting it.</p>
      </div>

      {error && <p className="admin-error">{error}</p>}

      <div className="cms-list">
        {reviews.length === 0 && <p className="empty">No reviews yet.</p>}
        {reviews.map((r) => (
          <div className="review-row" key={r.id}>
            <div className="review-row-main">
              <div className="review-row-head">
                <strong>{r.product_name}</strong>
                <span className="stars">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
              </div>
              {r.comment && <p>{r.comment}</p>}
              <span className="review-by">{r.user_name} · {r.user_email} · {new Date(r.created_at).toLocaleDateString('en-IN')}</span>
            </div>
            <div className="row-actions">
              <button onClick={() => toggleApprove(r)}>{r.approved ? 'Hide' : 'Show'}</button>
              <button onClick={() => handleDelete(r.id)} className="danger">Delete</button>
            </div>
          </div>
        ))}
      </div>

      <style>{`
        .admin-page-head { margin-bottom: 30px; }
        .admin-page-head h1 { font-size: 26px; margin-bottom: 8px; }
        .admin-page-head p { font-size: 13px; color: var(--ink-400); max-width: 560px; line-height: 1.6; }
        .admin-error { font-size: 12.5px; color: #a13a3a; margin-bottom: 16px; }
        .empty { color: var(--ink-400); font-size: 13.5px; }

        .cms-list { display: flex; flex-direction: column; gap: 10px; }
        .review-row {
          background: var(--paper);
          border-radius: var(--radius-md);
          padding: 14px 18px;
          display: flex;
          justify-content: space-between;
          gap: 14px;
          align-items: flex-start;
        }
        .review-row-main { flex: 1; }
        .review-row-head { display: flex; align-items: center; gap: 10px; margin-bottom: 4px; }
        .review-row-head strong { font-size: 13.5px; color: var(--ink-900); }
        .stars { color: var(--gold-500); font-size: 12px; }
        .review-row-main p { margin: 4px 0; font-size: 13px; color: var(--ink-600); }
        .review-by { font-size: 11.5px; color: var(--ink-400); }
        .row-actions { display: flex; gap: 10px; flex: 0 0 auto; }
        .row-actions button { background: none; border: none; font-size: 12.5px; color: var(--maroon-900); }
        .row-actions .danger { color: #a13a3a; }
      `}</style>
    </div>
  );
}
