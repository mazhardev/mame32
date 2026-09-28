import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Elapsed-time counter for puzzles. It only advances while `running` is true
 * (pass `started && !paused && !finished`), so pauses and hidden tabs are
 * never counted. `read()` returns the exact value for scoring and saves.
 */
export function useStopwatch(running: boolean, tickMs = 250) {
  const baseRef = useRef(0);
  const sinceRef = useRef<number | null>(null);
  const [, setTick] = useState(0);

  const read = useCallback(
    () => baseRef.current + (sinceRef.current === null ? 0 : performance.now() - sinceRef.current),
    [],
  );

  useEffect(() => {
    if (!running) return;
    sinceRef.current = performance.now();
    const id = window.setInterval(() => setTick((t) => t + 1), tickMs);
    return () => {
      window.clearInterval(id);
      if (sinceRef.current !== null) baseRef.current += performance.now() - sinceRef.current;
      sinceRef.current = null;
    };
  }, [running, tickMs]);

  /** Sets the elapsed time, e.g. 0 for a new game or a saved value on resume. */
  const reset = useCallback((ms = 0) => {
    baseRef.current = ms;
    if (sinceRef.current !== null) sinceRef.current = performance.now();
    setTick((t) => t + 1);
  }, []);

  return { elapsed: read(), read, reset };
}
