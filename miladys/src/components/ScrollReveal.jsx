import { useEffect, useRef, useState } from 'react';

// Same IntersectionObserver-based approach as TextReveal, without the
// blur — used for grids, cards and images rather than text lines.
export default function ScrollReveal({
  children,
  as: Tag = 'div',
  y = 12,
  duration = 1.3,
  delay = 0,
  threshold = 0.15,
  rootMargin = '0px 0px -16% 0px',
  className = '',
}) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) {
      setVisible(true);
      return undefined;
    }

    if (!('IntersectionObserver' in window)) {
      setVisible(true);
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold, rootMargin },
    );
    observer.observe(el);
    // Safety net: some mobile browsers/edge cases can fail to fire the
    // observer callback (e.g. an element already in view at a viewport
    // size the browser reports inconsistently during load). Content should
    // never stay invisible forever because of that, so reveal anyway after
    // a short delay if the observer hasn't already done it.
    const fallback = setTimeout(() => setVisible(true), 2000);
    return () => {
      observer.disconnect();
      clearTimeout(fallback);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Tag
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : `translateY(${y}px)`,
        transition: visible
          ? `opacity ${duration}s ease-out ${delay}s, transform ${duration}s cubic-bezier(0.19,1,0.22,1) ${delay}s`
          : 'none',
        willChange: 'transform, opacity',
      }}
    >
      {children}
    </Tag>
  );
}
