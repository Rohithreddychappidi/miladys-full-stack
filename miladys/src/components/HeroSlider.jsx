import { useEffect, useRef, useState } from 'react';

const defaultSlides = [
  { id: 1, type: 'video', src: 'https://assets.mixkit.co/videos/40228/40228-360.mp4', alt: 'Silk fabric moving in the breeze' },
  { id: 2, type: 'image', src: 'https://images.unsplash.com/photo-1606259458027-54d2a728b6ab?auto=format&fit=crop&w=1800&h=760&q=80', alt: 'Draped silk fabric folds' },
  { id: 3, type: 'image', src: 'https://images.unsplash.com/photo-1518893063132-36e46dbe2428?auto=format&fit=crop&w=1800&h=760&q=80', alt: 'Rich red silk textile' },
];

export default function HeroSlider({ slides: cmsSlides, mobileSlides: cmsMobileSlides }) {
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth <= 640 : false,
  );

  useEffect(() => {
    function onResize() {
      setIsMobile(window.innerWidth <= 640);
    }
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Mobile slides (uploaded separately in the admin panel) take over on
  // narrow viewports when present; otherwise fall back to the desktop set,
  // and finally to the built-in defaults so the hero never renders empty.
  const activeCmsSlides = isMobile && Array.isArray(cmsMobileSlides) && cmsMobileSlides.length
    ? cmsMobileSlides
    : cmsSlides;

  const slides =
    Array.isArray(activeCmsSlides) && activeCmsSlides.length
      ? activeCmsSlides.map((s, i) => ({ id: i, type: s.type, src: s.url, alt: 'Milady\'s' }))
      : defaultSlides;

  return isMobile
    ? <MobileHeroSlider slides={slides} />
    : <DesktopHeroSlider slides={slides} />;
}

// --- Desktop: crossfade + autoplay, with small prev/next arrows so more
// than one banner is easy to browse manually too. ---
function DesktopHeroSlider({ slides }) {
  const [active, setActive] = useState(0);
  const timerRef = useRef(null);
  const videoRef = useRef(null);
  const slidesKey = slides.map((s) => s.src).join('|');

  useEffect(() => {
    setActive(0);
  }, [slidesKey]);

  useEffect(() => {
    clearInterval(timerRef.current);
    if (slides[active]?.type === 'video') {
      const vid = videoRef.current;
      if (vid) {
        vid.currentTime = 0;
        vid.play().catch(() => {});
      }
    } else {
      timerRef.current = setInterval(() => {
        setActive((i) => (i + 1) % slides.length);
      }, 4200);
    }
    return () => clearInterval(timerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, slidesKey]);

  function handleVideoEnded() {
    setActive((i) => (i + 1) % slides.length);
  }

  function goTo(i) {
    setActive((i + slides.length) % slides.length);
  }

  return (
    <div className="hero-slider" aria-hidden="true">
      {slides.map((s, i) => (
        <div key={s.id} className={'hero-slide' + (i === active ? ' active' : '')}>
          {s.type === 'video' ? (
            <video
              ref={videoRef}
              src={s.src}
              muted
              playsInline
              autoPlay
              onEnded={handleVideoEnded}
              aria-label={s.alt}
            />
          ) : (
            <img src={s.src} alt={s.alt} />
          )}
        </div>
      ))}

      {slides.length > 1 && (
        <>
          <button type="button" className="hero-arrow hero-arrow-prev" onClick={() => goTo(active - 1)} aria-label="Previous banner">
            <svg viewBox="0 0 24 24" fill="none"><path d="M15 5l-7 7 7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
          <button type="button" className="hero-arrow hero-arrow-next" onClick={() => goTo(active + 1)} aria-label="Next banner">
            <svg viewBox="0 0 24 24" fill="none"><path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
        </>
      )}

      <div className="hero-slider-dots">
        {slides.map((s, i) => (
          <button
            key={s.id}
            className={'hero-dot' + (i === active ? ' active' : '')}
            onClick={() => goTo(i)}
            aria-label={`Show banner ${i + 1}`}
          />
        ))}
      </div>

      <HeroSliderStyles />
    </div>
  );
}

// --- Mobile: a plain, native swipeable strip — no JS-driven auto-advance
// to fight the person's finger. Videos just autoplay+loop muted in place. ---
function MobileHeroSlider({ slides }) {
  const [active, setActive] = useState(0);
  const trackRef = useRef(null);
  const rafRef = useRef(null);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return undefined;
    function onScroll() {
      if (rafRef.current) return;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        setActive(Math.round(el.scrollLeft / el.offsetWidth));
      });
    }
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      el.removeEventListener('scroll', onScroll);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  function goTo(i) {
    const el = trackRef.current;
    if (!el) return;
    el.scrollTo({ left: i * el.offsetWidth, behavior: 'smooth' });
  }

  return (
    <div className="hero-slider hero-slider-mobile" aria-hidden="true">
      <div className="hero-track" ref={trackRef}>
        {slides.map((s) => (
          <div key={s.id} className="hero-slide-mobile">
            {s.type === 'video' ? (
              <video src={s.src} muted playsInline autoPlay loop aria-label={s.alt} />
            ) : (
              <img src={s.src} alt={s.alt} />
            )}
          </div>
        ))}
      </div>

      {slides.length > 1 && (
        <div className="hero-slider-dots">
          {slides.map((s, i) => (
            <button
              key={s.id}
              className={'hero-dot' + (i === active ? ' active' : '')}
              onClick={() => goTo(i)}
              aria-label={`Show banner ${i + 1}`}
            />
          ))}
        </div>
      )}

      <HeroSliderStyles />
    </div>
  );
}

