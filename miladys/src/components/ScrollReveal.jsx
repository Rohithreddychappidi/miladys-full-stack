import { useEffect, useRef, useState } from 'react';

// Same IntersectionObserver-based approach as TextReveal, without the
// blur — used for grids, cards and images rather than text lines.
export default function ScrollReveal({
  children,
  as: Tag = 'div',
  y = 12,
  duration = 1.0,
  delay = 0,
  threshold = 0.15,
  rootMargin = '0px 0px -14% 0px',
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
    return () => observer.disconnect();
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
          ? `opacity ${duration}s ease-out ${delay}s, transform ${duration}s cubic-bezier(0.22,0.61,0.36,1) ${delay}s`
          : 'none',
        willChange: 'transform, opacity',
      }}
    >
      {children}
    </Tag>
  );
}
