import { useEffect, useRef, useState } from 'react';

// A restrained text reveal: lines slide in from a direction (or simply
// fade) as they enter view. Built on IntersectionObserver rather than
// pixel-position scroll math — it can't go stale when images/video load
// in later and shift the page's height, and needs no manual "refresh"
// bookkeeping.
export default function TextReveal({
  children,
  as: Tag = 'div',
  direction = 'up', // 'up' | 'left' | 'right' | 'fade'
  distance = 26, // px travelled for 'up' / 'left' / 'right'
  duration = 1.6,
  delay = 0,
  trigger = 'scroll', // 'scroll' plays once it enters view, 'load' plays once on mount
  threshold = 0.15,
  rootMargin = '0px 0px -18% 0px',
  className = '',
}) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;

    if (trigger === 'load') {
      // two rAFs so the hidden state actually paints once before we flip
      // to visible — otherwise React can batch both into one frame and
      // the transition never gets a chance to run.
      let raf2;
      const raf1 = requestAnimationFrame(() => {
        raf2 = requestAnimationFrame(() => setVisible(true));
      });
      return () => {
        cancelAnimationFrame(raf1);
        if (raf2) cancelAnimationFrame(raf2);
      };
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
    // Safety net — see ScrollReveal.jsx for why this exists.
    const fallback = setTimeout(() => setVisible(true), 2000);
    return () => {
      observer.disconnect();
      clearTimeout(fallback);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  let hiddenTransform = 'none';
  if (direction === 'up') hiddenTransform = `translateY(${distance}px)`;
  else if (direction === 'left') hiddenTransform = `translateX(-${distance}px)`;
  else if (direction === 'right') hiddenTransform = `translateX(${distance}px)`;
  // 'fade' keeps hiddenTransform as 'none' — opacity only

  return (
    <Tag
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translate(0, 0)' : hiddenTransform,
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
