import { useEffect, useState, useRef, useCallback } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import RecommendedProducts from '../components/RecommendedProducts';
import ReviewsCarousel from '../components/ReviewsCarousel';
import Testimonials from '../components/Testimonials';
import CancellationPolicyCard from '../components/CancellationPolicyCard';
import Seo, { SITE_URL } from '../components/Seo';
import { useCart } from '../context/CartContext';
import { api } from '../data/api';
import { formatINR, getProducts } from '../data/store';
import { loadProductPool } from '../data/catalog';
import { thumbUrl } from '../utils/images';

export default function ProductDetail() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [testimonials, setTestimonials] = useState([]);
  const [activeImage, setActiveImage] = useState(null);
  const [selectedColor, setSelectedColor] = useState(null);
  const [allProducts, setAllProducts] = useState(null);
  const [recommended, setRecommended] = useState({ heading: 'Recommended For You', productIds: [] });

  // Hover zoom lens state
  const [isZooming, setIsZooming] = useState(false);
  const [zoomOrigin, setZoomOrigin] = useState({ x: 50, y: 50 });
  const imageContainerRef = useRef(null);

  // Fullscreen Lightbox modal state
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxZoom, setLightboxZoom] = useState(1);
  const [panPos, setPanPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  // Touch/mouse gesture tracking for the lightbox (pinch, pan, swipe, double-tap).
  const pointersRef = useRef(new Map());
  const gestureRef = useRef({ mode: null, lastTap: 0 });
  const lightboxImgRef = useRef(null);
  const viewportRef = useRef(null);

  const { addItem } = useCart();
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    api.getHomeSection('recommended')
      .then(({ section }) => {
        if (!active) return null;
        if (section?.content) setRecommended((prev) => ({ ...prev, ...section.content }));
        return loadProductPool({ ids: section?.content?.productIds || [] });
      })
      .catch(() => loadProductPool())
      .then((pool) => active && pool && setAllProducts(pool))
      .catch(() => active && setAllProducts([]));
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    setAdded(false);
    setQty(1);
    setProduct(null);
    setNotFound(false);
    setActiveImage(null);
    setSelectedColor(null);
    setLightboxOpen(false);
    setLightboxZoom(1);

    api
      .getProduct(id)
      .then(({ product: p }) => {
        if (!active) return;
        setProduct(p);
        if (Array.isArray(p?.colors) && p.colors.length > 0) {
          setSelectedColor(p.colors[0]);
          if (p.colors[0].image) setActiveImage(p.colors[0].image);
        }
      })
      .catch(() => {
        const found = getProducts().find((p) => p.id === id);
        if (!active) return;
        if (found) {
          setProduct(found);
          if (Array.isArray(found?.colors) && found.colors.length > 0) {
            setSelectedColor(found.colors[0]);
            if (found.colors[0].image) setActiveImage(found.colors[0].image);
          }
        } else {
          setNotFound(true);
        }
      });

    api.getTestimonials(id).then(({ testimonials }) => active && setTestimonials(testimonials)).catch(() => {});
    return () => { active = false; };
  }, [id]);

  // Gallery resolution based on selected color vs base product
  const colors = Array.isArray(product?.colors) ? product.colors : [];
  let colorPhotos = [];
  if (selectedColor) {
    colorPhotos = [selectedColor.image, ...(selectedColor.images || [])].filter(Boolean);
  }
  const basePhotos = [product?.image, ...(product?.images || [])].filter(Boolean);
  const gallery = (colorPhotos.length > 0 ? colorPhotos : basePhotos).filter((src, i, arr) => arr.indexOf(src) === i);
  const mainImage = activeImage || gallery[0] || product?.image;

  // Show the small thumbnail straight away, then swap in the full-size
  // photo (needed for the fabric zoom) once it has downloaded — the page
  // no longer waits on a large image before anything appears.
  const [loadedFull, setLoadedFull] = useState(null);
  useEffect(() => {
    if (!mainImage || thumbUrl(mainImage) === mainImage) return undefined;
    let active = true;
    const img = new Image();
    img.onload = () => active && setLoadedFull(mainImage);
    img.src = mainImage;
    return () => { active = false; };
  }, [mainImage]);
  const displayImage = loadedFull === mainImage ? mainImage : thumbUrl(mainImage);

  // Store WhatsApp number (Admin → Home Page → Footer links), for "Ask on WhatsApp".
  const [whatsapp, setWhatsapp] = useState('');
  useEffect(() => {
    let active = true;
    api.getHomeSection('social_links')
      .then(({ section }) => active && setWhatsapp(String(section?.content?.whatsapp || '').replace(/\D/g, '')))
      .catch(() => {});
    return () => { active = false; };
  }, []);

  const [shareNote, setShareNote] = useState('');

  // Sticky "Add to Cart" bar on phones: shown once the real buttons have
  // scrolled up out of view, hidden again when they come back.
  const actionsRef = useRef(null);
  const [showStickyBar, setShowStickyBar] = useState(false);
  // A plain (rAF-throttled) scroll check rather than IntersectionObserver:
  // a fast fling can jump straight from "below the screen" to "above it",
  // which an observer never reports.
  useEffect(() => {
    if (!product) return undefined;
    let frame = 0;
    function update() {
      frame = 0;
      const el = actionsRef.current;
      if (el) setShowStickyBar(el.getBoundingClientRect().bottom < 0);
    }
    function onScroll() {
      if (!frame) frame = requestAnimationFrame(update);
    }
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [product]);

  // Handle color change
  function handleSelectColor(colorObj) {
    setSelectedColor(colorObj);
    const photos = [colorObj.image, ...(colorObj.images || [])].filter(Boolean);
    if (photos.length > 0) {
      setActiveImage(photos[0]);
    }
  }

  // Stock for selected color variant vs overall product
  const effectiveStock = selectedColor && Number.isFinite(Number(selectedColor.stock))
    ? Number(selectedColor.stock)
    : (product?.stock ?? 0);
  const outOfStock = effectiveStock === 0;

  // Hover magnifier handler
  function handleMouseMove(e) {
    if (!imageContainerRef.current) return;
    const rect = imageContainerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
    setZoomOrigin({ x, y });
  }

  // Keyboard navigation for Lightbox
  const handleKeyDown = useCallback((e) => {
    if (!lightboxOpen) return;
    if (e.key === 'Escape') {
      setLightboxOpen(false);
      setLightboxZoom(1);
    } else if (e.key === 'ArrowRight') {
      const idx = gallery.indexOf(mainImage);
      if (idx !== -1 && idx < gallery.length - 1) setActiveImage(gallery[idx + 1]);
      else if (gallery.length > 0) setActiveImage(gallery[0]);
    } else if (e.key === 'ArrowLeft') {
      const idx = gallery.indexOf(mainImage);
      if (idx > 0) setActiveImage(gallery[idx - 1]);
      else if (gallery.length > 0) setActiveImage(gallery[gallery.length - 1]);
    }
  }, [lightboxOpen, gallery, mainImage]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // ---- Lightbox gestures (pointer events = mouse, touch and pen alike) ----
  // Pinch: zoom 1x-4x. Drag: pan while zoomed (kept within the photo's
  // edges). Double-tap (touch) / click (mouse): zoom in at that spot, or
  // back out. Swipe left/right while not zoomed: next/previous photo.
  const MAX_ZOOM = 4;

  function clampPan(pan, zoom) {
    const img = lightboxImgRef.current;
    if (!img || zoom <= 1) return { x: 0, y: 0 };
    const maxX = ((zoom - 1) * img.offsetWidth) / 2;
    const maxY = ((zoom - 1) * img.offsetHeight) / 2;
    return { x: Math.max(-maxX, Math.min(maxX, pan.x)), y: Math.max(-maxY, Math.min(maxY, pan.y)) };
  }

  // Zoom to `zoom`, keeping the screen point (clientX, clientY) where it is.
  function zoomAt(zoom, clientX, clientY, fromZoom = lightboxZoom, fromPan = panPos) {
    // Anything within 5% of 1x snaps back to exactly 1x, centred.
    const next = zoom < 1.05 ? 1 : Math.min(MAX_ZOOM, zoom);
    const img = lightboxImgRef.current;
    if (!img || next === 1) {
      setLightboxZoom(1);
      setPanPos({ x: 0, y: 0 });
      return;
    }
    const rect = viewportRef.current.getBoundingClientRect();
    const ox = clientX - (rect.left + rect.width / 2);
    const oy = clientY - (rect.top + rect.height / 2);
    // Point under the finger, in unscaled image coordinates.
    const ix = (ox - fromPan.x) / fromZoom;
    const iy = (oy - fromPan.y) / fromZoom;
    setLightboxZoom(next);
    setPanPos(clampPan({ x: ox - ix * next, y: oy - iy * next }, next));
  }

  function showPhoto(step) {
    if (gallery.length < 2) return;
    const idx = gallery.indexOf(mainImage);
    setActiveImage(gallery[(idx + step + gallery.length) % gallery.length]);
    setLightboxZoom(1);
    setPanPos({ x: 0, y: 0 });
  }

  function pinchInfo() {
    const [a, b] = [...pointersRef.current.values()];
    return { dist: Math.hypot(a.x - b.x, a.y - b.y), cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2 };
  }

  function startGesture() {
    const g = gestureRef.current;
    const pts = [...pointersRef.current.values()];
    g.startZoom = lightboxZoom;
    g.startPan = panPos;
    if (pts.length >= 2) {
      const { dist, cx, cy } = pinchInfo();
      Object.assign(g, { mode: 'pinch', startDist: dist, cx, cy, moved: true });
    } else if (pts.length === 1) {
      Object.assign(g, { mode: lightboxZoom > 1 ? 'pan' : 'swipe', startX: pts[0].x, startY: pts[0].y, moved: false });
    }
  }

  function handleViewportPointerDown(e) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY, type: e.pointerType });
    startGesture();
    setIsDragging(true);
  }

  function handleViewportPointerMove(e) {
    if (!pointersRef.current.has(e.pointerId)) return;
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY, type: e.pointerType });
    const g = gestureRef.current;
    if (g.mode === 'pinch' && pointersRef.current.size >= 2) {
      const { dist, cx, cy } = pinchInfo();
      zoomAt(g.startZoom * (dist / g.startDist), cx, cy, g.startZoom, g.startPan);
    } else if (g.mode === 'pan') {
      const dx = e.clientX - g.startX;
      const dy = e.clientY - g.startY;
      if (Math.abs(dx) + Math.abs(dy) > 6) g.moved = true;
      setPanPos(clampPan({ x: g.startPan.x + dx, y: g.startPan.y + dy }, lightboxZoom));
    } else if (g.mode === 'swipe') {
      if (Math.abs(e.clientX - g.startX) + Math.abs(e.clientY - g.startY) > 10) g.moved = true;
    }
  }

  function handleViewportPointerUp(e) {
    const pt = pointersRef.current.get(e.pointerId);
    if (!pt) return;
    pointersRef.current.delete(e.pointerId);
    const g = gestureRef.current;

    if (pointersRef.current.size > 0) {
      // One finger lifted from a pinch: carry on panning with the other.
      startGesture();
      g.moved = true;
      return;
    }
    setIsDragging(false);

    if (g.mode === 'swipe' && g.moved) {
      const dx = e.clientX - g.startX;
      const dy = e.clientY - g.startY;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) showPhoto(dx < 0 ? 1 : -1);
    } else if (!g.moved && e.type === 'pointerup') {
      // A tap: mouse click toggles zoom; on touch it takes a double-tap, so
      // a single tap or the start of a swipe never zooms by accident.
      const now = Date.now();
      const isDoubleTap = now - g.lastTap < 300;
      if (pt.type === 'mouse' || isDoubleTap) {
        if (lightboxZoom > 1) { setLightboxZoom(1); setPanPos({ x: 0, y: 0 }); }
        else zoomAt(2.5, e.clientX, e.clientY);
        g.lastTap = 0;
      } else {
        g.lastTap = now;
      }
    }
    g.mode = null;
  }

  // Mouse wheel / trackpad pinch zoom (needs a non-passive listener to stop
  // the page behind from scrolling).
  useEffect(() => {
    const el = viewportRef.current;
    if (!lightboxOpen || !el) return undefined;
    function onWheel(e) {
      e.preventDefault();
      const factor = Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0025));
      zoomAt(lightboxZoom * factor, e.clientX, e.clientY);
    }
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  });

  if (notFound) {
    return (
      <div className="container" style={{ padding: '80px 32px' }}>
        <p>We couldn&apos;t find that saree.</p>
        <Link to="/products" className="btn btn-outline" style={{ marginTop: 16 }}>Back to products</Link>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="detail-page" aria-busy="true" aria-label="Loading saree">
        <div className="container detail-grid detail-skeleton">
          <div className="skel skel-image" />
          <div>
            <div className="skel skel-line" style={{ width: '30%' }} />
            <div className="skel skel-title" />
            <div className="skel skel-line" style={{ width: '25%', height: 22 }} />
            <div className="skel skel-line" />
            <div className="skel skel-line" style={{ width: '85%' }} />
            <div className="skel skel-line" style={{ width: '60%' }} />
            <div className="skel skel-button" />
          </div>
        </div>
        <style>{`
          .detail-page { padding: 56px 0 0; }
          .detail-skeleton { display: grid; grid-template-columns: 1fr 1fr; gap: 56px; margin-bottom: 70px; }
          .skel {
            background: linear-gradient(90deg, var(--stone-100) 25%, #f3eee8 37%, var(--stone-100) 63%);
            background-size: 400% 100%;
            animation: skel-shimmer 1.3s ease-in-out infinite;
            border-radius: var(--radius-sm);
          }
          .skel-image { aspect-ratio: 3 / 4; border-radius: var(--radius-md); }
          .skel-title { height: 34px; width: 70%; margin: 14px 0 18px; }
          .skel-line { height: 14px; width: 100%; margin-bottom: 12px; }
          .skel-button { height: 48px; width: 60%; margin-top: 28px; border-radius: 999px; }
          @keyframes skel-shimmer { 0% { background-position: 100% 0; } 100% { background-position: 0 0; } }
          @media (prefers-reduced-motion: reduce) { .skel { animation: none; } }
          @media (max-width: 860px) { .detail-skeleton { grid-template-columns: 1fr; gap: 28px; } }
        `}</style>
      </div>
    );
  }

  const ogImage = mainImage?.startsWith('http') ? mainImage : undefined;

  function handleAdd() {
    addItem(product, qty, selectedColor?.name, mainImage);
    setAdded(true);
  }

  const productUrl = `${SITE_URL}/products/${product.id}`;
  const productLabel = selectedColor?.name ? `${product.name} (${selectedColor.name})` : product.name;
  const whatsappHref = whatsapp
    ? `https://wa.me/${whatsapp}?text=${encodeURIComponent(`Hi Milady's, I'd like to know more about ${productLabel} — ${productUrl}`)}`
    : '';

  // Phone share sheet where available; otherwise copy the link.
  async function handleShare() {
    const data = { title: product.name, text: `${productLabel} at Milady's`, url: productUrl };
    try {
      if (navigator.share) {
        await navigator.share(data);
        return;
      }
      await navigator.clipboard.writeText(productUrl);
      setShareNote('Link copied');
    } catch (err) {
      if (err?.name === 'AbortError') return; // closed the share sheet
      setShareNote('Copy this link: ' + productUrl);
    }
    setTimeout(() => setShareNote(''), 2500);
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
        {/* Gallery with Interactive Fabric Zoom */}
        <div className="detail-gallery">
          <div
            ref={imageContainerRef}
            className={`detail-image ${isZooming ? 'zooming' : ''}`}
            onPointerEnter={(e) => e.pointerType === 'mouse' && setIsZooming(true)}
            onPointerLeave={() => setIsZooming(false)}
            onMouseMove={handleMouseMove}
            onClick={() => { setIsZooming(false); setLightboxOpen(true); setLightboxZoom(1); setPanPos({ x: 0, y: 0 }); }}
            role="button"
            tabIndex={0}
            aria-label="Click to inspect saree fabric and weave in full screen"
          >
            <img
              src={displayImage}
              alt={product.name}
              fetchPriority="high"
              style={{
                transformOrigin: `${zoomOrigin.x}% ${zoomOrigin.y}%`,
                transform: isZooming ? 'scale(2.4)' : 'scale(1)',
              }}
            />
            <div className="zoom-hint-badge">
              <span className="zoom-icon">🔍</span>
              <span className="hint-mouse">Hover to zoom weave &middot; Click for full size</span>
              <span className="hint-touch">Tap to view full size &middot; Pinch to zoom the weave</span>
            </div>
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
                  <img src={thumbUrl(src)} alt="" loading="lazy" decoding="async" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Info with Breadcrumbs without Category */}
        <div className="detail-info">
          {/* Breadcrumbs without category: Home > Product name */}
          <nav className="detail-breadcrumbs" aria-label="Breadcrumb">
            <Link to="/" className="breadcrumb-link">Home</Link>
            <span className="breadcrumb-sep" aria-hidden="true">&gt;</span>
            <span className="breadcrumb-current" aria-current="page">{product.name}</span>
          </nav>

          <h1>{product.name}</h1>
          <div className="detail-price">
            <span className="price">{formatINR(product.price)}</span>
            {product.mrp > product.price && <span className="mrp">{formatINR(product.mrp)}</span>}
          </div>

          <p className="desc">{product.description}</p>

          {/* Color Selection with separate photos per color */}
          {colors.length > 0 && (
            <div className="color-section">
              <div className="color-header">
                <span className="color-title">Color:</span>
                <span className="color-name">{selectedColor?.name || 'Choose a color'}</span>
              </div>
              <div className="color-swatches" role="radiogroup" aria-label="Choose saree color">
                {colors.map((c, idx) => {
                  const isSelected = selectedColor?.name === c.name;
                  return (
                    <button
                      key={c.name || idx}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      className={`color-swatch-btn ${isSelected ? 'active' : ''}`}
                      onClick={() => handleSelectColor(c)}
                      title={c.name}
                    >
                      <span
                        className="color-swatch-circle"
                        style={{ backgroundColor: c.hex || '#681822' }}
                      />
                      <span className="color-swatch-label">{c.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <p className={`stock ${outOfStock ? 'out' : ''}`}>
            {outOfStock ? 'Currently out of stock' : `${effectiveStock} in stock`}
          </p>

          {!outOfStock && (
            <div className="qty-row">
              <span>Quantity</span>
              <div className="qty-control">
                <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Decrease quantity">−</button>
                <span>{qty}</span>
                <button type="button" onClick={() => setQty((q) => Math.min(effectiveStock, q + 1))} aria-label="Increase quantity">+</button>
              </div>
            </div>
          )}

          <div className="detail-actions" ref={actionsRef}>
            <button className="btn btn-primary" disabled={outOfStock} onClick={handleAdd}>
              {outOfStock ? 'Notify Me' : added ? 'Added ✓' : 'Add to Cart'}
            </button>
            {!outOfStock && (
              <button
                className="btn btn-outline"
                onClick={() => {
                  addItem(product, qty, selectedColor?.name, mainImage);
                  navigate('/checkout');
                }}
              >
                Buy Now
              </button>
            )}
          </div>
          {added && <Link to="/cart" className="view-cart-link">View cart →</Link>}

          <div className="detail-secondary-actions">
            {whatsappHref && (
              <a className="ask-whatsapp" href={whatsappHref} target="_blank" rel="noreferrer">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="currentColor" d="M12.04 2a9.9 9.9 0 0 0-8.5 15l-1.4 5 5.2-1.4A9.9 9.9 0 1 0 12.04 2Zm0 18.1a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3.1.8.8-3-.2-.3a8.2 8.2 0 1 1 7 3.9Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.5l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3Z" />
                </svg>
                Ask about this saree on WhatsApp
              </a>
            )}
            <button type="button" className="share-btn" onClick={handleShare}>
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M12 3v12M7 8l5-5 5 5M5 14v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Share
            </button>
            {shareNote && <span className="share-note" role="status">{shareNote}</span>}
          </div>

          <CancellationPolicyCard />
        </div>
      </div>

      <div className="container">
        <Testimonials testimonials={testimonials} />
        <ReviewsCarousel productId={product.id} />
      </div>

      <RecommendedProducts
        products={allProducts || []}
        curatedIds={recommended.productIds}
        title={recommended.heading}
        excludeId={product.id}
      />

      {/* Phones: compact add-to-cart bar once the main buttons scroll away */}
      <div className={`sticky-buy ${showStickyBar && !lightboxOpen ? 'is-visible' : ''}`} aria-hidden={!showStickyBar}>
        <img src={thumbUrl(mainImage)} alt="" />
        <div className="sticky-buy-info">
          <span className="sticky-buy-name">{productLabel}</span>
          <span className="sticky-buy-price">{formatINR(product.price)}</span>
        </div>
        <button className="btn btn-primary" disabled={outOfStock} onClick={handleAdd} tabIndex={showStickyBar ? 0 : -1}>
          {outOfStock ? 'Sold out' : added ? 'Added ✓' : 'Add to Cart'}
        </button>
      </div>

      {/* Fullscreen Fabric & Weave Lightbox Modal */}
      {lightboxOpen && (
        <div className="lightbox-overlay" onClick={() => setLightboxOpen(false)}>
          <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
            <div className="lightbox-toolbar">
              <span className="lightbox-title">
                {product.name} {selectedColor ? `— ${selectedColor.name}` : ''}
              </span>
              <div className="lightbox-actions">
                <button
                  type="button"
                  className="lightbox-btn"
                  onClick={() => {
                    const r = viewportRef.current.getBoundingClientRect();
                    zoomAt(lightboxZoom + 0.5, r.left + r.width / 2, r.top + r.height / 2);
                  }}
                  title="Zoom In"
                  aria-label="Zoom in on fabric"
                >
                  +
                </button>
                <button
                  type="button"
                  className="lightbox-btn"
                  onClick={() => {
                    const r = viewportRef.current.getBoundingClientRect();
                    zoomAt(lightboxZoom - 0.5, r.left + r.width / 2, r.top + r.height / 2);
                  }}
                  title="Zoom Out"
                  aria-label="Zoom out"
                >
                  −
                </button>
                <button
                  type="button"
                  className="lightbox-btn"
                  onClick={() => { setLightboxZoom(1); setPanPos({ x: 0, y: 0 }); }}
                  title="Reset Zoom"
                >
                  Reset
                </button>
                <button
                  type="button"
                  className="lightbox-btn close-btn"
                  onClick={() => setLightboxOpen(false)}
                  title="Close (Esc)"
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>
            </div>

            <div
              ref={viewportRef}
              className={`lightbox-viewport ${lightboxZoom > 1 ? 'draggable' : ''}`}
              onPointerDown={handleViewportPointerDown}
              onPointerMove={handleViewportPointerMove}
              onPointerUp={handleViewportPointerUp}
              onPointerCancel={handleViewportPointerUp}
            >
              <img
                ref={lightboxImgRef}
                src={mainImage}
                alt={product.name}
                draggable={false}
                className={`lightbox-image ${isDragging ? 'is-gesturing' : ''}`}
                style={{
                  transform: `translate(${panPos.x}px, ${panPos.y}px) scale(${lightboxZoom})`,
                  cursor: lightboxZoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'zoom-in',
                }}
              />
              {lightboxZoom === 1 && (
                <p className="lightbox-gesture-hint">
                  {gallery.length > 1 ? 'Pinch or double-tap to zoom · Swipe for more photos' : 'Pinch or double-tap to zoom'}
                </p>
              )}
            </div>

            {gallery.length > 1 && (
              <>
                <button
                  type="button"
                  className="lightbox-nav-btn prev"
                  onClick={() => showPhoto(-1)}
                  aria-label="Previous photo"
                >
                  ‹
                </button>
                <button
                  type="button"
                  className="lightbox-nav-btn next"
                  onClick={() => showPhoto(1)}
                  aria-label="Next photo"
                >
                  ›
                </button>

                <div className="lightbox-thumbs">
                  {gallery.map((src, i) => (
                    <button
                      key={i}
                      type="button"
                      className={`lightbox-thumb ${src === mainImage ? 'active' : ''}`}
                      onClick={() => { setActiveImage(src); setLightboxZoom(1); setPanPos({ x: 0, y: 0 }); }}
                    >
                      <img src={thumbUrl(src)} alt="" />
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <style>{`
        .detail-page { padding: 56px 0 0; position: relative; overflow: hidden; }
        .sparkle-bg { position: absolute; pointer-events: none; z-index: 0; }
        .sparkle-bg img { width: 100%; height: auto; display: block; }
        .sparkle-bg-detail { top: 120px; left: -90px; width: 280px; opacity: 0.12; }
        .detail-grid {
          position: relative;
          z-index: 1;
          display: grid;
          grid-template-columns: 0.95fr 1.05fr;
          gap: 60px;
          margin-bottom: 70px;
        }

        /* Gallery & Hover Magnifier */
        .detail-gallery { display: flex; flex-direction: column; gap: 14px; }
        .detail-image {
          border-radius: var(--radius-md);
          overflow: hidden;
          aspect-ratio: 3 / 4;
          position: relative;
          background: #fbf7f4;
          cursor: crosshair;
        }
        .detail-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: top center;
          transition: transform 0.2s ease-out;
          will-change: transform;
        }
        .zoom-hint-badge {
          position: absolute;
          bottom: 12px;
          left: 12px;
          right: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 8px 14px;
          background: rgba(255, 255, 255, 0.88);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          border-radius: 999px;
          font-size: 11.5px;
          color: var(--ink-700);
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
          pointer-events: none;
          transition: opacity 0.2s ease;
        }
        .detail-image.zooming .zoom-hint-badge {
          opacity: 0;
        }

        .detail-thumbs { display: flex; gap: 10px; flex-wrap: wrap; }
        .detail-thumb {
          width: 68px;
          height: 72px;
          border-radius: var(--radius-sm);
          overflow: hidden;
          padding: 0;
          border: 2px solid transparent;
          background: none;
          cursor: pointer;
          opacity: 0.7;
          transition: border-color 0.2s, opacity 0.2s;
        }
        .detail-thumb img { width: 100%; height: 100%; object-fit: cover; }
        .detail-thumb:hover { opacity: 1; }
        .detail-thumb.active { border-color: var(--maroon-900); opacity: 1; }

        /* Breadcrumbs without categories: Home > Product name */
        .detail-breadcrumbs {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 8px;
          font-size: 13px;
          color: var(--ink-400);
          margin-bottom: 16px;
        }
        .breadcrumb-link {
          color: var(--ink-400);
          text-decoration: none;
          transition: color 0.2s;
        }
        .breadcrumb-link:hover {
          color: var(--maroon-900);
        }
        .breadcrumb-sep {
          color: var(--stone-300);
          font-size: 11px;
        }
        .breadcrumb-current {
          color: var(--ink-800);
          font-weight: 500;
        }

        .detail-info h1 { font-size: 30px; margin-bottom: 14px; color: var(--maroon-950); }
        .detail-price { display: flex; align-items: baseline; gap: 12px; margin-bottom: 20px; }
        .detail-price .price { font-size: 24px; font-weight: 600; color: var(--maroon-900); }
        .detail-price .mrp { font-size: 15px; color: var(--ink-400); text-decoration: line-through; }
        .desc { font-size: 14.5px; line-height: 1.8; color: var(--ink-600); max-width: 480px; margin-bottom: 22px; }

        /* Color Selection */
        .color-section {
          margin-bottom: 24px;
          padding: 16px 0;
          border-top: 1px solid var(--stone-200);
          border-bottom: 1px solid var(--stone-200);
        }
        .color-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 12px;
          font-size: 13.5px;
        }
        .color-title { color: var(--ink-600); }
        .color-name { color: var(--maroon-900); font-weight: 600; }
        .color-swatches { display: flex; flex-wrap: wrap; gap: 10px; }
        .color-swatch-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 14px 6px 8px;
          border: 1.5px solid var(--stone-200);
          background: #fff;
          border-radius: 999px;
          cursor: pointer;
          transition: border-color 0.2s, box-shadow 0.2s, transform 0.15s;
        }
        .color-swatch-btn:hover {
          border-color: var(--maroon-700);
          transform: translateY(-1px);
        }
        .color-swatch-btn.active {
          border-color: var(--maroon-900);
          background: #faf4f3;
          box-shadow: 0 2px 8px rgba(72, 24, 30, 0.15);
        }
        .color-swatch-circle {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          border: 1px solid rgba(0, 0, 0, 0.15);
          display: inline-block;
          flex-shrink: 0;
        }
        .color-swatch-label {
          font-size: 12.5px;
          color: var(--ink-800);
          font-weight: 500;
        }

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
          cursor: pointer;
        }
        .detail-actions { display: flex; gap: 12px; }
        .detail-secondary-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 10px 14px; margin-top: 18px; }
        .ask-whatsapp {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 10px 16px; border-radius: 999px;
          background: #1f8f4e; color: #fff; font-size: 13px; font-weight: 500;
          transition: background 0.2s;
        }
        .ask-whatsapp:hover { background: #18773f; }
        .ask-whatsapp svg { width: 18px; height: 18px; flex: none; }
        .share-btn {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 10px 14px; border-radius: 999px;
          border: 1px solid var(--stone-200); background: var(--paper);
          color: var(--ink-700, var(--ink-600)); font-size: 13px;
        }
        .share-btn svg { width: 16px; height: 16px; }
        .share-note { font-size: 12px; color: var(--ink-400); word-break: break-all; }

        .sticky-buy { display: none; }
        @media (max-width: 860px) {
          .sticky-buy {
            display: flex; align-items: center; gap: 10px;
            position: fixed; left: 12px; right: 12px;
            /* sits just above the floating bottom navigation */
            bottom: calc(78px + env(safe-area-inset-bottom, 0px));
            z-index: 85;
            padding: 8px 8px 8px 10px;
            background: rgba(255, 255, 255, 0.96);
            backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
            border: 1px solid var(--stone-200); border-radius: 16px;
            box-shadow: 0 10px 30px rgba(44, 10, 16, 0.18);
            transform: translateY(calc(100% + 100px)); opacity: 0;
            transition: transform 0.28s ease, opacity 0.2s ease;
            pointer-events: none;
          }
          .sticky-buy.is-visible { transform: none; opacity: 1; pointer-events: auto; }
          .sticky-buy img { width: 40px; height: 52px; object-fit: cover; border-radius: 6px; flex: none; }
          .sticky-buy-info { display: flex; flex-direction: column; min-width: 0; flex: 1; }
          .sticky-buy-name { font-size: 12.5px; color: var(--ink-900); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
          .sticky-buy-price { font-size: 13.5px; font-weight: 600; color: var(--maroon-900); }
          .sticky-buy .btn { padding: 11px 16px; font-size: 13px; white-space: nowrap; margin: 0; }
        }
        .btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .view-cart-link { display: inline-block; margin-top: 14px; font-size: 13px; color: var(--gold-600); border-bottom: 1px solid var(--gold-500); }

        /* Fullscreen Lightbox */
        .lightbox-overlay {
          position: fixed;
          inset: 0;
          background: rgba(18, 8, 12, 0.94);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          z-index: 10000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }
        .lightbox-content {
          position: relative;
          width: 100%;
          max-width: 1100px;
          height: 90vh;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .lightbox-toolbar {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 16px;
          color: #fff;
          z-index: 10;
        }
        .lightbox-title { font-size: 14.5px; letter-spacing: 0.05em; color: var(--blush-300); }
        .lightbox-actions { display: flex; gap: 8px; }
        .lightbox-btn {
          background: rgba(255, 255, 255, 0.12);
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: #fff;
          font-size: 13px;
          padding: 6px 14px;
          border-radius: 6px;
          cursor: pointer;
          transition: background 0.2s;
        }
        .lightbox-btn:hover { background: rgba(255, 255, 255, 0.25); }
        .lightbox-btn.close-btn { background: var(--maroon-900); border-color: var(--maroon-700); }
        .lightbox-viewport {
          flex: 1;
          width: 100%;
          min-height: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          position: relative;
          /* All touch gestures here are ours (pinch/pan/swipe), not the browser's. */
          touch-action: none;
          overscroll-behavior: contain;
        }
        .lightbox-image {
          max-width: 85%;
          max-height: 80vh;
          object-fit: contain;
          transform-origin: center center;
          transition: transform 0.18s ease-out;
          user-select: none;
          -webkit-user-drag: none;
          will-change: transform;
        }
        /* Follow the finger exactly while a gesture is in progress. */
        .lightbox-image.is-gesturing { transition: none; }
        .lightbox-gesture-hint {
          position: absolute;
          bottom: 10px;
          left: 50%;
          transform: translateX(-50%);
          margin: 0;
          padding: 6px 12px;
          border-radius: 999px;
          background: rgba(0, 0, 0, 0.45);
          color: rgba(255, 255, 255, 0.85);
          font-size: 11.5px;
          white-space: nowrap;
          pointer-events: none;
          display: none;
        }
        .hint-touch { display: none; }
        @media (hover: none) {
          .hint-mouse { display: none; }
          .hint-touch { display: inline; }
          .lightbox-gesture-hint { display: block; }
        }
        .lightbox-nav-btn {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          background: rgba(255, 255, 255, 0.15);
          border: 1px solid rgba(255, 255, 255, 0.25);
          color: #fff;
          font-size: 32px;
          width: 48px;
          height: 48px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: background 0.2s;
          z-index: 10;
        }
        .lightbox-nav-btn:hover { background: rgba(255, 255, 255, 0.35); }
        .lightbox-nav-btn.prev { left: 16px; }
        .lightbox-nav-btn.next { right: 16px; }
        .lightbox-thumbs {
          display: flex;
          gap: 8px;
          padding: 12px 0 0;
          z-index: 10;
        }
        .lightbox-thumb {
          width: 48px;
          height: 56px;
          border-radius: 4px;
          overflow: hidden;
          padding: 0;
          border: 2px solid transparent;
          background: none;
          cursor: pointer;
          opacity: 0.6;
        }
        .lightbox-thumb.active { border-color: var(--blush-300); opacity: 1; }
        .lightbox-thumb img { width: 100%; height: 100%; object-fit: cover; }

        @media (max-width: 860px) {
          .detail-grid { grid-template-columns: 1fr; gap: 28px; margin-bottom: 40px; }
          .lightbox-nav-btn { display: none; }
          /* Full-screen on phones: every pixel goes to the photo. */
          .lightbox-overlay { padding: 0; }
          .lightbox-content { height: 100vh; height: 100dvh; max-width: none; }
          .lightbox-toolbar { padding: 10px 12px; gap: 10px; }
          .lightbox-title { font-size: 12.5px; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
          .lightbox-actions { gap: 6px; flex: none; }
          .lightbox-btn { padding: 8px 12px; font-size: 14px; }
          .lightbox-image { max-width: 100%; max-height: 100%; }
          .lightbox-thumbs { padding: 10px 12px calc(10px + env(safe-area-inset-bottom)); overflow-x: auto; max-width: 100%; }
          .lightbox-thumb { flex: none; }
        }
      `}</style>
    </div>
  );
}
