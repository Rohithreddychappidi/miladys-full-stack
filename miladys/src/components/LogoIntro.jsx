import { useLayoutEffect, useRef, useState } from 'react';
import gsap from 'gsap';

// Fraction of the full "logo-white.png" lockup's width that the mark
// (the sparkle + M glyph) occupies. Measured from the source asset so the
// clip-path reveal below stops exactly where the mark ends and the
// wordmark letters begin.
const MARK_FRACTION = 0.264;

// Splash-to-navbar "logo dock" intro:
// 1. The monogram lands big and centered on a soft backdrop.
// 2. It rolls and settles for a beat.
// 3. It flies (FLIP-animated) into the real navbar logo's position/size.
// 4. The instant it arrives, it hands off to the real white lockup logo,
//    revealed only up to the mark — then the rest of "Milady's" wipes in.
// 5. The backdrop fades to reveal the page underneath.
export default function LogoIntro() {
  const overlayRef = useRef(null);
  const markRef = useRef(null);
  const [done, setDone] = useState(false);

  useLayoutEffect(() => {
    if (typeof window === 'undefined') return undefined;

    let alreadyPlayed = false;
    try {
      alreadyPlayed = sessionStorage.getItem('miladysIntroPlayed') === '1';
    } catch {
      alreadyPlayed = false;
    }

    const target = document.getElementById('navBrandLogo');

    if (alreadyPlayed || !target || !markRef.current) {
      setDone(true);
      return undefined;
    }

    const mark = markRef.current;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Hide the real navbar logo completely until the flying mark hands off to it.
    target.style.opacity = '0';
    gsap.set(target, { clipPath: 'inset(0% 100% 0% 0%)' });
    gsap.set(mark, { scale: 0.45, opacity: 0, rotation: -22, transformOrigin: '50% 50%' });

    let cancelled = false;

    function waitForImage(img) {
      if (img.complete && img.naturalWidth) return Promise.resolve();
      return new Promise((resolve) => {
        img.addEventListener('load', resolve, { once: true });
        img.addEventListener('error', resolve, { once: true });
      });
    }

    function finish() {
      target.style.opacity = '';
      gsap.set(target, { clipPath: 'none' });
      document.body.style.overflow = prevOverflow;
      try {
        sessionStorage.setItem('miladysIntroPlayed', '1');
      } catch {
        /* private-browsing storage may throw — safe to ignore */
      }
      setDone(true);
    }

    let tl;

    // Images must be fully decoded before we measure any rects — otherwise
    // an un-loaded navbar logo reports a zero-size box and the flight
    // math (scale = targetHeight / markHeight) collapses to nothing.
    Promise.all([waitForImage(mark), waitForImage(target)]).then(() => {
      if (cancelled) return;

      tl = gsap.timeline({ onComplete: finish });

      // 1. Roll in and land, center screen.
      tl.to(mark, {
        opacity: 1,
        scale: 1,
        rotation: 0,
        duration: 0.95,
        ease: 'back.out(1.5)',
      });

      // Hold the bloom for a beat.
      tl.to({}, { duration: 0.55 });

      // 2 & 3. Measure live positions, then fly + roll the mark into the navbar slot.
      tl.add(() => {
        const markRect = mark.getBoundingClientRect();
        const targetRect = target.getBoundingClientRect();
        if (!markRect.height || !targetRect.height) return;
        const scale = targetRect.height / markRect.height;
        const dx = (targetRect.left + targetRect.width / 2) - (markRect.left + markRect.width / 2);
        const dy = (targetRect.top + targetRect.height / 2) - (markRect.top + markRect.height / 2);

        tl.to(mark, {
          x: dx,
          y: dy,
          scale,
          rotation: 360,
          duration: 0.85,
          ease: 'power3.inOut',
        });

        // Swap to the white variant right at the very end of the flight,
        // once it's essentially over/behind the maroon navbar pill — doing
        // this earlier would turn it invisible against the cream backdrop.
        tl.add(() => {
          mark.src = '/images/monogram-white.png';
        }, '-=0.1');

        // 4. Hand off: the flying mark disappears exactly as the real navbar
        // logo appears, already clipped to show just the mark it's replacing.
        tl.add(() => {
          gsap.set(target, { clipPath: `inset(0% ${((1 - MARK_FRACTION) * 100).toFixed(1)}% 0% 0%)` });
          target.style.opacity = '1';
        });
        tl.to(mark, { opacity: 0, duration: 0.12 }, '<');

        // Fade the splash backdrop away *while* the letters wipe in, so the
        // reveal is actually visible instead of hidden behind an opaque
        // backdrop until the last moment.
        tl.to(overlayRef.current, { opacity: 0, duration: 0.6, ease: 'power1.out' }, '<');

        // The remaining letters wipe in from behind the mark.
        tl.to(target, {
          clipPath: 'inset(0% 0% 0% 0%)',
          duration: 0.7,
          ease: 'power2.out',
        }, '<0.05');
      });
    });

    return () => {
      cancelled = true;
      if (tl) tl.kill();
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  if (done) return null;

  return (
    <div className="logo-intro" ref={overlayRef} aria-hidden="true">
      <img
        ref={markRef}
        src="/images/monogram.png"
        alt=""
        className="logo-intro-mark"
        width="512"
        height="512"
      />

      <style>{`
        .logo-intro {
          position: fixed;
          inset: 0;
          z-index: 999;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--paper);
          pointer-events: auto;
        }
        .logo-intro-mark {
          width: min(30vw, 220px);
          height: auto;
          display: block;
          will-change: transform, opacity;
        }
        @media (max-width: 600px) {
          .logo-intro-mark { width: min(38vw, 160px); }
        }
      `}</style>
    </div>
  );
}
