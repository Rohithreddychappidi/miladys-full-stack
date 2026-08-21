import { Link } from 'react-router-dom';
import { formatINR } from '../data/store';

export default function ProductCard({ product, hidePrice = false }) {
  const outOfStock = product.stock === 0;
  const discount = product.mrp > product.price
    ? Math.round(((product.mrp - product.price) / product.mrp) * 100)
    : 0;

  return (
    <Link to={`/products/${product.id}`} className={`product-card ${outOfStock ? 'is-out' : ''}`}>
      <div className="product-image">
        <img src={product.image} alt={product.name} />
        {outOfStock && <span className="badge badge-out">Out of Stock</span>}
        {!hidePrice && !outOfStock && discount > 0 && <span className="badge badge-sale">{discount}% off</span>}
      </div>
      <div className="product-info">
        <p className="product-name">{product.name}</p>
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
        .product-info { padding: 12px 2px 0; }
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
