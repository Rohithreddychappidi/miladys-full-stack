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

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function ReviewsCarousel({ productId }) {
  const { user } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [summary, setSummary] = useState({ count: 0, average: 0 });
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [photos, setPhotos] = useState([]);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [zoomSrc, setZoomSrc] = useState(null);
  const photoInput = useRef(null);

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

  useEffect(() => {
    if (!zoomSrc) return undefined;
    function onKey(e) {
      if (e.key === 'Escape') setZoomSrc(null);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [zoomSrc]);

  async function handlePhotoUpload(e) {
    const files = Array.from(e.target.files || []).slice(0, 3 - photos.length);
    if (!files.length) return;
    setPhotoBusy(true);
    try {
      const added = await Promise.all(files.map((f) => readFileAsDataUrl(f)));
      setPhotos((prev) => [...prev, ...added].slice(0, 3));
    } finally {
      setPhotoBusy(false);
      e.target.value = '';
    }
  }

  function removePhoto(i) {
    setPhotos((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!rating) {
      setError('Please select a star rating.');
      return;
    }
    setBusy(true);
    try {
      const { review } = await api.addReview(productId, { rating, comment, photos });
      setReviews((prev) => [review, ...prev]);
      setSummary((s) => ({
        count: s.count + 1,
        average: Math.round((((s.average * s.count) + rating) / (s.count + 1)) * 10) / 10,
      }));
      setRating(0);
      setComment('');
      setPhotos([]);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
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
      </div>

      {reviews.length > 0 && (
        <div className="reviews-grid">
          {reviews.map((r) => (
            <div className="review-card" key={r.id}>
              <Stars value={r.rating} readOnly size={13} />
              {r.comment && <p className="review-comment">{r.comment}</p>}
              {r.photos?.length > 0 && (
                <div className="review-photos">
                  {r.photos.map((src, i) => (
                    <button type="button" key={i} className="review-photo-thumb" onClick={() => setZoomSrc(src)}>
                      <img src={src} alt="Customer photo" />
                    </button>
                  ))}
                </div>
              )}
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

            <div className="photo-upload-row">
              {photos.map((src, i) => (
                <div className="photo-upload-thumb" key={i}>
                  <img src={src} alt="" />
                  <button type="button" onClick={() => removePhoto(i)} aria-label="Remove photo">×</button>
                </div>
              ))}
              {photos.length < 3 && (
                <button type="button" className="photo-add-btn" disabled={photoBusy} onClick={() => photoInput.current?.click()}>
                  {photoBusy ? '…' : '+ Photo'}
                </button>
              )}
              <input ref={photoInput} type="file" accept="image/*" multiple hidden onChange={handlePhotoUpload} />
            </div>
            <p className="photo-hint">Add up to 3 photos of the saree you received.</p>

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

      {zoomSrc && (
        <div className="photo-lightbox" onClick={() => setZoomSrc(null)}>
          <button type="button" className="lightbox-close" aria-label="Close">×</button>
          <img src={zoomSrc} alt="Customer photo, zoomed" onClick={(e) => e.stopPropagation()} />
        </div>
      )}

      <style>{`
        .reviews-block { margin-top: 44px; padding-top: 36px; border-top: 1px solid var(--stone-200); }
        .reviews-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 18px; }
        .reviews-head h3 { font-family: var(--font-display); font-size: 20px; color: var(--maroon-900); margin: 0 0 8px; }
        .summary-line { display: flex; align-items: center; gap: 10px; font-size: 13px; color: var(--ink-600); }
        .no-reviews { font-size: 13px; color: var(--ink-400); margin: 0; }

        .reviews-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
          gap: 14px;
          max-height: 560px;
          overflow-y: auto;
          padding: 4px 6px 4px 2px;
          margin: 0 0 24px;
          scrollbar-width: thin;
          scrollbar-color: var(--stone-300) transparent;
        }
        .reviews-grid::-webkit-scrollbar { width: 6px; }
        .reviews-grid::-webkit-scrollbar-thumb { background: var(--stone-300); border-radius: 999px; }
        .review-card {
          background: var(--paper);
          border: 1px solid var(--stone-200);
          border-radius: var(--radius-md);
          box-shadow: 0 4px 14px rgba(36,26,23,0.05);
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .review-comment { font-size: 13px; line-height: 1.6; color: var(--ink-700); margin: 0; flex: 1; }
        .review-photos { display: flex; gap: 6px; }
        .review-photo-thumb {
          width: 54px; height: 54px; border-radius: var(--radius-sm); overflow: hidden;
          border: 1px solid var(--stone-200); padding: 0; background: none; cursor: zoom-in;
        }
        .review-photo-thumb img { width: 100%; height: 100%; object-fit: cover; }
        .review-meta { display: flex; justify-content: space-between; font-size: 11.5px; color: var(--ink-400); }
        .review-name { font-weight: 600; color: var(--ink-900); }

        .review-form-wrap { max-width: 440px; }
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
        .photo-upload-row { display: flex; gap: 8px; flex-wrap: wrap; }
        .photo-upload-thumb {
          position: relative; width: 56px; height: 56px;
          border-radius: var(--radius-sm); overflow: hidden; border: 1px solid var(--stone-200);
        }
        .photo-upload-thumb img { width: 100%; height: 100%; object-fit: cover; }
        .photo-upload-thumb button {
          position: absolute; top: 2px; right: 2px; width: 16px; height: 16px;
          border-radius: 50%; background: rgba(0,0,0,0.6); color: #fff; border: none;
          font-size: 11px; line-height: 1; display: flex; align-items: center; justify-content: center;
        }
        .photo-add-btn {
          width: 56px; height: 56px; border-radius: var(--radius-sm);
          border: 1px dashed var(--stone-300); background: none; font-size: 11px; color: var(--ink-400);
        }
        .photo-hint { font-size: 11px; color: var(--ink-400); margin: -6px 0 0; }
        .review-error { font-size: 12.5px; color: #a13a3a; margin: 0; }
        .review-form .btn { align-self: flex-start; }
        .login-prompt { font-size: 13px; color: var(--ink-600); }
        .login-prompt a { color: var(--gold-600); border-bottom: 1px solid var(--gold-500); }

        .photo-lightbox {
          position: fixed; inset: 0; z-index: 200;
          background: rgba(20,10,10,0.88);
          display: flex; align-items: center; justify-content: center;
          padding: 32px;
          cursor: zoom-out;
        }
        .photo-lightbox img {
          max-width: min(90vw, 640px);
          max-height: 85vh;
          border-radius: var(--radius-md);
          box-shadow: 0 20px 60px rgba(0,0,0,0.5);
          cursor: default;
        }
        .lightbox-close {
          position: absolute; top: 20px; right: 24px;
          width: 40px; height: 40px; border-radius: 50%;
          background: rgba(255,255,255,0.12); color: #fff; border: none; font-size: 22px;
        }

        @media (max-width: 600px) {
          .reviews-grid { grid-template-columns: 1fr; max-height: 460px; }
        }
      `}</style>
    </section>
  );
}
