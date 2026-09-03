import { useEffect, useLayoutEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import Lenis from 'lenis';

// Adds a gentle, eased "glide" to scrolling on desktop (mouse wheel /
// trackpad) — the page keeps drifting a touch after you stop scrolling
// instead of snapping to a dead stop. Touch scrolling on phones/tablets is
// left completely alone (Lenis defaults to native touch scroll), so this
// doesn't affect the mobile touch-scroll work done elsewhere on the site.
// People who've asked their OS for reduced motion get plain native scroll.
export default function SmoothScroll() {
  const lenisRef = useRef(null);
  const { pathname } = useLocation();

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
    lenisRef.current = lenis;

    let rafId;
    function raf(time) {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    }
    rafId = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, []);

  // Reset scroll to the top on every route change. This runs in
  // useLayoutEffect, not useEffect — a plain useEffect fires AFTER the
  // browser has already painted the new page at the old scroll position,
  // so for one visible frame the new (often shorter) page renders scrolled
  // down near the footer before snapping to the top a moment later.
  // useLayoutEffect runs synchronously before that paint, so the reset
  // happens before anything is shown, eliminating the flash entirely.
  // Lenis tracks scroll position independently of the browser's native
  // scrollY, so a plain window.scrollTo(0, 0) here would also get silently
  // overridden on the next animation frame by Lenis re-asserting its own
  // (still-scrolled-down) position — going through lenis.scrollTo() keeps
  // both in sync. When Lenis isn't running (reduced-motion), plain
  // scrollTo still works fine on its own.
  useLayoutEffect(() => {
    // Belt-and-suspenders native reset first — on real iOS Safari, a swipe
    // that's still decelerating (momentum scrolling) at the moment of tap
    // can keep nudging scroll position for a beat even into a new page,
    // in a way Lenis's own scrollTo doesn't always fully override. Setting
    // both scroll containers directly, then letting Lenis sync to match,
    // covers that case without affecting the already-verified desktop and
    // Android behavior.
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    if (lenisRef.current) {
      lenisRef.current.scrollTo(0, { immediate: true });
    } else {
      window.scrollTo(0, 0);
    }
  }, [pathname]);

  return null;
}
