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

  // The browser has its OWN automatic scroll-restoration behavior for
  // history navigations, independent of React entirely — by default it can
  // try to "remember" and re-apply a scroll position on certain navigation
  // patterns, which fights with the deliberate reset-to-top below in a way
  // that's timing-dependent and hard to catch in scripted tests (it depends
  // on real browser navigation history, not just a fresh page load). Setting
  // this to 'manual' hands scroll position fully and exclusively to this
  // component, removing that entire class of interference.
  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
  }, []);

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
      lenisRef.current.scrollTo(0, { immediate: true, force: true });
    } else {
      window.scrollTo(0, 0);
    }

    // A trackpad/mouse flick keeps sending wheel events for up to a second
    // ("momentum"). If a product was clicked mid-glide, that leftover
    // momentum used to carry on scrolling the NEW page (it landed ~650px
    // down). Wheel events that continue the glide without a pause are
    // swallowed; the first one after a 150ms gap is a fresh, deliberate
    // scroll and goes through. Uses each event's own timestamp, so a busy
    // main thread rendering the new page can't fake a "pause". Capped at 3s
    // (a strong macOS trackpad glide lasts up to ~2s).
    let lastWheel = performance.now();
    let done = false;
    function stopSwallowing() {
      if (done) return;
      done = true;
      clearTimeout(capTimer);
      window.removeEventListener('wheel', swallow, { capture: true });
    }
    function swallow(e) {
      if (e.timeStamp - lastWheel > 150) {
        stopSwallowing();
        return; // new gesture: let it scroll normally
      }
      lastWheel = e.timeStamp;
      e.preventDefault();
      e.stopImmediatePropagation(); // keep it from Lenis too
    }
    window.addEventListener('wheel', swallow, { capture: true, passive: false });
    const capTimer = setTimeout(stopSwallowing, 3000);
    return stopSwallowing;
  }, [pathname]);

  return null;
}
