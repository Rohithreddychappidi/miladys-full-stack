import { Link } from 'react-router-dom';
import { formatINR } from '../data/store';
import RatingStars from './RatingStars';

export default function ProductCard({ product, hidePrice = false }) {
  const stock = Number(product.stock);
  const outOfStock = stock === 0;
  const lowStock = stock > 0 && stock <= 2;
  const colors = Array.isArray(product.colors) ? product.colors.filter((c) => c && (c.hex || c.name)) : [];
  const discount = product.mrp > product.price
    ? Math.round(((product.mrp - product.price) / product.mrp) * 100)
    : 0;

  return (
    <Link to={`/products/${product.id}`} className={`product-card ${outOfStock ? 'is-out' : ''}`}>
      <div className="product-image">
        <img src={product.image} alt={product.name} loading="lazy" decoding="async" />
        {outOfStock && <span className="badge badge-out">Out of Stock</span>}
        {!hidePrice && !outOfStock && discount > 0 && <span className="badge badge-sale">{discount}% off</span>}
        {lowStock && <span className="badge badge-low">Only {stock} left</span>}
      </div>
      <div className="product-info">
        <p className="product-name">{product.name}</p>
        {product.sku && <p className="product-code-tag">{product.sku}</p>}
        {Number(product.rating_count) > 0 && (
          <div className="card-rating" aria-label={`Rated ${product.rating_avg} out of 5 from ${product.rating_count} reviews`}>
            <RatingStars value={product.rating_avg} size={12} />
            <span>{Number(product.rating_avg).toFixed(1)} ({product.rating_count})</span>
          </div>
        )}
        {colors.length > 1 && (
          <div className="card-colors" aria-label={`Available in ${colors.length} colours: ${colors.map((c) => c.name).join(', ')}`}>
            {colors.slice(0, 5).map((c, i) => (
              <span key={i} className="card-color-dot" style={{ backgroundColor: c.hex || '#48181e' }} title={c.name} />
            ))}
            {colors.length > 5 && <span className="card-colors-more">+{colors.length - 5}</span>}
          </div>
        )}
        {!hidePrice && (
          <div className="product-price">
            <span className="price">{formatINR(product.price)}</span>
            {product.mrp > product.price && <span className="mrp">{formatINR(product.mrp)}</span>}
          </div>
        )}
      </div>

      <style>{`
        .product-card { display: block; }
        .product-image {
          position: relative;
          aspect-ratio: 3 / 4;
          overflow: hidden;
          border-radius: var(--radius-sm);
          background: var(--stone-100);
        }
        .product-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: top center;
          transition: transform 0.5s ease;
        }
        .product-card:hover .product-image img { transform: scale(1.04); }
        .is-out .product-image img { opacity: 0.55; }
        .badge {
          position: absolute;
          top: 10px;
          left: 10px;
          font-size: 10.5px;
          font-weight: 500;
          letter-spacing: 0.04em;
          padding: 5px 10px;
          border-radius: 999px;
        }
        .badge-sale { background: var(--maroon-900); color: var(--blush-300); }
        .badge-out { background: var(--ink-900); color: #fff; }
        .badge-low { left: auto; right: 10px; background: rgba(255, 255, 255, 0.92); color: var(--maroon-900); }
        .card-colors { display: flex; align-items: center; gap: 5px; margin: 0 0 8px; }
        .card-color-dot { width: 12px; height: 12px; border-radius: 50%; border: 1px solid rgba(0, 0, 0, 0.15); }
        .card-colors-more { font-size: 11px; color: var(--ink-400); }
        .product-info { padding: 12px 2px 0; }
        .product-code-tag { font-size: 10.5px; color: var(--ink-400); letter-spacing: 0.04em; margin: -3px 0 5px; }
        .card-rating { display: flex; align-items: center; gap: 5px; margin: -2px 0 6px; font-size: 11.5px; color: var(--ink-400); }
        .product-name {
          font-size: 13.5px;
          color: var(--ink-900);
          margin: 0 0 6px;
          line-height: 1.4;
          font-weight: 400;
        }
        .product-price {
          display: flex;
          align-items: baseline;
          gap: 8px;
        }
        .price { font-size: 14px; font-weight: 600; color: var(--maroon-900); }
        .mrp { font-size: 12px; color: var(--ink-400); text-decoration: line-through; }
      `}</style>
    </Link>
  );
}
