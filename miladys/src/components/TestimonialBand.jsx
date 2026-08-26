import { useEffect, useRef, useState } from 'react';
import { api } from '../data/api';

export default function TestimonialBand() {
  const [testimonials, setTestimonials] = useState([]);
  const [active, setActive] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    api.getTestimonials().then(({ testimonials }) => setTestimonials(testimonials)).catch(() => {});
  }, []);

  useEffect(() => {
    if (testimonials.length < 2) return undefined;
    timerRef.current = setInterval(() => {
      setActive((i) => (i + 1) % testimonials.length);
    }, 6000);
    return () => clearInterval(timerRef.current);
  }, [testimonials.length]);

  if (!testimonials.length) return null;

  const t = testimonials[active];

  return (
    <section className="testimonial-band">
      <div className="container">
        <div className="band-box">
          <div className="band-copy" key={t.id}>
            <div className="band-stars" aria-label={`${t.rating} out of 5 stars`}>
              {Array.from({ length: 5 }).map((_, i) => (
                <span key={i} className={i < t.rating ? 'filled' : ''}>★</span>
              ))}
            </div>
            <p className="band-text">&ldquo;{t.text}&rdquo;</p>
            <p className="band-name">— {t.name}</p>
          </div>

          <div className="band-photo-wrap" key={`photo-${t.id}`}>
            {t.photo ? (
              <img src={t.photo} alt="" className="band-photo" />
            ) : (
              <div className="band-photo band-photo-fallback">{t.name.charAt(0)}</div>
            )}
          </div>

          {testimonials.length > 1 && (
            <div className="band-dots">
              {testimonials.map((tt, i) => (
                <button
                  key={tt.id}
                  className={i === active ? 'active' : ''}
                  onClick={() => setActive(i)}
                  aria-label={`Show testimonial ${i + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <style>{`
        .testimonial-band { padding: 56px 0; background: var(--stone-100); }
        .band-box {
          position: relative;
          max-width: 760px;
          margin: 0 auto;
          background: var(--paper);
          border-radius: var(--radius-lg);
          box-shadow: 0 10px 30px rgba(36,26,23,0.08);
          padding: 32px 40px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 28px;
          min-height: 130px;
          overflow: hidden;
        }
        .band-copy { flex: 1; animation: bandFadeIn 0.6s ease both; }
        .band-stars { display: flex; gap: 3px; color: var(--gold-500); margin-bottom: 10px; font-size: 15px; }
        .band-stars span { color: var(--stone-200); }
        .band-stars span.filled { color: var(--gold-500); }
        .band-text {
          font-size: 15px;
          line-height: 1.7;
          color: var(--ink-900);
          font-style: italic;
          margin: 0 0 10px;
        }
        .band-name { font-size: 12.5px; color: var(--ink-600); margin: 0; }

        .band-photo-wrap {
          flex: 0 0 auto;
          width: 76px;
          height: 76px;
          animation: bandPhotoIn 0.6s cubic-bezier(.2,.8,.3,1) both;
        }
        .band-photo {
          width: 76px;
          height: 76px;
          border-radius: 50%;
          object-fit: cover;
          border: 3px solid var(--blush-300);
        }
        .band-photo-fallback {
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--blush-300);
          color: var(--maroon-900);
          font-weight: 600;
          font-size: 26px;
        }

        @keyframes bandFadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes bandPhotoIn {
          from { opacity: 0; transform: translateX(28px) scale(0.85); }
          to { opacity: 1; transform: translateX(0) scale(1); }
        }

        .band-dots {
          position: absolute;
          bottom: 14px;
          left: 40px;
          display: flex;
          gap: 6px;
        }
        .band-dots button {
          width: 6px;
          height: 6px;
          border-radius: 999px;
          background: var(--stone-200);
          border: none;
          padding: 0;
          transition: background 0.2s ease, width 0.2s ease;
        }
        .band-dots button.active { background: var(--maroon-900); width: 16px; }

        @media (max-width: 640px) {
          .band-box {
            flex-direction: column-reverse;
            text-align: center;
            padding: 28px 24px 40px;
            gap: 16px;
          }
          .band-dots { left: 50%; transform: translateX(-50%); }
        }
      `}</style>
    </section>
  );
}
