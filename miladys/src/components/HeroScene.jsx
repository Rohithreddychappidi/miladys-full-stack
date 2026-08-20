import { useEffect, useRef, useState } from 'react';
import { createPetalScene, isWebGLAvailable } from '../three/petalScene';
import HeroSlider from './HeroSlider';

const SAFETY_REVEAL_MS = 6500;

export default function HeroScene({ onFormed, fallback = null }) {
  const containerRef = useRef(null);
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    if (!isWebGLAvailable()) {
      setSupported(false);
      onFormed?.();
      return undefined;
    }

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const container = containerRef.current;
    let scene;
    let revealed = false;
    const reveal = () => {
      if (revealed) return;
      revealed = true;
      onFormed?.();
    };

    try {
      scene = createPetalScene(container, { reducedMotion, onFormed: reveal });
    } catch (err) {
      setSupported(false);
      reveal();
      return undefined;
    }

    if (reducedMotion) reveal();

    // safety net: if the WebGL animation stalls on a slow device, still
    // reveal the hero copy rather than leaving it hidden indefinitely
    const safetyTimer = setTimeout(reveal, SAFETY_REVEAL_MS);

    const isFinePointer = window.matchMedia('(pointer: fine)').matches;
    function handlePointerMove(e) {
      const rect = container.getBoundingClientRect();
      const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ny = ((e.clientY - rect.top) / rect.height) * 2 - 1;
      scene.setMouse(nx, ny);
    }
    if (isFinePointer) container.addEventListener('pointermove', handlePointerMove);

    function handleScroll() {
      const rect = container.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, 1 - rect.bottom / (rect.height + window.innerHeight)));
      scene.setScrollProgress(p);
      container.style.opacity = String(1 - p * 0.65);
    }
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      clearTimeout(safetyTimer);
      if (isFinePointer) container.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('scroll', handleScroll);
      scene?.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!supported) {
    return fallback || <HeroSlider />;
  }

  return (
    <div className="hero-scene-canvas" ref={containerRef}>
      <style>{`
        .hero-scene-canvas {
          position: relative;
          width: 100%;
          height: 100%;
        }
        .hero-scene-canvas canvas { display: block; }
      `}</style>
    </div>
  );
}
