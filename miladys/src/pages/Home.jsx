import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import CategoryShowcase from '../components/CategoryShowcase';
import HeroSlider from '../components/HeroSlider';
import ProductCard from '../components/ProductCard';
import RecommendedProducts from '../components/RecommendedProducts';
import ScrollReveal from '../components/ScrollReveal';
import Seo, { SITE_NAME, SITE_URL } from '../components/Seo';
import TestimonialBand from '../components/TestimonialBand';
import TextReveal from '../components/TextReveal';
import { api } from '../data/api';
import { getCategories, getProducts } from '../data/store';

const defaults = {
  hero: {
    eyebrow: "Milady's Premium Sarees",
    heading: 'tradition in every',
    heading2: 'thread',
    subheading: "Handwoven silks and everyday weaves, sourced directly from India's weaving clusters and curated for the modern woman.",
    ctaLabel: 'Order Now',
    ctaLink: '/products',
    slides: [],
  },
  showcase: {
    note: "Milady's combination of heritage weave and modern drape helps create a look that's as timeless as you are.",
    heading: 'Our Collections',
  },
  featured: {
    eyebrow: 'This week',
    heading: 'Featured Sarees',
  },
  story: {
    eyebrow: 'Our craft',
    heading: 'Woven by hand, worn with intention',
    body: "Every Milady's saree is sourced directly from weaving families across Kanchipuram, Varanasi and the Coromandel coast. We work with a small circle of artisans so each piece keeps its handloom character — no two drapes are quite the same.",
    ctaLabel: 'Read our story',
    ctaLink: '/about',
    image: 'https://images.unsplash.com/photo-1692992193981-d3d92fabd9cb?auto=format&fit=crop&w=1200&q=80',
  },
};

