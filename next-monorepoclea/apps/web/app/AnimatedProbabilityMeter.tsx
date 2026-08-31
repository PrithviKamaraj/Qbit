'use client';

import React, { useEffect, useRef } from 'react';
import { animate } from 'animejs';

export default function AnimatedProbabilityMeter({ p0 = 100, p1 = 0 }: { p0: number; p1: number }) {
  const p0BarRef = useRef<HTMLDivElement>(null);
  const p1BarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!p0BarRef.current || !p1BarRef.current) return;

    animate(p0BarRef.current, {
      width: `${p0}%`,
      duration: 600,
      ease: 'outElastic(1, 0.8)',
    });

    animate(p1BarRef.current, {
      width: `${p1}%`,
      duration: 600,
      ease: 'outElastic(1, 0.8)',
    });
  }, [p0, p1]);

  return (
    <div style={{ display: 'flex', height: '10px', background: '#140c09', borderRadius: '5px', overflow: 'hidden' }}>
      <div ref={p0BarRef} style={{ background: '#ffbe98', width: `${p0}%` }} />
      <div ref={p1BarRef} style={{ background: '#d48b6a', width: `${p1}%` }} />
    </div>
  );
}
