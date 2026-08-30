import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import TextReveal from './TextReveal';

const LERP = 0.06;
const CURSOR_DRIFT = 0.022;
const MOBILE_BREAKPOINT = 768;

export default function CategoryShowcase({ categories, note, heading }) {
  const railRef = useRef(null);
  const scrollRef = useRef(null);
  const cardRefs = useRef([]);
  const posRef = useRef(0);
  const targetRef = useRef(0);
  const cursorDxRef = useRef(0);
  const hoveringRef = useRef(false);
  const rafRef = useRef(null);
  const scrollRafRef = useRef(null);
  const settleTimerRef = useRef(null);
  const setWidthRef = useRef(0);
  const [renderPos, setRenderPos] = useState(0);
  const [focusIndex, setFocusIndex] = useState(0);
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth <= MOBILE_BREAKPOINT : false,
  );
  const count = categories.length;

  // On mobile, the strip is a seamless loop: the real category list is
  // repeated three times back to back (before / middle / after). We start
  // scrolled into the middle copy, so the first category opens centered
  // with the true last category peeking on the left and the true second
  // category peeking on the right — exactly like a circular carousel —
  // and swiping past either end silently jumps one full copy-width to the
  // matching, pixel-identical position in the next copy, so it looks like
  // it just keeps rotating instead of hitting a wall.
  const loopedCategories = count ? [...categories, ...categories, ...categories] : [];

  // Track viewport so we can switch to a plain touch-scroll list on phones
  // instead of the animated carousel — no continuous drift to fight with.
  useEffect(() => {
    function handleResize() {
      setIsMobile(window.innerWidth <= MOBILE_BREAKPOINT);
    }
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    // On mobile there's no cursor and the constant auto-drift only makes it
    // harder to tap the right card, so the animation loop simply doesn't run.
    if (isMobile) return undefined;

    function loop() {
      // Cards now only move while the cursor is over the rail, pushed left
      // or right of center — no idle auto-drift when the mouse isn't there.
      if (hoveringRef.current) {
        targetRef.current += cursorDxRef.current * CURSOR_DRIFT;
        posRef.current += (targetRef.current - posRef.current) * LERP;
        setRenderPos(posRef.current);
      }
      rafRef.current = requestAnimationFrame(loop);
    }
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [isMobile]);

  // Mobile equivalent of the desktop "focus card" pop: whichever card sits
  // nearest the horizontal center of the scroll strip gets the gentle
  // bounce, updated as the person swipes. Plain scroll-position math, not
  // IntersectionObserver — a native 'scroll' event always fires reliably.
  // Also drives the infinite-loop illusion: once the scroll settles, if the
  // centered card belongs to the "before" or "after" copy, silently jump
  // exactly one copy-width so the person is always somewhere in the
  // (visually identical) middle territory, with room to keep swiping either
  // direction.
  useEffect(() => {
    if (!isMobile || !count) return undefined;
    const el = scrollRef.current;
    if (!el) return undefined;

    function measureSetWidth() {
      const a = cardRefs.current[0];
      const b = cardRefs.current[count];
      if (a && b) setWidthRef.current = b.offsetLeft - a.offsetLeft;
    }

    function centerOn(index) {
      const card = cardRefs.current[index];
      if (!card) return;
      el.scrollLeft = card.offsetLeft - (el.clientWidth - card.clientWidth) / 2;
    }

    function closestIndex() {
      const containerRect = el.getBoundingClientRect();
      const containerCenter = containerRect.left + containerRect.width / 2;
      let closest = count; // default to first item of the middle copy
      let closestDist = Infinity;
      cardRefs.current.forEach((card, i) => {
        if (!card) return;
        const rect = card.getBoundingClientRect();
        const cardCenter = rect.left + rect.width / 2;
        const dist = Math.abs(cardCenter - containerCenter);
        if (dist < closestDist) {
          closestDist = dist;
          closest = i;
        }
      });
      return closest;
    }

    function settle() {
      const closest = closestIndex();
      if (closest < count) {
        // Drifted into the "before" copy — teleport forward one copy-width.
        el.scrollLeft += setWidthRef.current;
        setFocusIndex(closest + count);
      } else if (closest >= count * 2) {
        // Drifted into the "after" copy — teleport back one copy-width.
        el.scrollLeft -= setWidthRef.current;
        setFocusIndex(closest - count);
      } else {
        setFocusIndex(closest);
      }
    }

    function onScroll() {
      if (scrollRafRef.current) return;
      scrollRafRef.current = requestAnimationFrame(() => {
        scrollRafRef.current = null;
        setFocusIndex(closestIndex());
      });
      clearTimeout(settleTimerRef.current);
      settleTimerRef.current = setTimeout(settle, 120);
    }

    // Measure and center on the first real category once layout has
    // settled, then keep listening for swipes.
    const initial = setTimeout(() => {
      measureSetWidth();
      centerOn(count);
      setFocusIndex(count);
    }, 350);
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      clearTimeout(initial);
      clearTimeout(settleTimerRef.current);
      el.removeEventListener('scroll', onScroll);
      if (scrollRafRef.current) cancelAnimationFrame(scrollRafRef.current);
    };
  }, [isMobile, count]);

  if (!count) return null;

  function handleMouseMove(e) {
    const rect = railRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const dx = (e.clientX - centerX) / (rect.width / 2);
    cursorDxRef.current = Math.max(-1, Math.min(1, dx));
  }

  function handleMouseEnter() {
    hoveringRef.current = true;
  }

  function handleMouseLeave() {
    hoveringRef.current = false;
    cursorDxRef.current = 0;
  }

  function offsetOf(i) {
    let raw = ((i - renderPos) % count + count) % count;
    if (raw > count / 2) raw -= count;
    return raw;
  }

  // Slower reveal on mobile so the heading/note don't flash past before
  // the person has scrolled far enough to actually read them.
  const revealDuration = isMobile ? 1.8 : 1.4;
  const revealDelay = isMobile ? 0.15 : 0.1;

  return (
    <div className="showcase">
      <div className="showcase-head">
        <TextReveal as="p" direction="left" distance={28} duration={revealDuration} className="showcase-note">
          {note || "Milady's combination of heritage weave and modern drape helps create a look that's as timeless as you are."}
        </TextReveal>
        <TextReveal as="h2" delay={revealDelay} direction="right" distance={38} duration={revealDuration} className="showcase-title">
          {heading || 'Our Collections'}
        </TextReveal>
      </div>

      {isMobile ? (
        <div className="showcase-scroll" ref={scrollRef}>
          {loopedCategories.map((c, i) => {
            const dist = Math.min(Math.abs(i - focusIndex), 3);
            return (
              <Link
                key={`${c.id}-${Math.floor(i / count)}`}
                ref={(el) => { cardRefs.current[i] = el; }}
                to={`/products?category=${c.id}`}
                className={`showcase-scroll-card ${i === focusIndex ? 'is-focus' : ''}`}
                data-dist={dist}
                style={{ animationDelay: `${Math.min(i % count, 6) * 70}ms` }}
              >
                <div className="showcase-card-lift">
                  <img src={c.image} alt="" />
                  <span className="showcase-card-overlay" />
                  <span className="showcase-card-name">{c.name}</span>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div
          className="showcase-rail"
          ref={railRef}
          onMouseMove={handleMouseMove}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <div className="showcase-rail-inner">
            {categories.map((c, i) => {
              const offset = offsetOf(i);
              const abs = Math.abs(offset);
              if (abs > 2.6) return null;
              const isFocus = abs < 0.5;
              const scale = 1 - Math.min(abs, 2) * 0.09;
              const tx = offset * 205;
              const z = Math.round(100 - abs * 10);
              const op = Math.max(0, 1 - Math.max(0, abs - 2) * 1.4);

              return (
                <Link
                  key={c.id}
                  to={`/products?category=${c.id}`}
                  className={`showcase-card ${isFocus ? 'is-focus' : ''}`}
                  style={{
                    transform: `translate(-50%, -50%) translate(${tx}px, 0) scale(${scale})`,
                    zIndex: z,
                    opacity: op,
                  }}
                >
                  <div className="showcase-card-lift">
                    <img src={c.image} alt="" />
                    <span className="showcase-card-overlay" />
                    <span className="showcase-card-name">{c.name}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      <Link to="/products" className="showcase-explore">
        Explore
        <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path d="M8 4l6 6-6 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </Link>

      <style>{`
        .showcase {
          position: relative;
          background: var(--blush-400);
          border-radius: 28px;
          padding: 56px 40px 48px;
          overflow: hidden;
        }
        .showcase-head {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 40px;
          margin-bottom: 44px;
        }
        .showcase-note {
          max-width: 240px;
          font-size: 13px;
          line-height: 1.7;
          font-style: italic;
          color: var(--maroon-800);
          opacity: 0.85;
          margin: 0 0 6px;
        }
        .showcase-title {
          font-family: var(--font-display);
          font-weight: 400;
          font-size: 44px;
          line-height: 1;
          color: var(--maroon-950);
          margin: 0;
          text-align: right;
        }

        .showcase-rail {
          position: relative;
          height: 380px;
          margin: 0 auto;
          cursor: pointer;
        }
        .showcase-rail-inner {
          position: absolute;
          inset: 0;
          transform-origin: 50% 50%;
        }
        .showcase-card {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 200px;
          height: 300px;
          border: 3px solid transparent;
          padding: 0;
          border-radius: 18px;
          overflow: visible;
          display: block;
          transition: border-color 0.25s ease;
          will-change: transform;
        }
        .showcase-card.is-focus {
          border-color: var(--maroon-900);
        }
        /* Pop animates the inner image layer only, so it never fights the
           outer card's own translate/scale positioning transform. */
        .showcase-card.is-focus .showcase-card-lift {
          animation: showcasePop 2.2s ease-in-out infinite;
        }
        @keyframes showcasePop {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-8px) scale(1.045); }
        }
        .showcase-card:hover {
          z-index: 400 !important;
        }
        .showcase-card-lift {
          position: absolute;
          inset: 0;
          border-radius: 15px;
          overflow: hidden;
          box-shadow: 0 14px 30px rgba(72,24,30,0.18);
          transition: transform 0.4s cubic-bezier(.19,1,.22,1), box-shadow 0.4s ease, filter 0.35s ease;
        }
        .showcase-card.is-focus .showcase-card-lift {
          box-shadow: 0 22px 44px rgba(72,24,30,0.3);
        }
        .showcase-card:hover .showcase-card-lift {
          transform: translateY(-18px) scale(1.045);
          box-shadow: 0 32px 54px rgba(72,24,30,0.4);
        }
        .showcase-card img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: top center;
          display: block;
        }
        .showcase-card-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(180deg, rgba(44,10,16,0) 42%, rgba(30,8,12,0.8) 100%);
        }
        .showcase-card-name {
          position: absolute;
          left: 16px;
          right: 16px;
          bottom: 16px;
          color: var(--ivory);
          font-size: 13px;
          font-weight: 500;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          text-align: left;
        }

        .showcase-scroll {
          display: flex;
          gap: 14px;
          overflow-x: auto;
          overflow-y: visible;
          -webkit-overflow-scrolling: touch;
          scroll-snap-type: x mandatory;
          scroll-padding-inline: calc(50% - 75px);
          padding: 4px calc(50% - 75px) 14px;
          scrollbar-width: none;
        }
        .showcase-scroll::-webkit-scrollbar {
          display: none;
        }
        .showcase-scroll-card {
          position: relative;
          flex: 0 0 auto;
          width: 150px;
          height: 220px;
          border-radius: 15px;
          overflow: hidden;
          scroll-snap-align: center;
          scroll-snap-stop: always;
          box-shadow: 0 10px 24px rgba(72,24,30,0.18);
          opacity: 0;
          border: 2px solid transparent;
          animation: showcaseCardIn 0.6s cubic-bezier(0.19,1,0.22,1) forwards;
          transition: border-color 0.25s ease, box-shadow 0.25s ease;
        }
        @keyframes showcaseCardIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .showcase-scroll-card { animation: none; opacity: 1; }
        }
        /* Scale/fade falloff by distance from the centered card — the same
           shape as the desktop rail's offset formula, just driven by scroll
           position instead of cursor position. Applied to the inner layer
           (not the outer card that owns the entrance animation above) so
           the two don't fight over the same transform. */
        .showcase-scroll-card .showcase-card-lift {
          transition: transform 0.35s cubic-bezier(0.19,1,0.22,1), opacity 0.35s ease, box-shadow 0.35s ease;
        }
        .showcase-scroll-card[data-dist="0"] .showcase-card-lift { transform: scale(1); opacity: 1; }
        .showcase-scroll-card[data-dist="1"] .showcase-card-lift { transform: scale(0.91); opacity: 0.8; }
        .showcase-scroll-card[data-dist="2"] .showcase-card-lift { transform: scale(0.85); opacity: 0.6; }
        .showcase-scroll-card[data-dist="3"] .showcase-card-lift { transform: scale(0.8); opacity: 0.45; }
        /* Whichever card sits centered in the strip gets the same gentle
           bounce as the desktop rail's focused card. */
        .showcase-scroll-card.is-focus {
          border-color: var(--maroon-900);
          box-shadow: 0 16px 32px rgba(72,24,30,0.3);
        }
        .showcase-scroll-card.is-focus .showcase-card-lift {
          animation: showcasePop 2.2s ease-in-out infinite;
        }

        .showcase-explore {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          margin: 36px auto 0;
          padding: 13px 28px;
          border-radius: 999px;
          background: var(--maroon-900);
          color: var(--ivory);
          font-size: 14px;
          font-weight: 500;
          width: fit-content;
          left: 50%;
          position: relative;
          transform: translateX(-50%);
          transition: background 0.2s ease;
        }
        .showcase-explore:hover { background: var(--maroon-800); }
        .showcase-explore svg { width: 16px; height: 16px; }

        @media (max-width: 980px) {
          .showcase { padding: 40px 20px 32px; }
          .showcase-head { flex-direction: column; align-items: flex-start; gap: 16px; }
          .showcase-title { font-size: 34px; text-align: left; }
          .showcase-rail { height: 300px; }
          .showcase-rail-inner { transform: scale(0.86); }
        }
        @media (max-width: 600px) {
          .showcase { padding: 26px 14px 22px; }
          .showcase-title { font-size: 23px; }
          .showcase-note { font-size: 12px; max-width: 200px; }
          .showcase-scroll { padding-inline: calc(50% - 66px); scroll-padding-inline: calc(50% - 66px); }
          .showcase-scroll-card { width: 132px; height: 194px; }
          .showcase-explore { padding: 11px 24px; font-size: 13px; margin-top: 26px; }
        }
      `}</style>
    </div>
  );
}