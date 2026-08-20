import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';

const PETAL_COUNT = 14;
const COLORS = ['var(--maroon-700)', 'var(--blush-400)', 'var(--gold-500)', 'var(--maroon-900)'];

export default function PetalIntro() {
  const petalRefs = useRef([]);
  const stageRef = useRef(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const petals = petalRefs.current.filter(Boolean);
    const n = petals.length;
    if (!n) return undefined;

    const tl = gsap.timeline({
      defaults: { ease: 'power2.out' },
      onComplete: () => setDone(true),
    });

    petals.forEach((el, i) => {
      const scatterAngle = (i * 137.5) % 360;
      const scatterRadius = 320 + ((i * 47) % 220);
      const sx = Math.cos((scatterAngle * Math.PI) / 180) * scatterRadius;
      const sy = Math.sin((scatterAngle * Math.PI) / 180) * scatterRadius;
      const srot = scatterAngle + (i % 2 === 0 ? 210 : -210);

      // a curved midpoint so the flight arcs rather than travels in a straight line
      const midAngle = scatterAngle + (i % 2 === 0 ? -34 : 34);
      const midRadius = scatterRadius * 0.42;
      const mx = Math.cos((midAngle * Math.PI) / 180) * midRadius;
      const my = Math.sin((midAngle * Math.PI) / 180) * midRadius;

      const bloomAngle = i * (360 / n);
      const ex = Math.cos((bloomAngle * Math.PI) / 180) * 76;
      const ey = Math.sin((bloomAngle * Math.PI) / 180) * 76;
      const erot = bloomAngle + 90;

      gsap.set(el, { x: sx, y: sy, rotation: srot, scale: 0.4, opacity: 0, transformOrigin: '50% 100%' });

      const start = i * 0.045;
      tl.to(el, { x: mx, y: my, rotation: srot * 0.4, scale: 0.75, opacity: 1, duration: 0.85, ease: 'sine.inOut' }, start);
      tl.to(el, { x: ex, y: ey, rotation: erot, scale: 1, duration: 0.85, ease: 'back.out(1.6)' }, start + 0.72);
    });

    const assembleEnd = (n - 1) * 0.045 + 0.72 + 0.85;
    tl.addLabel('bloom', assembleEnd);

    // subtle living "breathe" while the bloom holds
    tl.to(petals, { scale: '+=0.035', duration: 0.6, ease: 'sine.inOut', yoyo: true, repeat: 1, stagger: 0.01 }, 'bloom');

    tl.addLabel('dissolve', 'bloom+=1.3');
    petals.forEach((el, i) => {
      tl.to(el, { scale: 1.7, opacity: 0, duration: 0.85, ease: 'power2.in' }, `dissolve+=${i * 0.028}`);
    });

    return () => tl.kill();
  }, []);

  if (done) return null;

  return (
    <div className="petal-intro" aria-hidden="true">
      <div className="petal-stage" ref={stageRef}>
        {Array.from({ length: PETAL_COUNT }).map((_, i) => (
          <div
            key={i}
            ref={(el) => { petalRefs.current[i] = el; }}
            className="petal"
            style={{ color: COLORS[i % COLORS.length] }}
          >
            <svg viewBox="-20 -75 40 80" fill="currentColor" aria-hidden="true">
              <path d="M0,0 C -20,-26 -15,-58 0,-74 C 15,-58 20,-26 0,0 Z" />
            </svg>
          </div>
        ))}
      </div>

      <style>{`
        .petal-intro {
          position: absolute;
          inset: 0;
          z-index: 4;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--paper);
          pointer-events: none;
          overflow: hidden;
        }
        .petal-stage {
          position: relative;
          width: 1px;
          height: 1px;
        }
        .petal {
          position: absolute;
          top: 0;
          left: 0;
          width: 34px;
          height: 68px;
          margin: -34px 0 0 -17px;
          will-change: transform, opacity;
        }
        .petal svg { width: 100%; height: 100%; display: block; }

        @media (max-width: 600px) {
          .petal { width: 24px; height: 48px; margin: -24px 0 0 -12px; }
          .petal-stage { transform: scale(0.65); }
        }
      `}</style>
    </div>
  );
}
