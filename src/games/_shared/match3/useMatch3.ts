import { useCallback, useEffect, useRef, useState } from 'react';
import { prefersReducedMotion } from '../puzzle/useGridCursor';
import { adjacent, findMove, playSwap } from './engine';
import type { Board, Config, Step } from './engine';

export const TIMING = { swap: 160, pop: 190, fall: 230 };

/**
 * Drives a match-three board: plays swaps through the engine and steps
 * through the resulting cascade with timed animation phases. `onStep` is
 * called once per cascade step (for score and goals); `onSettled` when the
 * board is still again.
 */
export function useMatch3(
  cfg: Config,
  initial: () => Board,
  random: () => number,
  handlers: {
    /** A swap was legal and its cascade is about to play. */
    onAccepted?: () => void;
    onStep?: (step: Step, index: number) => void;
    onSettled?: (board: Board) => void;
    onInvalid?: () => void;
  },
) {
  const [board, setBoard] = useState<Board>(initial);
  const [popping, setPopping] = useState<Set<number>>(new Set());
  const [spawned, setSpawned] = useState<Map<number, number>>(new Map());
  const [busy, setBusy] = useState(false);
  const boardRef = useRef(board);
  boardRef.current = board;
  const timers = useRef<number[]>([]);
  const h = useRef(handlers);
  h.current = handlers;

  const wait = (ms: number) =>
    new Promise<void>((resolve) => {
      const t = window.setTimeout(resolve, prefersReducedMotion() ? Math.min(ms, 40) : ms);
      timers.current.push(t);
    });

  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  const reset = useCallback((next: Board) => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
    setBoard(next);
    setPopping(new Set());
    setSpawned(new Map());
    setBusy(false);
  }, []);

  const swap = useCallback(
    async (a: number, b: number) => {
      const start = boardRef.current;
      if (busy || !adjacent(cfg, a, b)) return false;
      setBusy(true);
      const shown = start.slice();
      [shown[a], shown[b]] = [shown[b], shown[a]];
      setBoard(shown);
      await wait(TIMING.swap);
      const steps = playSwap(cfg, start, a, b, random);
      if (!steps) {
        setBoard(start);
        h.current.onInvalid?.();
        await wait(TIMING.swap);
        setBusy(false);
        return false;
      }
      h.current.onAccepted?.();
      let current = shown;
      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        if (step.cleared.length) {
          setPopping(new Set(step.cleared));
          // Specials appear in place while the rest of the match pops.
          const withSpecials = current.slice();
          step.created.forEach(({ cell, piece }) => (withSpecials[cell] = piece));
          setBoard(withSpecials);
          await wait(TIMING.pop);
        }
        const before = new Set(current.map((p) => p?.id));
        const fresh = new Map<number, number>();
        step.board.forEach((p) => {
          if (p && !before.has(p.id)) fresh.set(p.id, step.drops.get(p.id) ?? 1);
        });
        setPopping(new Set());
        setSpawned(fresh);
        setBoard(step.board);
        current = step.board;
        h.current.onStep?.(step, i);
        await wait(TIMING.fall);
      }
      setBusy(false);
      h.current.onSettled?.(current);
      return true;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [busy, cfg, random],
  );

  const hint = useCallback(() => findMove(cfg, boardRef.current), [cfg]);

  return { board, popping, spawned, busy, swap, reset, hint, setBoard };
}
