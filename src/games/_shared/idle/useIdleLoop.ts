import { useEffect, useRef, useState } from 'react';

/**
 * Drives an idle game: calls `tick(dt)` from requestAnimationFrame while the
 * game is running and visible, and re-renders React at most `fps` times per
 * second so the numbers on screen stay fresh without 60 renders a second.
 */
export function useIdleLoop(tick: (dt: number) => void, running: boolean, fps = 10) {
  const tickRef = useRef(tick);
  tickRef.current = tick;
  const [, setFrame] = useState(0);
  useEffect(() => {
    if (!running) return;
    let raf = 0;
    let last = performance.now();
    let sinceRender = 0;
    const loop = (now: number) => {
      const dt = Math.min(0.25, (now - last) / 1000);
      last = now;
      if (!document.hidden) {
        tickRef.current(dt);
        sinceRender += dt;
        if (sinceRender >= 1 / fps) {
          sinceRender = 0;
          setFrame((f) => (f + 1) % 1_000_000);
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [running, fps]);
}
