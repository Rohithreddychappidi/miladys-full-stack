import { useEffect, useState } from 'react';
import ProductCard from './ProductCard';
import ScrollReveal from './ScrollReveal';
import TextReveal from './TextReveal';
import { getProducts } from '../data/store';

// Deterministic-ish shuffle so it doesn't feel identical to the featured grid on Home
function pick(products, count, excludeId) {
  const pool = products.filter((p) => p.id !== excludeId);
  const shuffled = [...pool].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

export default function RecommendedProducts({ excludeId, title = 'Recommended For You' }) {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    setProducts(pick(getProducts(), 4, excludeId));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [excludeId]);

  if (products.length === 0) return null;

  return (
    <section className="recommended">
      <div className="container">
        <TextReveal as="p" direction="fade" className="eyebrow">You might also like</TextReveal>
        <TextReveal as="h2" delay={0.08} direction="left" distance={32}>{title}</TextReveal>
        <ScrollReveal delay={0.15} className="recommended-grid">
          {products.map((p) => (
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
