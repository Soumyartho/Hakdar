import React, { useEffect, useRef, useState } from 'react';
import './LiquidCursor.css';

// Cursor-following liquid-glass distortion lens.
// Position is lerped via rAF and written directly to the DOM (no React state per frame)
// to keep this as cheap as the mouse-smoothing already done in GrainyGradient.
export default function LiquidCursor() {
  const [enabled, setEnabled] = useState(false);
  const blobRef = useRef(null);
  const current = useRef({ x: 0, y: 0 });
  const target = useRef({ x: 0, y: 0 });
  const scale = useRef({ current: 1, target: 1 });
  const rafId = useRef(null);
  const hasMoved = useRef(false);

  useEffect(() => {
    const finePointer = window.matchMedia('(pointer: fine)').matches;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!finePointer || reducedMotion) return;

    setEnabled(true);

    const handleMove = (e) => {
      target.current.x = e.clientX;
      target.current.y = e.clientY;
      if (!hasMoved.current) {
        current.current.x = e.clientX;
        current.current.y = e.clientY;
        hasMoved.current = true;
      }
    };

    const handleDown = () => {
      scale.current.target = 0.82;
    };

    const handleUp = () => {
      scale.current.target = 1;
    };

    const tick = () => {
      current.current.x += (target.current.x - current.current.x) * 0.2;
      current.current.y += (target.current.y - current.current.y) * 0.2;
      scale.current.current += (scale.current.target - scale.current.current) * 0.25;
      if (blobRef.current) {
        blobRef.current.style.transform = `translate3d(${current.current.x}px, ${current.current.y}px, 0) translate(-50%, -50%) scale(${scale.current.current})`;
        blobRef.current.style.opacity = hasMoved.current ? '1' : '0';
      }
      rafId.current = requestAnimationFrame(tick);
    };

    window.addEventListener('pointermove', handleMove, { passive: true });
    window.addEventListener('pointerdown', handleDown, { passive: true });
    window.addEventListener('pointerup', handleUp, { passive: true });
    rafId.current = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerdown', handleDown);
      window.removeEventListener('pointerup', handleUp);
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, []);

  if (!enabled) return null;

  return (
    <>
      <svg className="liquid-cursor-defs" aria-hidden="true">
        <filter id="liquid-glass-distort">
          <feTurbulence type="fractalNoise" baseFrequency="0.008 0.012" numOctaves="2" seed="7" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="18" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </svg>
      <div ref={blobRef} className="liquid-cursor-blob" />
    </>
  );
}
