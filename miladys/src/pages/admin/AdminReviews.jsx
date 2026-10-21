import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../data/api';

// Admin → Reviews. Customers who bought a saree can review it from its
// product page (or the "Write a review" links in My Orders and the
// delivered email). With approval on, new and edited reviews wait in
// "Waiting for approval" until published here.
const TABS = [
  { key: 'pending', label: 'Waiting for approval' },
  { key: 'published', label: 'Published' },
  { key: 'hidden', label: 'Hidden' },
  { key: 'all', label: 'All' },
];
const STATUS_LABEL = { pending: 'Waiting for approval', published: 'Published', hidden: 'Hidden' };

export default function AdminReviews() {
  const [reviews, setReviews] = useState([]);
  const [requireApproval, setRequireApproval] = useState(true);
  const [tab, setTab] = useState('pending');
  const [error, setError] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [zoomSrc, setZoomSrc] = useState(null);

  useEffect(() => {
    refresh(true);
  }, []);

  function refresh(first = false) {
    api.getAdminReviews()
      .then(({ reviews: list, requireApproval: req }) => {
        setReviews(list);
        window.dispatchEvent(new Event('admin-messages-changed')); // refresh menu badge
        setRequireApproval(req !== false);
        // Open on "Published" when nothing is waiting.
        if (first && !list.some((r) => r.status === 'pending')) setTab('published');
        setLoaded(true);
      })
      .catch((err) => setError(err.message));
  }

  const counts = useMemo(() => ({
    pending: reviews.filter((r) => r.status === 'pending').length,
    published: reviews.filter((r) => r.status === 'published').length,
    hidden: reviews.filter((r) => r.status === 'hidden').length,
    all: reviews.length,
  }), [reviews]);
  const visible = tab === 'all' ? reviews : reviews.filter((r) => r.status === tab);

  async function setPublished(review, publish) {
    try {
      await api.approveReview(review.id, publish);
      refresh();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this review? This can\'t be undone.')) return;
    try {
      await api.deleteReview(id);
      refresh();
    } catch (err) {
      setError(err.message);
    }
  }

  async function toggleApprovalSetting(e) {
    const value = e.target.checked;
    setRequireApproval(value);
    try {
      await api.updateReviewSettings({ requireApproval: value });
    } catch (err) {
      setRequireApproval(!value);
      setError(err.message);
    }
  }

  return (
    <div>
      <div className="admin-page-head">
        <h1>Reviews</h1>
        <p>
          Customers who bought a saree can rate and review it at the bottom of its product page. They&apos;re reminded with
          a &ldquo;Write a review&rdquo; link in My Orders and in the &ldquo;Delivered&rdquo; email (sent when you mark an order delivered).
        </p>
      </div>

      <label className="approval-setting">
        <input type="checkbox" checked={requireApproval} onChange={toggleApprovalSetting} disabled={!loaded} />
        <span>
          <strong>Approve reviews before they appear on the website</strong>
          <small>{requireApproval ? 'New and edited reviews wait here until you publish them.' : 'Reviews appear on the website straight away. You can still hide any of them.'}</small>
        </span>
      </label>

      {error && <p className="admin-error">{error}</p>}

      <div className="review-tabs" role="tablist">
        {TABS.map((t) => (
          <button key={t.key} type="button" role="tab" aria-selected={tab === t.key} className={'review-tab' + (tab === t.key ? ' active' : '') + (t.key === 'pending' && counts.pending ? ' has-pending' : '')} onClick={() => setTab(t.key)}>
            {t.label} <span className="count">{counts[t.key]}</span>
          </button>
        ))}
      </div>

      <div className="cms-list">
        {loaded && visible.length === 0 && (
          <p className="empty">{tab === 'pending' ? 'Nothing waiting for approval.' : 'No reviews here.'}</p>
        )}
        {visible.map((r) => (
          <div className={`review-row status-${r.status}`} key={r.id}>
            <div className="review-row-main">
              <div className="review-row-head">
                <Link to={`/products/${r.product_id}#reviews`} target="_blank" rel="noreferrer" className="review-product">{r.product_name} ↗</Link>
                <span className="stars" aria-label={`${r.rating} out of 5`}>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
                <span className={`review-status s-${r.status}`}>{STATUS_LABEL[r.status] || r.status}</span>
              </div>
              {r.comment && <p>{r.comment}</p>}
              {r.photos?.length > 0 && (
                <div className="review-photos">
                  {r.photos.map((src, i) => (
                    <button type="button" key={i} onClick={() => setZoomSrc(src)} aria-label="Enlarge photo">
                      <img src={src} alt="" loading="lazy" />
                    </button>
                  ))}
                </div>
              )}
              <span className="review-by">
                {r.user_name} · {r.user_email} · {new Date(r.created_at).toLocaleDateString('en-IN')}
                {r.updated_at && ` · edited ${new Date(r.updated_at).toLocaleDateString('en-IN')}`}
                {' · '}
                {r.verified ? <span className="verified">✓ Bought this saree</span> : <span className="unverified">No paid order for this saree</span>}
              </span>
            </div>
            <div className="row-actions">
              {r.status !== 'published' && <button className="publish" onClick={() => setPublished(r, true)}>Publish</button>}
              {r.status !== 'hidden' && <button onClick={() => setPublished(r, false)}>Hide</button>}
              <button onClick={() => handleDelete(r.id)} className="danger">Delete</button>
            </div>
          </div>
        ))}
      </div>

      {zoomSrc && (
        <div className="photo-zoom" onClick={() => setZoomSrc(null)} role="presentation">
          <img src={zoomSrc} alt="Customer photo" />
        </div>
      )}

      <style>{`
        .admin-page-head { margin-bottom: 22px; }
        .admin-page-head h1 { font-size: 26px; margin-bottom: 8px; }
        .admin-page-head p { font-size: 13px; color: var(--ink-400); max-width: 640px; line-height: 1.6; }
        .admin-error { font-size: 12.5px; color: #a13a3a; margin-bottom: 16px; }
        .empty { color: var(--ink-400); font-size: 13.5px; background: var(--paper); padding: 22px; border-radius: var(--radius-md); }

        .approval-setting { display: flex; gap: 12px; align-items: flex-start; background: var(--paper); border-radius: var(--radius-md); padding: 14px 18px; margin-bottom: 18px; max-width: 640px; cursor: pointer; }
        .approval-setting input { width: 18px; height: 18px; margin-top: 2px; flex: none; }
        .approval-setting strong { display: block; font-size: 13.5px; color: var(--ink-900); font-weight: 600; }
        .approval-setting small { display: block; font-size: 12px; color: var(--ink-400); margin-top: 3px; }

        .review-tabs { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 14px; }
        .review-tab { padding: 8px 14px; border-radius: 999px; border: 1px solid var(--stone-200); background: var(--paper); font-size: 12.5px; color: var(--ink-600); cursor: pointer; }
        .review-tab.active { background: var(--maroon-900); border-color: var(--maroon-900); color: var(--ivory); }
        .review-tab.has-pending:not(.active) { border-color: var(--maroon-800); color: var(--maroon-900); font-weight: 600; }
        .review-tab .count { opacity: 0.7; margin-left: 4px; }

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
        .review-row.status-pending { box-shadow: inset 3px 0 0 var(--maroon-800); }
        .review-row.status-hidden { opacity: 0.7; }
        .review-row-main { flex: 1; min-width: 0; }
        .review-row-head { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; margin-bottom: 4px; }
        .review-product { font-size: 13.5px; font-weight: 600; color: var(--ink-900); text-decoration: none; }
        .review-product:hover { color: var(--maroon-900); }
        .stars { color: var(--gold-500); font-size: 12px; }
        .review-status { font-size: 10.5px; padding: 2px 8px; border-radius: 999px; background: var(--stone-100); color: var(--ink-600); }
        .review-status.s-pending { background: #f6e3e3; color: var(--maroon-900); }
        .review-status.s-published { background: #e8f2e6; color: #3c7a3c; }
        .review-row-main p { margin: 4px 0; font-size: 13px; color: var(--ink-600); white-space: pre-wrap; }
        .review-photos { display: flex; gap: 6px; margin: 8px 0; }
        .review-photos button { width: 60px; height: 60px; padding: 0; border: 1px solid var(--stone-200); border-radius: var(--radius-sm); overflow: hidden; background: none; cursor: zoom-in; }
        .review-photos img { width: 100%; height: 100%; object-fit: cover; }
        .review-by { font-size: 11.5px; color: var(--ink-400); }
        .verified { color: #1e7039; }
        .unverified { color: #8a5a10; }
        .row-actions { display: flex; gap: 12px; flex: 0 0 auto; }
        .row-actions button { background: none; border: none; font-size: 12.5px; color: var(--maroon-900); cursor: pointer; }
        .row-actions .publish { font-weight: 600; }
        .row-actions .danger { color: #a13a3a; }
        .photo-zoom { position: fixed; inset: 0; z-index: 100; background: rgba(20,10,10,0.85); display: flex; align-items: center; justify-content: center; cursor: zoom-out; padding: 30px; }
        .photo-zoom img { max-width: min(90vw, 700px); max-height: 85vh; border-radius: var(--radius-md); }
        @media (max-width: 640px) { .review-row { flex-direction: column; } }
      `}</style>
    </div>
  );
}
