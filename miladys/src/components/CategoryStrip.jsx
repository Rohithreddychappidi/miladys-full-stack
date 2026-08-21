import { Link } from 'react-router-dom';

export default function CategoryStrip({ categories }) {
  return (
    <div className="category-grid">
      {categories.map((c) => (
        <Link key={c.id} to={`/products?category=${c.id}`} className="category-card">
          <div className="category-card-image">
            <img src={c.image} alt="" />
            <span className="category-card-overlay" />
          </div>
          <div className="category-card-label">
            <span className="category-name">{c.name}</span>
            {c.tagline && <span className="category-tagline">{c.tagline}</span>}
          </div>
        </Link>
      ))}

      <style>{`
        .category-grid {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 20px;
        }
        .category-card {
          display: block;
          position: relative;
          border-radius: var(--radius-sm);
          overflow: hidden;
        }
        .category-card-image {
          position: relative;
          aspect-ratio: 3 / 4;
          overflow: hidden;
          background: var(--stone-100);
        }
        .category-card-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: top center;
          transition: transform 0.5s ease;
        }
        .category-card-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(180deg, rgba(44,10,16,0) 45%, rgba(30,8,12,0.82) 100%);
        }
        .category-card:hover .category-card-image img { transform: scale(1.06); }
        .category-card-label {
          position: absolute;
          left: 14px;
          right: 14px;
          bottom: 12px;
        }
        .category-name {
          display: block;
          color: var(--ivory);
          font-size: 14px;
          font-weight: 500;
          letter-spacing: 0.01em;
          line-height: 1.3;
        }
        .category-tagline {
          display: block;
          color: var(--blush-300);
          font-size: 10.5px;
          margin-top: 3px;
          opacity: 0.85;
        }

        @media (max-width: 980px) {
          .category-grid { grid-template-columns: repeat(3, 1fr); gap: 16px; }
        }
        @media (max-width: 600px) {
          .category-grid { grid-template-columns: repeat(2, 1fr); gap: 12px; }
          .category-name { font-size: 12.5px; }
          .category-tagline { display: none; }
        }
      `}</style>
    </div>
  );
}