export default function Home() {
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [hero, setHero] = useState(defaults.hero);
  const [showcase, setShowcase] = useState(defaults.showcase);
  const [featured, setFeatured] = useState(defaults.featured);
  const [story, setStory] = useState(defaults.story);
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
        const byKey = Object.fromEntries(sections.map((s) => [s.section_key, s.content]));
        if (byKey.hero) setHero({ ...defaults.hero, ...byKey.hero });
        if (byKey.showcase) setShowcase({ ...defaults.showcase, ...byKey.showcase });
        if (byKey.featured) setFeatured({ ...defaults.featured, ...byKey.featured });
        if (byKey.story) setStory({ ...defaults.story, ...byKey.story });
        if (byKey.promo_banner) setPromo(byKey.promo_banner);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="home">
      <Seo
        path="/"
        description="Milady's — handwoven silk and everyday sarees sourced directly from India's weaving clusters. Shop Kanjivaram, Banarasi, bridal and organza sarees online."
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'Organization',
          name: SITE_NAME,
          url: SITE_URL,
          logo: `${SITE_URL}/images/logo-white.png`,
          sameAs: [],
        }}
      />
      <section className="hero">
        <div className="hero-visual" id="page-hero">
          <HeroSlider slides={hero.slides} mobileSlides={hero.mobileSlides} />
        </div>
        <div className="hero-card-wrap">
          <div className="container hero-card">
            <TextReveal as="p" direction="fade" className="eyebrow">
              {hero.eyebrow}
            </TextReveal>
            <TextReveal as="h1" delay={0.1} direction="left" distance={40} className="hero-title">
              {hero.heading}
              <span className="hero-title-script">{hero.heading2}</span>
            </TextReveal>
            <TextReveal as="p" delay={0.2} direction="right" distance={30} className="hero-sub">
              {hero.subheading}
            </TextReveal>
            <TextReveal as="div" delay={0.3} direction="fade">
              <Link to={hero.ctaLink || '/products'} className="btn btn-primary">{hero.ctaLabel || 'Order Now'}</Link>
            </TextReveal>
          </div>
        </div>
      </section>

      <section className="collections">
        <div className="sparkle-bg sparkle-bg-a" aria-hidden="true">
          <img src="/images/sparkle-bg.svg" alt="" />
        </div>
        <div className="sparkle-bg sparkle-bg-b" aria-hidden="true">
          <img src="/images/sparkle-bg.svg" alt="" />
        </div>
        <div className="container">
          <ScrollReveal>
            <CategoryShowcase categories={categories} note={showcase.note} heading={showcase.heading} />
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
        <div className="sparkle-bg sparkle-bg-featured" aria-hidden="true">
          <img src="/images/sparkle-bg.svg" alt="" />
        </div>
        <div className="container">
          <div className="section-head">
            <div>
              <TextReveal as="p" direction="fade" className="eyebrow">{featured.eyebrow}</TextReveal>
              <TextReveal as="h2" delay={0.08} direction="left" distance={34}>{featured.heading}</TextReveal>
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
        <div className="sparkle-bg sparkle-bg-story" aria-hidden="true">
          <img src="/images/sparkle-bg.svg" alt="" />
        </div>
        <div className="container story-grid">
          <ScrollReveal as="div" className="story-image" y={0} duration={1.3}>
            <img src={story.image} alt={story.heading} />
          </ScrollReveal>
          <div className="story-copy">
            <TextReveal as="p" direction="fade" className="eyebrow">{story.eyebrow}</TextReveal>
            <TextReveal as="h2" delay={0.08} direction="right" distance={36}>{story.heading}</TextReveal>
            <TextReveal as="p" delay={0.16} direction="left" distance={26} className="story-text">
              {story.body}
            </TextReveal>
            <ScrollReveal delay={0.24}>
              <Link to={story.ctaLink || '/about'} className="btn btn-outline">{story.ctaLabel || 'Read our story'}</Link>
            </ScrollReveal>
          </div>
        </div>
      </section>

      <RecommendedProducts />

      <TestimonialBand />

      <style>{`
        .hero {
          position: relative;
          background: var(--paper);
          padding: 0 0 90px;
        }
        .hero-visual {
          position: relative;
        }
        .hero-card-wrap {
          position: relative;
          z-index: 2;
          margin-top: -80px;
          display: flex;
          justify-content: center;
          padding: 0 20px;
        }
        .hero-card {
          background: var(--paper);
          border-radius: var(--radius-lg);
          box-shadow:
            0 28px 64px rgba(20,4,7,0.2),
            0 2px 0 rgba(255,255,255,0.6) inset;
          padding: 48px 60px;
          max-width: 720px;
          text-align: center;
        }
        .hero-card .eyebrow { color: var(--maroon-700); }
        .hero-title {
          margin-top: 18px;
          font-size: 46px;
          line-height: 1.05;
          color: var(--maroon-950);
          font-weight: 400;
        }
        .hero-title-script {
          display: block;
          font-family: var(--font-script);
          font-style: italic;
          font-size: 100px;
          line-height: 1;
          color: var(--maroon-700);
          margin-top: 6px;
        }
        .hero-sub {
          margin: 24px auto 30px;
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
        .collections { background: var(--paper); padding-top: 0; position: relative; overflow: hidden; }
        .collections .container { position: relative; z-index: 1; }
        .sparkle-bg { position: absolute; pointer-events: none; z-index: 0; }
        .sparkle-bg img { width: 100%; height: auto; display: block; }
        .sparkle-bg-a { top: 20px; left: -70px; width: 260px; opacity: 0.12; }
        .sparkle-bg-b { bottom: -20px; right: -60px; width: 300px; opacity: 0.1; }

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

        .featured { background: var(--stone-100); position: relative; overflow: hidden; }
        .featured .container { position: relative; z-index: 1; }
        .sparkle-bg-featured { top: 50%; left: -90px; transform: translateY(-50%); width: 300px; opacity: 0.12; }

        .story-grid {
          position: relative;
          z-index: 1;
          display: grid;
          grid-template-columns: 0.9fr 1.1fr;
          gap: 64px;
          align-items: center;
        }
        .story { position: relative; overflow: hidden; }
        .sparkle-bg-story {
          top: 50%;
          right: -80px;
          transform: translateY(-50%);
          width: 420px;
          opacity: 0.13;
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
          .hero-title { font-size: 34px; }
          .hero-title-script { font-size: 70px; }
          .hero-card { padding: 36px 32px; }
          .hero-card-wrap { margin-top: -56px; }
          .product-grid { grid-template-columns: repeat(2, 1fr); }
          .story-grid { grid-template-columns: 1fr; gap: 32px; }
          .story-image { order: -1; }
        }
        @media (max-width: 600px) {
          .hero { padding-bottom: 44px; }
          .hero-card-wrap { margin-top: -30px; padding: 0 14px; }
          .hero-card { padding: 24px 20px; border-radius: var(--radius-md); }
          .hero-title { font-size: 23px; }
          .hero-title-script { font-size: 44px; }
          .hero-sub { font-size: 13px; margin: 14px auto 18px; }
          .promo-inner { flex-direction: column; align-items: flex-start; }
        }
      `}</style>
    </div>
  );
}
