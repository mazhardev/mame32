import { useCallback, useEffect, useRef, useState } from 'react';
import { prefersReducedMotion } from '../_shared/puzzle/useGridCursor';
import type { Fired, State, Step } from './engine';

export const TIMING = { swap: 170, pop: 240, fall: 260, shuffle: 520, grow: 320 };

export interface Effect {
  key: number;
  fired: Fired;
}

export interface Floater {
  key: number;
  text: string;
  /** Board cell to float from, or -1 for the middle of the board. */
  cell: number;
  big?: boolean;
}

export interface View {
  state: State;
  popping: Set<number>;
  spawned: Map<number, number>;
  effects: Effect[];
  floaters: Floater[];
  /** Cells whose obstacle just took a hit. */
  cracked: Set<number>;
}

const COMBO_WORDS = ['', '', 'Sweet!', 'Delightful!', 'Scrumptious!', 'Sugar Storm!', 'Candy Quake!'];

let key = 1;

/**
 * Plays engine steps on screen: pops, special blasts, falls, chocolate growth
 * and shuffles, each with its own short animation phase. Callers hand it the
 * steps from a move; `onStep` fires as each step lands so goals and score
 * stay in sync with what the player sees.
 */
export function usePlayer(initial: () => State) {
  const [view, setView] = useState<View>(() => ({
    state: initial(),
    popping: new Set(),
    spawned: new Map(),
    effects: [],
    floaters: [],
    cracked: new Set(),
  }));
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const stateRef = useRef(view.state);
  const timers = useRef<number[]>([]);
  const generation = useRef(0);

  const wait = (ms: number) =>
    new Promise<void>((resolve) => {
      const t = window.setTimeout(resolve, prefersReducedMotion() ? Math.min(ms, 50) : ms);
      timers.current.push(t);
    });

  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  const patch = (p: Partial<View>) => {
    setView((v) => ({ ...v, ...p }));
    if (p.state) stateRef.current = p.state;
  };

  const floatText = useCallback((text: string, cell = -1, big = false) => {
    const f: Floater = { key: key++, text, cell, big };
    setView((v) => ({ ...v, floaters: [...v.floaters.slice(-4), f] }));
    const t = window.setTimeout(() => setView((v) => ({ ...v, floaters: v.floaters.filter((x) => x !== f) })), 1100);
    timers.current.push(t);
  }, []);

  /** Shows a new board immediately, cancelling any animation in flight. */
  const reset = useCallback((s: State) => {
    generation.current++;
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
    stateRef.current = s;
    busyRef.current = false;
    setBusy(false);
    setView({ state: s, popping: new Set(), spawned: new Map(), effects: [], floaters: [], cracked: new Set() });
  }, []);

  /**
   * Animates a list of steps. `preview` (if given) is shown first, e.g. the
   * two swapped candies. Returns false if a reset interrupted it.
   */
  const play = useCallback(
    async (steps: Step[], onStep: (step: Step, index: number) => void, preview?: State): Promise<boolean> => {
      const gen = generation.current;
      busyRef.current = true;
      setBusy(true);
      if (preview) {
        patch({ state: preview, spawned: new Map() });
        await wait(TIMING.swap);
      }
      for (let i = 0; i < steps.length; i++) {
        if (gen !== generation.current) return false;
        const step = steps[i];
        if (step.kind === 'match') {
          // Pops and blasts on the old pieces, with new specials and broken obstacles in place.
          const shown = { ...step.cleared, pieces: stateRef.current.pieces.slice() };
          step.created.forEach(({ cell, piece }) => (shown.pieces[cell] = piece));
          patch({
            state: shown,
            popping: new Set(step.popped),
            cracked: new Set(step.obstacleHits),
            effects: step.fired.map((fired) => ({ key: key++, fired })),
          });
          if (step.combo >= 2 && COMBO_WORDS[Math.min(step.combo, COMBO_WORDS.length - 1)]) {
            floatText(COMBO_WORDS[Math.min(step.combo, COMBO_WORDS.length - 1)], -1, true);
          }
          if (step.points > 0 && step.popped.length) floatText(`+${step.points}`, step.popped[Math.floor(step.popped.length / 2)]);
          await wait(TIMING.pop + (step.fired.length ? 80 : 0));
          if (gen !== generation.current) return false;
          patch({ state: step.state, popping: new Set(), spawned: step.spawned, effects: [], cracked: new Set() });
          onStep(step, i);
          step.ingredientsOut.forEach((cell) => floatText('+500', cell));
          await wait(TIMING.fall);
        } else if (step.kind === 'chocolate') {
          patch({ state: step.state, popping: new Set(), spawned: new Map(), cracked: new Set(step.popped) });
          onStep(step, i);
          await wait(TIMING.grow);
          patch({ cracked: new Set() });
        } else if (step.kind === 'shuffle') {
          floatText('Shuffle!', -1, true);
          await wait(260);
          patch({ state: step.state, popping: new Set(), spawned: new Map() });
          onStep(step, i);
          await wait(TIMING.shuffle);
        } else {
          patch({ state: step.state, popping: new Set(), spawned: new Map() });
          onStep(step, i);
          await wait(TIMING.pop);
        }
      }
      if (gen !== generation.current) return false;
      busyRef.current = false;
      setBusy(false);
      return true;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [floatText],
  );

  /** Shows a rejected swap: the two candies trade places and slide back. */
  const bounce = useCallback(async (swapped: State) => {
    const gen = generation.current;
    const before = stateRef.current;
    busyRef.current = true;
    setBusy(true);
    patch({ state: swapped, spawned: new Map() });
    await wait(TIMING.swap);
    if (gen !== generation.current) return;
    patch({ state: before });
    await wait(TIMING.swap);
    if (gen !== generation.current) return;
    busyRef.current = false;
    setBusy(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { view, busy, busyRef, stateRef, reset, play, bounce, floatText };
}
