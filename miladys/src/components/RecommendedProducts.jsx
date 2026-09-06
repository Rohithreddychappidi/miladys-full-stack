import ProductCard from './ProductCard';
import ScrollReveal from './ScrollReveal';
import TextReveal from './TextReveal';

// Deterministic-ish shuffle so it doesn't feel identical to the featured grid on Home
function pickRandom(products, count, excludeId) {
  const pool = products.filter((p) => p.id !== excludeId);
  const shuffled = [...pool].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

// `products` is the already-fetched live catalog (passed down from the
// page, not fetched here — see Home.jsx / ProductDetail.jsx). `curatedIds`
// is the admin's hand-picked list from the "Recommended Sarees" section in
// /admin/home, in the order they set it; when empty, falls back to a
// random pick from the real catalog, same as before.
export default function RecommendedProducts({ products = [], curatedIds = [], excludeId, title = 'Recommended For You' }) {
  const picked = curatedIds.length > 0
    ? curatedIds.map((id) => products.find((p) => p.id === id)).filter((p) => p && p.id !== excludeId)
    : pickRandom(products, 4, excludeId);

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
