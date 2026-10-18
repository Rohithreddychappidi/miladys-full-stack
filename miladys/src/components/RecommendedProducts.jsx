import { useEffect, useMemo, useState } from 'react';
import ProductCard from './ProductCard';
import { loadProductPool } from '../data/catalog';
import ScrollReveal from './ScrollReveal';
import TextReveal from './TextReveal';

// Deterministic-ish shuffle so it doesn't feel identical to the featured grid on Home
function pickRandom(products, count, excludeId) {
  const pool = products.filter((p) => p.id !== excludeId);
  const shuffled = [...pool].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

// `products` is a list the page already fetched (Home, ProductDetail,
// Orders). Pages that don't pass one (Cart, Checkout, Products, About,
// Contact, Profile) get a small pool of recent products fetched here —
// before, those strips silently rendered nothing. `curatedIds` is the
// admin's hand-picked list from /admin/home, in their order; when empty,
// it's a random pick.
export default function RecommendedProducts({ products, curatedIds = [], excludeId, title = 'Recommended For You' }) {
  const [ownPool, setOwnPool] = useState([]);
  const selfLoad = products === undefined;
  useEffect(() => {
    if (!selfLoad) return undefined;
    let active = true;
    loadProductPool({ ids: curatedIds }).then((pool) => active && setOwnPool(pool)).catch(() => {});
    return () => { active = false; };
    // curatedIds only matters on first load; re-fetching on every render's new [] would loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selfLoad]);
  const source = selfLoad ? ownPool : products;

  // Picked once per product list, so the strip doesn't reshuffle on every re-render.
  const picked = useMemo(() => (
    curatedIds.length > 0
      ? curatedIds.map((id) => source.find((p) => p.id === id)).filter((p) => p && p.id !== excludeId)
      : pickRandom(source.filter((p) => Number(p.stock) !== 0), 4, excludeId)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ), [source, excludeId, curatedIds.join(',')]);

  if (picked.length === 0) return null;

  return (
    <section className="recommended">
      <div className="container">
        <TextReveal as="p" direction="fade" className="eyebrow">You might also like</TextReveal>
        <TextReveal as="h2" delay={0.08} direction="left" distance={32}>{title}</TextReveal>
        <ScrollReveal delay={0.15} className="recommended-grid">
          {picked.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </ScrollReveal>
      </div>

      <style>{`
        .recommended { background: var(--stone-100); }
        .recommended h2 { font-size: 26px; margin: 8px 0 30px; }
        .recommended-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 26px;
        }
        @media (max-width: 980px) {
          .recommended-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 520px) {
          .recommended-grid { gap: 16px; }
        }
      `}</style>
    </section>
  );
}
