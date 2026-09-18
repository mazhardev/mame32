import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * A countdown in seconds that only ticks while `running` is true (pass
 * `started && !paused`). Calls `onEnd` once when it reaches zero.
 */
export function useCountdown(initial: number, running: boolean, onEnd: () => void) {
  const [left, setLeft] = useState(initial);
  const leftRef = useRef(initial);
  const endRef = useRef(onEnd);
  const firedRef = useRef(false);
  endRef.current = onEnd;

  const reset = useCallback((seconds: number) => {
    leftRef.current = seconds;
    firedRef.current = false;
    setLeft(seconds);
  }, []);

  const add = useCallback((seconds: number) => {
    leftRef.current = Math.max(0, leftRef.current + seconds);
    setLeft(leftRef.current);
  }, []);

  useEffect(() => {
    if (!running) return;
    let last = performance.now();
    const id = window.setInterval(() => {
      const now = performance.now();
      leftRef.current = Math.max(0, leftRef.current - (now - last) / 1000);
      last = now;
      setLeft(leftRef.current);
      if (leftRef.current <= 0 && !firedRef.current) {
        firedRef.current = true;
        window.clearInterval(id);
        endRef.current();
      }
    }, 100);
    return () => window.clearInterval(id);
  }, [running]);

  return { left, reset, add, seconds: Math.ceil(left) };
}
