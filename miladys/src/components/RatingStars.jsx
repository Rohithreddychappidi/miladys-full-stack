// Read-only star rating with partial stars (e.g. 4.3 fills 4.3 of 5).
// Used on product cards and under the product title.
export default function RatingStars({ value = 0, size = 13 }) {
  const pct = Math.max(0, Math.min(100, (Number(value) / 5) * 100));
  return (
    <span className="rating-stars" style={{ fontSize: size }} aria-hidden="true">
      <span className="rating-stars-base">★★★★★</span>
      <span className="rating-stars-fill" style={{ width: `${pct}%` }}>★★★★★</span>
      <style>{`
        .rating-stars { position: relative; display: inline-block; line-height: 1; letter-spacing: 1px; white-space: nowrap; }
        .rating-stars-base { color: var(--stone-200); }
        .rating-stars-fill { position: absolute; inset: 0 auto 0 0; overflow: hidden; color: var(--gold-500); }
      `}</style>
    </span>
  );
}
