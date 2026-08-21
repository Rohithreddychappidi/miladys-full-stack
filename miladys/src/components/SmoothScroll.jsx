import { useEffect } from 'react';
import Lenis from 'lenis';

// Adds a gentle, eased "glide" to scrolling on desktop (mouse wheel /
// trackpad) — the page keeps drifting a touch after you stop scrolling
// instead of snapping to a dead stop. Touch scrolling on phones/tablets is
// left completely alone (Lenis defaults to native touch scroll), so this
// doesn't affect the mobile touch-scroll work done elsewhere on the site.
// People who've asked their OS for reduced motion get plain native scroll.
export default function SmoothScroll() {
  useEffect(() => {
    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    if (prefersReducedMotion) return undefined;

    const lenis = new Lenis({
      duration: 1.7, // slower, longer glide than Lenis's ~1.1s default
      easing: (t) => 1 - Math.pow(1 - t, 4), // ease-out quart: gentler, smoother deceleration
      smoothWheel: true,
      wheelMultiplier: 0.85, // slows the actual scroll speed per wheel tick, not just the glide
      syncTouch: false, // native touch scroll on mobile — no interference there
      touchMultiplier: 1,
    });

    let rafId;
    function raf(time) {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    }
    rafId = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
    };
  }, []);

  return null;
}
