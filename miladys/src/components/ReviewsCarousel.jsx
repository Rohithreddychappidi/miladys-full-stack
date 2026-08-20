import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../data/api';

function Stars({ value, onChange, size = 18, readOnly = false }) {
  const [hover, setHover] = useState(0);
  return (
    <div className={`stars ${readOnly ? 'readonly' : ''}`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span
          key={n}
          className={n <= (hover || value) ? 'star filled' : 'star'}
          style={{ fontSize: size }}
          onMouseEnter={() => !readOnly && setHover(n)}
          onMouseLeave={() => !readOnly && setHover(0)}
          onClick={() => !readOnly && onChange?.(n)}
        >
          ★
        </span>
      ))}
      <style>{`
        .stars { display: inline-flex; gap: 2px; }
        .star { color: var(--stone-200); line-height: 1; }
        .star.filled { color: var(--gold-500); }
        .stars:not(.readonly) .star { cursor: pointer; }
      `}</style>
    </div>
  );
}

export default function ReviewsCarousel({ productId }) {
  const { user } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [summary, setSummary] = useState({ count: 0, average: 0 });
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const trackRef = useRef(null);

  useEffect(() => {
    let active = true;
    api
      .getReviews(productId)
      .then(({ reviews, summary }) => {
        if (!active) return;
        setReviews(reviews);
        setSummary(summary);
      })
      .catch(() => {})
      .finally(() => active && setLoaded(true));
    return () => {
      active = false;
    };
  }, [productId]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!rating) {
      setError('Please select a star rating.');
      return;
    }
    setBusy(true);
    try {
      const { review } = await api.addReview(productId, { rating, comment });
      setReviews((prev) => [review, ...prev]);
      setSummary((s) => ({
        count: s.count + 1,
        average: Math.round((((s.average * s.count) + rating) / (s.count + 1)) * 10) / 10,
      }));
      setRating(0);
      setComment('');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function scroll(dir) {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * (el.clientWidth * 0.8), behavior: 'smooth' });
  }

  if (!loaded) return null;

  return (
    <section className="reviews-block">
      <div className="reviews-head">
        <div>
          <h3>Customer Reviews</h3>
          {summary.count > 0 ? (
            <div className="summary-line">
              <Stars value={Math.round(summary.average)} readOnly size={15} />
              <span>{summary.average} out of 5 · {summary.count} review{summary.count === 1 ? '' : 's'}</span>
            </div>
          ) : (
            <p className="no-reviews">Be the first to review this saree.</p>
          )}
        </div>
        {reviews.length > 2 && (
          <div className="carousel-nav">
            <button type="button" onClick={() => scroll(-1)} aria-label="Previous reviews">‹</button>
            <button type="button" onClick={() => scroll(1)} aria-label="Next reviews">›</button>
          </div>
        )}
      </div>

      {reviews.length > 0 && (
        <div className="reviews-track" ref={trackRef}>
          {reviews.map((r) => (
            <div className="review-card" key={r.id}>
              <Stars value={r.rating} readOnly size={13} />
              {r.comment && <p className="review-comment">{r.comment}</p>}
              <div className="review-meta">
                <span className="review-name">{r.user_name}</span>
                <span className="review-date">{new Date(r.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="review-form-wrap">
        {user ? (
          <form className="review-form" onSubmit={handleSubmit}>
            <p className="form-label">Rate this product</p>
            <Stars value={rating} onChange={setRating} size={22} />
            <textarea
              placeholder="Share your experience with this saree (optional)"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              maxLength={1000}
            />
            {error && <p className="review-error">{error}</p>}
            <button type="submit" className="btn btn-outline" disabled={busy}>
              {busy ? 'Posting…' : 'Post Review'}
            </button>
          </form>
        ) : (
          <p className="login-prompt">
            <a href="/login">Log in</a> to write a review.
          </p>
        )}
      </div>

      <style>{`
        .reviews-block { margin-top: 44px; padding-top: 36px; border-top: 1px solid var(--stone-200); }
        .reviews-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 18px; }
        .reviews-head h3 { font-family: var(--font-display); font-size: 20px; color: var(--maroon-900); margin: 0 0 8px; }
        .summary-line { display: flex; align-items: center; gap: 10px; font-size: 13px; color: var(--ink-600); }
        .no-reviews { font-size: 13px; color: var(--ink-400); margin: 0; }
        .carousel-nav { display: flex; gap: 8px; }
        .carousel-nav button {
          width: 32px; height: 32px; border-radius: 50%;
          border: 1px solid var(--stone-200); background: var(--paper);
          font-size: 16px; color: var(--maroon-900); flex: 0 0 auto;
        }
        .carousel-nav button:hover { background: var(--stone-100); }

        .reviews-track {
          display: flex;
          gap: 14px;
          overflow-x: auto;
          scroll-snap-type: x proximity;
          padding-bottom: 8px;
          margin-bottom: 24px;
          scrollbar-width: thin;
        }
        .review-card {
          scroll-snap-align: start;
          flex: 0 0 240px;
          background: var(--paper);
          border: 1px solid var(--stone-200);
          border-radius: var(--radius-md);
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .review-comment { font-size: 13px; line-height: 1.6; color: var(--ink-700); margin: 0; flex: 1; }
        .review-meta { display: flex; justify-content: space-between; font-size: 11.5px; color: var(--ink-400); }
        .review-name { font-weight: 600; color: var(--ink-900); }

        .review-form-wrap { max-width: 420px; }
        .review-form { display: flex; flex-direction: column; gap: 12px; }
        .form-label { font-size: 12.5px; color: var(--ink-600); margin: 0; }
        .review-form textarea {
          padding: 11px 12px;
          border-radius: var(--radius-sm);
          border: 1px solid var(--stone-200);
          font-family: var(--font-body);
          font-size: 13.5px;
          resize: vertical;
        }
        .review-error { font-size: 12.5px; color: #a13a3a; margin: 0; }
        .review-form .btn { align-self: flex-start; }
        .login-prompt { font-size: 13px; color: var(--ink-600); }
        .login-prompt a { color: var(--gold-600); border-bottom: 1px solid var(--gold-500); }

        @media (max-width: 600px) {
          .review-card { flex-basis: 210px; }
        }
      `}</style>
    </section>
  );
}
