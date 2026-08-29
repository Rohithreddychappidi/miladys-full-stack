import { useEffect, useRef, useState } from 'react';
import { api } from '../data/api';

const SWIPE_THRESHOLD = 40; // px of horizontal drag before it counts as a swipe

export default function TestimonialBand() {
  const [testimonials, setTestimonials] = useState([]);
  const [active, setActive] = useState(0);
  const [fading, setFading] = useState(false);
  const timerRef = useRef(null);
  const boxRef = useRef(null);
  const dragRef = useRef({ startX: 0, dx: 0, dragging: false });

  useEffect(() => {
    api.getTestimonials().then(({ testimonials }) => setTestimonials(testimonials)).catch(() => {});
  }, []);

  useEffect(() => {
    if (testimonials.length < 2) return undefined;
    timerRef.current = setInterval(() => {
      goTo((i) => (i + 1) % testimonials.length);
    }, 6500);
    return () => clearInterval(timerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [testimonials.length]);

  function goTo(next) {
    // Crossfade: fade the current card out, swap content while invisible,
    // then fade the new one in — smoother than an abrupt remount-and-pop.
    setFading(true);
    setTimeout(() => {
      setActive(next);
      setFading(false);
    }, 260);
  }

  function goToIndex(i) {
    clearInterval(timerRef.current);
    goTo(((i % testimonials.length) + testimonials.length) % testimonials.length);
  }

  function step(dir) {
    goToIndex(active + dir);
  }

  // Swipe/drag support — every testimonial the admin has added is reachable
  // by swiping left or right, not just by clicking a dot. Pauses auto-play
  // for the drag; the interval effect above restarts it on the next index
  // change since goToIndex clears the running timer.
  function onPointerDown(e) {
    if (testimonials.length < 2) return;
    dragRef.current = { startX: e.clientX, dx: 0, dragging: true };
    boxRef.current?.setPointerCapture?.(e.pointerId);
  }
  function onPointerMove(e) {
    if (!dragRef.current.dragging) return;
    dragRef.current.dx = e.clientX - dragRef.current.startX;
  }
  function onPointerUp() {
    if (!dragRef.current.dragging) return;
    const { dx } = dragRef.current;
    dragRef.current.dragging = false;
    if (dx > SWIPE_THRESHOLD) step(-1);
    else if (dx < -SWIPE_THRESHOLD) step(1);
  }

  if (!testimonials.length) return null;

  const t = testimonials[active];

  return (
    <section className="testimonial-band">
      <div className="container">
        <div
          className="band-box"
          ref={boxRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          {testimonials.length > 1 && (
            <button type="button" className="band-arrow band-arrow-prev" onClick={() => step(-1)} aria-label="Previous testimonial">
              <svg viewBox="0 0 24 24" fill="none"><path d="M15 5l-7 7 7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
          )}

          <div className={`band-copy ${fading ? 'is-fading' : ''}`}>
            <div className="band-stars" aria-label={`${t.rating} out of 5 stars`}>
              {Array.from({ length: 5 }).map((_, i) => (
                <span key={i} className={i < t.rating ? 'filled' : ''}>★</span>
              ))}
            </div>
            <p className="band-text">&ldquo;{t.text}&rdquo;</p>
            <p className="band-name">— {t.name}</p>
          </div>

          <div className={`band-photo-wrap ${fading ? 'is-fading' : ''}`}>
            {t.photo ? (
              <img src={t.photo} alt="" className="band-photo" />
            ) : (
              <div className="band-photo band-photo-fallback">{t.name.charAt(0)}</div>
            )}
          </div>

          {testimonials.length > 1 && (
            <button type="button" className="band-arrow band-arrow-next" onClick={() => step(1)} aria-label="Next testimonial">
              <svg viewBox="0 0 24 24" fill="none"><path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
          )}

          {testimonials.length > 1 && (
            <div className="band-dots">
              {testimonials.map((tt, i) => (
                <button
                  key={tt.id}
                  className={i === active ? 'active' : ''}
                  onClick={() => goToIndex(i)}
                  aria-label={`Show testimonial ${i + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <style>{`
        .testimonial-band { padding: 64px 0; background: var(--stone-100); }
        .band-box {
          position: relative;
          max-width: 860px;
          margin: 0 auto;
          background: var(--paper);
          border-radius: var(--radius-lg);
          box-shadow: 0 16px 40px rgba(36,26,23,0.1);
          padding: 44px 76px 52px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 36px;
          min-height: 168px;
          overflow: hidden;
          touch-action: pan-y;
          cursor: grab;
          user-select: none;
        }
        .band-copy {
          flex: 1;
          opacity: 1;
          transform: translateY(0);
          transition: opacity 0.35s ease, transform 0.4s cubic-bezier(0.19,1,0.22,1);
        }
        .band-copy.is-fading { opacity: 0; transform: translateY(8px); }
        .band-stars { display: flex; gap: 4px; color: var(--gold-500); margin-bottom: 14px; font-size: 17px; }
        .band-stars span { color: var(--stone-200); }
        .band-stars span.filled { color: var(--gold-500); }
        .band-text {
          font-size: 18px;
          line-height: 1.75;
          color: var(--ink-900);
          font-style: italic;
          margin: 0 0 14px;
        }
        .band-name { font-size: 13.5px; color: var(--ink-600); margin: 0; }

        .band-photo-wrap {
          flex: 0 0 auto;
          width: 92px;
          height: 92px;
          opacity: 1;
          transform: translateX(0) scale(1);
          transition: opacity 0.35s ease, transform 0.45s cubic-bezier(0.19,1,0.22,1);
        }
        .band-photo-wrap.is-fading {
          opacity: 0;
          transform: translateX(20px) scale(0.9);
        }
        .band-photo {
          width: 92px;
          height: 92px;
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
          font-size: 32px;
        }

        .band-arrow {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          z-index: 2;
          width: 34px;
          height: 34px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--stone-100);
          border: 1px solid var(--stone-200);
          color: var(--maroon-900);
          transition: background 0.2s ease, border-color 0.2s ease;
        }
        .band-arrow:hover { background: var(--blush-300); border-color: var(--blush-300); }
        .band-arrow svg { width: 15px; height: 15px; }
        .band-arrow-prev { left: 18px; }
        .band-arrow-next { right: 18px; }

        .band-dots {
          position: absolute;
          bottom: 18px;
          left: 56px;
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
        .band-dots button.active { background: var(--maroon-900); width: 18px; }

        @media (max-width: 640px) {
          .band-box {
            flex-direction: column-reverse;
            text-align: center;
            padding: 32px 20px 44px;
            gap: 18px;
          }
          .band-text { font-size: 16px; }
          .band-dots { left: 50%; transform: translateX(-50%); }
          .band-arrow { display: none; }
        }
      `}</style>
    </section>
  );
}