function HeroSliderStyles() {
  return (
    <style>{`
      .hero-slider {
        position: relative;
        width: 100%;
        /* Using the small (fixed) viewport height instead of the dynamic
           one is what actually fixes the "zoom" jump when scrolling on
           mobile — 100dvh recalculates as the browser's address bar
           shows/hides mid-scroll, which visibly resizes the hero right
           as you scroll past it. 100svh stays fixed regardless. */
        height: 100vh;
        height: 100svh;
        min-height: 100vh;
        min-height: 100svh;
        overflow: hidden;
        background: var(--maroon-950);
      }
      .hero-slide {
        position: absolute;
        inset: 0;
        opacity: 0;
        transition: opacity 0.9s ease;
      }
      .hero-slide.active { opacity: 1; }
      .hero-slide img,
      .hero-slide video {
        width: 100%;
        height: 100%;
        object-fit: cover;
        object-position: center;
      }

      .hero-arrow {
        position: absolute;
        top: 50%;
        transform: translateY(-50%);
        z-index: 3;
        width: 40px;
        height: 40px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(0,0,0,0.28);
        border: 1px solid rgba(255,255,255,0.35);
        color: #fff;
        backdrop-filter: blur(6px);
        transition: background 0.2s ease, transform 0.2s ease;
      }
      .hero-arrow:hover { background: rgba(0,0,0,0.46); }
      .hero-arrow svg { width: 18px; height: 18px; }
      .hero-arrow-prev { left: 20px; }
      .hero-arrow-next { right: 20px; }

      .hero-slider-dots {
        position: absolute;
        bottom: 14px;
        left: 50%;
        transform: translateX(-50%);
        display: flex;
        gap: 8px;
        z-index: 3;
      }
      .hero-dot {
        width: 7px;
        height: 7px;
        border-radius: 999px;
        background: rgba(255,255,255,0.5);
        border: none;
        padding: 0;
        transition: background 0.2s ease, width 0.2s ease;
      }
      .hero-dot.active { background: var(--ivory); width: 20px; border-radius: 999px; }

      .hero-track {
        display: flex;
        width: 100%;
        height: 100%;
        overflow-x: auto;
        scroll-snap-type: x mandatory;
        -webkit-overflow-scrolling: touch;
        scrollbar-width: none;
      }
      .hero-track::-webkit-scrollbar { display: none; }
      .hero-slide-mobile {
        flex: 0 0 100%;
        width: 100%;
        height: 100%;
        scroll-snap-align: start;
        scroll-snap-stop: always;
      }
      .hero-slide-mobile img,
      .hero-slide-mobile video {
        width: 100%;
        height: 100%;
        object-fit: cover;
        object-position: center;
      }

      @media (max-width: 600px) {
        .hero-slider { height: 100vh; height: 100svh; min-height: 100vh; min-height: 100svh; }
        .hero-slider-dots { bottom: 10px; }
        .hero-arrow { width: 34px; height: 34px; }
      }
    `}</style>
  );
}
