import { useEffect, useState } from 'react';
import RecommendedProducts from '../components/RecommendedProducts';
import ScrollReveal from '../components/ScrollReveal';
import Seo from '../components/Seo';
import { api } from '../data/api';

const defaults = {
  hero: {
    eyebrow: "About Milady's",
    heading: 'A saree house built on the weave, not the trend',
  },
  story: {
    heading: 'Our story',
    paragraphs: [
      "Milady's started as a promise to bring genuine handloom sarees — the kind woven over weeks, not printed overnight — to women who want their wardrobe to hold real craft. Based in Kakinada, we work directly with weaving families across South India to source each piece.",
      'Every saree that reaches you has been checked by hand for weave quality, zari work and finish before it leaves our store.',
    ],
    image: 'https://images.unsplash.com/photo-1717585679395-bbe39b5fb6bc?auto=format&fit=crop&w=1200&q=80',
    gallery: [],
  },
};

export default function About() {
  const [hero, setHero] = useState(defaults.hero);
  const [story, setStory] = useState(defaults.story);

  useEffect(() => {
    api
      .getHomeSections()
      .then(({ sections }) => {
        const byKey = Object.fromEntries(sections.map((s) => [s.section_key, s.content]));
        if (byKey.about_hero) setHero({ ...defaults.hero, ...byKey.about_hero });
        if (byKey.about_story) setStory({ ...defaults.story, ...byKey.about_story });
      })
      .catch(() => {});
  }, []);

  const paragraphs = story.paragraphs?.length ? story.paragraphs : defaults.story.paragraphs;

  return (
    <div className="about-page">
      <Seo
        title="About Us"
        path="/about"
        description="Milady's works directly with weaving families across South India to bring genuine, hand-checked handloom sarees to your wardrobe."
      />
      <section className="about-hero">
        <div className="container">
          <p className="eyebrow" style={{ color: 'var(--blush-300)' }}>{hero.eyebrow}</p>
          <h1>{hero.heading}</h1>
        </div>
      </section>

      <section className="about-body">
        <div className="container about-grid">
          <ScrollReveal as="div" className="about-image" y={0} duration={1}>
            <img src={story.image} alt={story.heading} />
          </ScrollReveal>
          <ScrollReveal className="about-copy" delay={0.1}>
            <h2>{story.heading}</h2>
            {paragraphs.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </ScrollReveal>
        </div>

        {story.gallery?.length > 0 && (
          <div className="container">
            <ScrollReveal delay={0.15} className="about-gallery">
              {story.gallery.map((src, i) => (
                <div className="gallery-thumb" key={i}>
                  <img src={src} alt={`${story.heading} ${i + 1}`} />
                </div>
              ))}
            </ScrollReveal>
          </div>
        )}
      </section>

      <section className="about-values">
        <div className="container values-grid">
          <ScrollReveal as="div" className="value-card">
            <h3>Sourced Direct</h3>
            <p>We buy straight from weaving clusters, cutting out layers of middlemen.</p>
          </ScrollReveal>
          <ScrollReveal as="div" className="value-card" delay={0.1}>
            <h3>Hand-Checked</h3>
            <p>Every saree is inspected for weave, zari and finish before dispatch.</p>
          </ScrollReveal>
          <ScrollReveal as="div" className="value-card" delay={0.2}>
            <h3>Kakinada Rooted</h3>
            <p>A local store with a growing catalogue, built one weave at a time.</p>
          </ScrollReveal>
        </div>
      </section>

      <RecommendedProducts />

      <style>{`
        .about-hero {
          background: var(--maroon-950);
          padding: 100px 0 64px;
        }
        .about-hero h1 {
          color: var(--ivory);
          font-size: 40px;
          max-width: 620px;
          margin-top: 14px;
          line-height: 1.25;
        }
        .about-grid {
          display: grid;
          grid-template-columns: 0.9fr 1.1fr;
          gap: 60px;
          align-items: center;
        }
        .about-image {
          border-radius: var(--radius-md);
          overflow: hidden;
          aspect-ratio: 4 / 5;
        }
        .about-image img { width: 100%; height: 100%; object-fit: cover; object-position: top center; }
        .about-copy h2 { font-size: 26px; margin-bottom: 18px; }
        .about-copy p {
          font-size: 14.5px;
          line-height: 1.85;
          color: var(--ink-600);
          margin-bottom: 16px;
          max-width: 480px;
        }
        .about-gallery {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
          gap: 16px;
          margin-top: 44px;
        }
        .gallery-thumb {
          border-radius: var(--radius-sm);
          overflow: hidden;
          aspect-ratio: 1 / 1;
        }
        .gallery-thumb img { width: 100%; height: 100%; object-fit: cover; }
        .about-values { background: var(--stone-100); padding-top: 70px; padding-bottom: 70px; }
        .values-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 28px;
        }
        .value-card {
          background: var(--paper);
          border-radius: var(--radius-md);
          padding: 32px 28px;
        }
        .value-card h3 { font-size: 18px; margin-bottom: 10px; }
        .value-card p { font-size: 13.5px; line-height: 1.7; color: var(--ink-600); }
        @media (max-width: 860px) {
          .about-grid { grid-template-columns: 1fr; gap: 28px; }
          .values-grid { grid-template-columns: 1fr; }
          .about-hero h1 { font-size: 30px; }
        }
      `}</style>
    </div>
  );
}
