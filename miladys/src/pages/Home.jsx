import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import CategoryShowcase from '../components/CategoryShowcase';
import HeroSlider from '../components/HeroSlider';
import ProductCard from '../components/ProductCard';
import RecommendedProducts from '../components/RecommendedProducts';
import ScrollReveal from '../components/ScrollReveal';
import TextReveal from '../components/TextReveal';
import { api } from '../data/api';
import { getCategories, getProducts } from '../data/store';

const defaultHero = {
  heading: 'tradition in every',
  subheading: "Handwoven silks and everyday weaves, sourced directly from India's weaving clusters and curated for the modern woman.",
  ctaLabel: 'Order Now',
  ctaLink: '/products',
};

export default function Home() {
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [hero, setHero] = useState(defaultHero);
  const [promo, setPromo] = useState(null);

  useEffect(() => {
    // Categories & products — try the live backend first, fall back to the
    // local seed so the storefront still renders if the API isn't running.
    api.getCategories().then(({ categories }) => setCategories(categories)).catch(() => setCategories(getCategories()));
    api.getProducts().then(({ products }) => setProducts(products)).catch(() => setProducts(getProducts()));

    // Home CMS sections — every block below is editable from the admin panel.
    api
      .getHomeSections()
      .then(({ sections }) => {
        const heroSection = sections.find((s) => s.section_key === 'hero');
        if (heroSection?.content) setHero({ ...defaultHero, ...heroSection.content });
        const promoSection = sections.find((s) => s.section_key === 'promo_banner');
        if (promoSection) setPromo(promoSection.content);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="home">
      <section className="hero">
        <div className="hero-visual">
          <HeroSlider />
        </div>
        <div className="container hero-content">
          <TextReveal as="p" direction="fade" className="eyebrow">
            Milady&apos;s Premium Sarees
          </TextReveal>
          <TextReveal as="h1" delay={0.1} direction="left" distance={40} className="hero-title">
            {hero.heading}
            <span className="hero-title-script">thread</span>
          </TextReveal>
          <TextReveal as="p" delay={0.2} direction="right" distance={30} className="hero-sub">
            {hero.subheading}
          </TextReveal>
          <TextReveal as="div" delay={0.3} direction="fade">
            <Link to={hero.ctaLink || '/products'} className="btn btn-primary">{hero.ctaLabel || 'Order Now'}</Link>
          </TextReveal>
        </div>
      </section>

      <section className="collections">
        <div className="container">
          <ScrollReveal>
            <CategoryShowcase categories={categories} />
          </ScrollReveal>
        </div>
      </section>

      {promo && (
        <section className="promo-banner">
          <div className="container promo-inner">
            <div>
              <h2>{promo.heading}</h2>
              {promo.subheading && <p>{promo.subheading}</p>}
            </div>
            {promo.ctaLabel && (
              <Link to={promo.ctaLink || '/products'} className="btn btn-outline">{promo.ctaLabel}</Link>
            )}
          </div>
        </section>
      )}

      <section className="featured">
        <div className="container">
          <div className="section-head">
            <div>
              <TextReveal as="p" direction="fade" className="eyebrow">This week</TextReveal>
              <TextReveal as="h2" delay={0.08} direction="left" distance={34}>Featured Sarees</TextReveal>
            </div>
          </div>
          <ScrollReveal delay={0.15} className="product-grid">
            {products.slice(0, 4).map((p) => (
              <ProductCard key={p.id} product={p} hidePrice />
            ))}
          </ScrollReveal>
        </div>
      </section>

      <section className="story">
        <div className="container story-grid">
          <ScrollReveal as="div" className="story-image" y={0} duration={1}>
            <img src="https://images.unsplash.com/photo-1692992193981-d3d92fabd9cb?auto=format&fit=crop&w=1200&q=80" alt="Milady's saree detail" />
          </ScrollReveal>
          <div className="story-copy">
            <TextReveal as="p" direction="fade" className="eyebrow">Our craft</TextReveal>
            <TextReveal as="h2" delay={0.08} direction="right" distance={36}>Woven by hand, worn with intention</TextReveal>
            <TextReveal as="p" delay={0.16} direction="left" distance={26} className="story-text">
              Every Milady&apos;s saree is sourced directly from weaving families across
              Kanchipuram, Varanasi and the Coromandel coast. We work with a small
              circle of artisans so each piece keeps its handloom character —
              no two drapes are quite the same.
            </TextReveal>
            <ScrollReveal delay={0.24}>
              <Link to="/about" className="btn btn-outline">Read our story</Link>
            </ScrollReveal>
          </div>
        </div>
      </section>

      <RecommendedProducts />

      <style>{`
        .hero {
          position: relative;
          background: var(--paper);
          padding: 0 0 56px;
        }
        .hero-visual {
          position: relative;
        }
        .hero-content {
          padding-top: 46px;
          max-width: 640px;
          text-align: center;
          margin: 0 auto;
        }
        .hero-content .eyebrow { color: var(--maroon-700); }
        .hero-title {
          margin-top: 18px;
          font-size: 52px;
          line-height: 1.05;
          color: var(--maroon-950);
          font-weight: 400;
        }
        .hero-title-script {
          display: block;
          font-family: var(--font-script);
          font-style: italic;
          font-size: 118px;
          line-height: 1;
          color: var(--maroon-700);
          margin-top: 6px;
        }
        .hero-sub {
          margin: 26px auto 34px;
          max-width: 440px;
          font-size: 15px;
          line-height: 1.7;
          color: var(--ink-600);
        }

        .section-head {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          margin-bottom: 30px;
        }
        .see-all {
          font-size: 13px;
          color: var(--maroon-900);
          border-bottom: 1px solid var(--gold-500);
          padding-bottom: 2px;
        }

        .categories { background: var(--paper); }
        .collections { background: var(--paper); padding-top: 0; }

        .promo-banner { background: var(--maroon-900); padding: 40px 0; }
        .promo-inner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          flex-wrap: wrap;
        }
        .promo-inner h2 { color: var(--ivory); font-size: 24px; margin: 0 0 6px; }
        .promo-inner p { color: var(--blush-300); font-size: 13.5px; margin: 0; }
        .promo-inner .btn-outline { border-color: var(--blush-300); color: var(--ivory); }

        .product-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 26px;
        }

        .featured { background: var(--stone-100); }

        .story-grid {
          display: grid;
          grid-template-columns: 0.9fr 1.1fr;
          gap: 64px;
          align-items: center;
        }
        .story-image {
          border-radius: var(--radius-md);
          overflow: hidden;
          aspect-ratio: 4 / 5;
        }
        .story-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: top center;
        }
        .story-copy p:not(.eyebrow) {
          margin: 20px 0 28px;
          font-size: 15px;
          line-height: 1.8;
          color: var(--ink-600);
          max-width: 460px;
        }

        @media (max-width: 980px) {
          .hero-title { font-size: 38px; }
          .hero-title-script { font-size: 78px; }
          .product-grid { grid-template-columns: repeat(2, 1fr); }
          .story-grid { grid-template-columns: 1fr; gap: 32px; }
          .story-image { order: -1; }
        }
        @media (max-width: 600px) {
          .hero { padding-bottom: 40px; }
          .hero-content { padding-top: 28px; }
          .hero-title { font-size: 32px; }
          .hero-title-script { font-size: 62px; }
          .hero-sub { margin: 16px auto 20px; }
          .promo-inner { flex-direction: column; align-items: flex-start; }
        }
      `}</style>
    </div>
  );
}
