import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import RecommendedProducts from '../components/RecommendedProducts';
import ReviewsCarousel from '../components/ReviewsCarousel';
import Testimonials from '../components/Testimonials';
import CancellationPolicyCard from '../components/CancellationPolicyCard';
import Seo, { SITE_URL } from '../components/Seo';
import { useCart } from '../context/CartContext';
import { api } from '../data/api';
import { formatINR, getProducts } from '../data/store';

export default function ProductDetail() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [testimonials, setTestimonials] = useState([]);
  const [activeImage, setActiveImage] = useState(null);
  const { addItem } = useCart();
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    setAdded(false);
    setQty(1);
    setProduct(null);
    setNotFound(false);
    setActiveImage(null);

    api
      .getProduct(id)
      .then(({ product }) => active && setProduct(product))
      .catch(() => {
        // Backend not reachable — fall back to the local seed so the page
        // still works while the server isn't running.
        const found = getProducts().find((p) => p.id === id);
        if (!active) return;
        if (found) setProduct(found);
        else setNotFound(true);
      });

    api.getTestimonials(id).then(({ testimonials }) => active && setTestimonials(testimonials)).catch(() => {});
    return () => { active = false; };
  }, [id]);

  if (notFound) {
    return (
      <div className="container" style={{ padding: '80px 32px' }}>
        <p>We couldn&apos;t find that saree.</p>
        <Link to="/products" className="btn btn-outline" style={{ marginTop: 16 }}>Back to products</Link>
      </div>
    );
  }

  // While the product is loading (or if the fetch is slow), keep a
  // full-height placeholder here instead of rendering nothing. Returning
  // null collapses <main> to zero height for a moment, which pulls the
  // Footer directly up under the Navbar — visible as a flash of the
  // footer right after tapping a product, before the real content pops
  // in and pushes it back down.
  if (!product) {
    return <div className="detail-page" style={{ minHeight: '100vh' }} />;
  }

  const outOfStock = product.stock === 0;
  // Cover image plus any gallery photos, de-duplicated, so admins can
  // re-upload the same photo as both without it showing twice.
  const gallery = [product.image, ...(product.images || [])].filter((src, i, arr) => src && arr.indexOf(src) === i);
  const mainImage = activeImage || gallery[0];
  // Social/search crawlers need a fetchable http(s) image URL — a few
  // gallery photos uploaded through the admin panel are stored as base64
  // data URLs, which those crawlers can't use, so fall back to the site
  // default image in that case rather than pointing at an unusable URL.
  const ogImage = mainImage?.startsWith('http') ? mainImage : undefined;

  function handleAdd() {
    addItem(product, qty);
    setAdded(true);
  }

  return (
    <div className="detail-page">
      <Seo
        title={product.name}
        path={`/products/${product.id}`}
        description={(product.description || `${product.name} — handwoven saree from Milady's.`).slice(0, 160)}
        image={ogImage}
        type="product"
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'Product',
          name: product.name,
          description: product.description || undefined,
          image: gallery.filter((src) => src?.startsWith('http')),
          sku: product.id,
          offers: {
            '@type': 'Offer',
            url: `${SITE_URL}/products/${product.id}`,
            priceCurrency: 'INR',
            price: product.price,
            availability: outOfStock
              ? 'https://schema.org/OutOfStock'
              : 'https://schema.org/InStock',
          },
        }}
      />
      <div className="sparkle-bg sparkle-bg-detail" aria-hidden="true">
        <img src="/images/sparkle-bg.svg" alt="" />
      </div>
      <div className="container detail-grid">
        <div className="detail-gallery">
          <div className="detail-image">
            <img src={mainImage} alt={product.name} />
          </div>
          {gallery.length > 1 && (
            <div className="detail-thumbs">
              {gallery.map((src, i) => (
                <button
                  type="button"
                  key={i}
                  className={`detail-thumb ${src === mainImage ? 'active' : ''}`}
                  onClick={() => setActiveImage(src)}
                  aria-label={`View photo ${i + 1}`}
                >
                  <img src={src} alt="" />
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="detail-info">
          <Link to="/products" className="back-link">← All products</Link>
          <h1>{product.name}</h1>
          <div className="detail-price">
            <span className="price">{formatINR(product.price)}</span>
            {product.mrp > product.price && <span className="mrp">{formatINR(product.mrp)}</span>}
          </div>
          <p className="desc">{product.description}</p>
          <p className={`stock ${outOfStock ? 'out' : ''}`}>
            {outOfStock ? 'Currently out of stock' : `${product.stock} in stock`}
          </p>

          {!outOfStock && (
            <div className="qty-row">
              <span>Quantity</span>
              <div className="qty-control">
                <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Decrease quantity">−</button>
                <span>{qty}</span>
                <button type="button" onClick={() => setQty((q) => Math.min(product.stock, q + 1))} aria-label="Increase quantity">+</button>
              </div>
            </div>
          )}

          <div className="detail-actions">
            <button className="btn btn-primary" disabled={outOfStock} onClick={handleAdd}>
              {outOfStock ? 'Notify Me' : added ? 'Added ✓' : 'Add to Cart'}
            </button>
            {!outOfStock && (
              <button
                className="btn btn-outline"
                onClick={() => { addItem(product, qty); navigate('/checkout'); }}
              >
                Buy Now
              </button>
            )}
          </div>
          {added && <Link to="/cart" className="view-cart-link">View cart →</Link>}

          <CancellationPolicyCard />
        </div>
      </div>

      <div className="container">
        <Testimonials testimonials={testimonials} />
        <ReviewsCarousel productId={product.id} />
      </div>

      <RecommendedProducts excludeId={product.id} />

      <style>{`
        .detail-page { padding: 56px 0 0; position: relative; overflow: hidden; }
        .sparkle-bg { position: absolute; pointer-events: none; z-index: 0; }
        .sparkle-bg img { width: 100%; height: auto; display: block; }
        .sparkle-bg-detail { top: 120px; left: -90px; width: 280px; opacity: 0.12; }
        .detail-grid {
          position: relative;
          z-index: 1;
          display: grid;
          grid-template-columns: 0.9fr 1.1fr;
          gap: 60px;
          margin-bottom: 70px;
        }
        .detail-gallery { display: flex; flex-direction: column; gap: 12px; }
        .detail-image {
          border-radius: var(--radius-md);
          overflow: hidden;
          aspect-ratio: 3 / 4;
        }
        .detail-image img { width: 100%; height: 100%; object-fit: cover; object-position: top center; }
        .detail-thumbs { display: flex; gap: 10px; flex-wrap: wrap; }
        .detail-thumb {
          width: 64px;
          height: 64px;
          border-radius: var(--radius-sm);
          overflow: hidden;
          padding: 0;
          border: 2px solid transparent;
          background: none;
          cursor: pointer;
          opacity: 0.7;
        }
        .detail-thumb img { width: 100%; height: 100%; object-fit: cover; }
        .detail-thumb:hover { opacity: 1; }
        .detail-thumb.active { border-color: var(--maroon-900); opacity: 1; }
        .back-link { font-size: 13px; color: var(--ink-400); margin-bottom: 18px; display: inline-block; }
        .detail-info h1 { font-size: 30px; margin-bottom: 16px; }
        .detail-price { display: flex; align-items: baseline; gap: 12px; margin-bottom: 22px; }
        .detail-price .price { font-size: 24px; font-weight: 600; color: var(--maroon-900); }
        .detail-price .mrp { font-size: 15px; color: var(--ink-400); text-decoration: line-through; }
        .desc { font-size: 14.5px; line-height: 1.8; color: var(--ink-600); max-width: 480px; margin-bottom: 20px; }
        .stock { font-size: 13px; color: var(--ink-600); margin-bottom: 22px; }
        .stock.out { color: #a13a3a; }
        .qty-row { display: flex; align-items: center; gap: 16px; margin-bottom: 26px; font-size: 13px; color: var(--ink-600); }
        .qty-control {
          display: flex;
          align-items: center;
          gap: 14px;
          border: 1px solid var(--stone-200);
          border-radius: 999px;
          padding: 7px 16px;
        }
        .qty-control button {
          background: none;
          border: none;
          font-size: 16px;
          color: var(--maroon-900);
          width: 18px;
        }
        .detail-actions { display: flex; gap: 12px; }
        .btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .view-cart-link { display: inline-block; margin-top: 14px; font-size: 13px; color: var(--gold-600); border-bottom: 1px solid var(--gold-500); }
        @media (max-width: 860px) {
          .detail-grid { grid-template-columns: 1fr; gap: 28px; margin-bottom: 40px; }
        }
      `}</style>
    </div>
  );
}
