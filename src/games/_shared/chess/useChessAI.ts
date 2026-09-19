import { useCallback, useEffect, useRef } from 'react';
import { Chess, toUci } from './engine';
import { bestMove } from './ai';
import type { SearchOptions } from './ai';

let seq = 0;

/**
 * Returns an async "think" function backed by a Web Worker. Where workers are
 * unavailable (old browsers, tests) the search runs on the main thread.
 */
export function useChessAI(): (fen: string, opts: SearchOptions) => Promise<string | null> {
  const worker = useRef<Worker | null>(null);
  useEffect(() => {
    try {
      worker.current = new Worker(new URL('./ai.worker.ts', import.meta.url), { type: 'module' });
    } catch {
      worker.current = null;
    }
    return () => {
      worker.current?.terminate();
      worker.current = null;
    };
  }, []);

  return useCallback(
    (fen: string, opts: SearchOptions) =>
      new Promise<string | null>((resolve) => {
        const w = worker.current;
        if (!w) {
          const m = bestMove(new Chess(fen), opts);
          resolve(m === null ? null : toUci(m));
          return;
        }
        const id = ++seq;
        const onMessage = (e: MessageEvent<{ id: number; move: string | null }>) => {
          if (e.data.id !== id) return;
          w.removeEventListener('message', onMessage);
          resolve(e.data.move);
        };
        w.addEventListener('message', onMessage);
        w.postMessage({ id, fen, opts });
      }),
    [],
  );
}
