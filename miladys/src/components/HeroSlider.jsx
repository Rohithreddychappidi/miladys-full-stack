import { useEffect, useRef, useState } from 'react';

const slides = [
  { id: 1, type: 'video', src: 'https://assets.mixkit.co/videos/40228/40228-360.mp4', alt: 'Silk fabric moving in the breeze' },
  { id: 2, type: 'image', src: 'https://images.unsplash.com/photo-1606259458027-54d2a728b6ab?auto=format&fit=crop&w=1800&h=760&q=80', alt: 'Draped silk fabric folds' },
  { id: 3, type: 'image', src: 'https://images.unsplash.com/photo-1518893063132-36e46dbe2428?auto=format&fit=crop&w=1800&h=760&q=80', alt: 'Rich red silk textile' },
];

export default function HeroSlider() {
  const [active, setActive] = useState(0);
  const timerRef = useRef(null);
  const videoRef = useRef(null);

  useEffect(() => {
    clearInterval(timerRef.current);
    if (slides[active].type === 'video') {
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
  }, [active]);

  function handleVideoEnded() {
    setActive((i) => (i + 1) % slides.length);
  }

  function goTo(i) {
    setActive(i);
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

      <style>{`
        .hero-slider {
          position: relative;
          width: 100%;
          height: 100vh;
          height: 100dvh;
          min-height: 100vh;
          min-height: 100dvh;
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

        @media (max-width: 600px) {
          .hero-slider { height: 100vh; height: 100dvh; min-height: 100vh; min-height: 100dvh; }
          .hero-slider-dots { bottom: 10px; }
        }
      `}</style>
    </div>
  );
}
