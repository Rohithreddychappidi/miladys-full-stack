import { useEffect, useRef, useState } from 'react';
import TextReveal from './TextReveal';

export default function Testimonials({ testimonials }) {
  const [active, setActive] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    if (testimonials.length < 2) return undefined;
    timerRef.current = setInterval(() => {
      setActive((i) => (i + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(timerRef.current);
  }, [testimonials.length]);

  if (!testimonials.length) return null;

  return (
    <div className="testimonials">
      <TextReveal as="p" direction="fade" className="eyebrow">Customer Love</TextReveal>
      <TextReveal as="h2" delay={0.08} direction="right" distance={32}>What she said</TextReveal>

      <div className="testimonial-stage">
        {testimonials.map((t, i) => (
          <div key={t.id} className={'testimonial-slide' + (i === active ? ' active' : '')}>
            <div className="stars" aria-label={`${t.rating} out of 5 stars`}>
              {Array.from({ length: 5 }).map((_, s) => (
                <svg
                  key={s}
                  viewBox="0 0 20 20"
                  fill={s < t.rating ? 'currentColor' : 'none'}
                  aria-hidden="true"
                  className={i === active ? 'star-pop' : ''}
                  style={{ '--star-delay': `${s * 0.06}s` }}
                >
                  <path d="M10 1.5l2.6 5.5 6 .8-4.4 4.2 1.1 6-5.3-2.9-5.3 2.9 1.1-6L1.4 7.8l6-.8L10 1.5z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
                </svg>
              ))}
            </div>
            <p className="testimonial-text">&ldquo;{t.text}&rdquo;</p>
            <p className="testimonial-name">— {t.name}</p>
          </div>
        ))}
      </div>

      {testimonials.length > 1 && (
        <div className="testimonial-dots">
          {testimonials.map((t, i) => (
            <button
              key={t.id}
              className={'testimonial-dot' + (i === active ? ' active' : '')}
              onClick={() => setActive(i)}
              aria-label={`Show review ${i + 1}`}
            />
          ))}
        </div>
      )}

      <style>{`
        .testimonials {
          padding: 48px 0 8px;
          text-align: center;
        }
        .testimonials h2 { margin-top: 8px; }
        .testimonial-stage {
          position: relative;
          max-width: 560px;
          margin: 32px auto 0;
          min-height: 150px;
        }
        .testimonial-slide {
          position: absolute;
          inset: 0;
          opacity: 0;
          transform: translateY(8px);
          transition: opacity 0.5s ease, transform 0.5s ease;
          pointer-events: none;
        }
        .testimonial-slide.active {
          opacity: 1;
          transform: translateY(0);
          pointer-events: auto;
          position: relative;
        }
        .stars {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 6px;
          color: var(--gold-500);
          margin: 0 auto 18px;
        }
        .stars svg { width: 26px; height: 26px; }
        .stars svg.star-pop {
          animation: starPop 0.5s cubic-bezier(.2,1.4,.4,1) both;
          animation-delay: var(--star-delay, 0s);
        }
        @keyframes starPop {
          0% { opacity: 0; transform: scale(0.3) rotate(-12deg); }
          70% { opacity: 1; transform: scale(1.15) rotate(3deg); }
          100% { opacity: 1; transform: scale(1) rotate(0deg); }
        }
        .testimonial-text {
          font-size: 16px;
          line-height: 1.7;
          color: var(--ink-900);
          font-style: italic;
        }
        .testimonial-name {
          margin-top: 14px;
          font-size: 13px;
          color: var(--ink-600);
        }
        .testimonial-dots {
          display: flex;
          justify-content: center;
          gap: 7px;
          margin-top: 24px;
        }
        .testimonial-dot {
          width: 6px;
          height: 6px;
          border-radius: 999px;
          background: var(--stone-200);
          border: none;
          padding: 0;
          transition: background 0.2s ease, width 0.2s ease;
        }
        .testimonial-dot.active { background: var(--maroon-900); width: 18px; }
      `}</style>
    </div>
  );
}
