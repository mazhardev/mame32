import { WIN } from '../_shared/board/search';
import type { SearchGame } from '../_shared/board/search';

/**
 * Kalah rules. Pits 0–5 and store 6 belong to player 1 (bottom row, sown
 * left to right); pits 7–12 and store 13 belong to player 2.
 */
export interface MancalaState {
  pits: number[];
  turn: 1 | 2;
}

export const STORE = { 1: 6, 2: 13 } as const;
export const pitsOf = (p: 1 | 2) => (p === 1 ? [0, 1, 2, 3, 4, 5] : [7, 8, 9, 10, 11, 12]);
const opposite = (i: number) => 12 - i;

export function initial(seeds = 4): MancalaState {
  const pits = Array(14).fill(seeds);
  pits[6] = 0;
  pits[13] = 0;
  return { pits, turn: 1 };
}

export const isOver = (s: MancalaState) => pitsOf(1).every((i) => !s.pits[i]) || pitsOf(2).every((i) => !s.pits[i]);

export function legal(s: MancalaState): number[] {
  if (isOver(s)) return [];
  return pitsOf(s.turn).filter((i) => s.pits[i] > 0);
}

export interface SowResult {
  state: MancalaState;
  /** Pits visited in order, for animation. */
  path: number[];
  extraTurn: boolean;
  captured: number;
}

export function sow(s: MancalaState, pit: number): SowResult {
  const pits = [...s.pits];
  const me = s.turn;
  const skip = STORE[me === 1 ? 2 : 1];
  let seeds = pits[pit];
  pits[pit] = 0;
  let i = pit;
  const path: number[] = [];
  while (seeds > 0) {
    i = (i + 1) % 14;
    if (i === skip) continue;
    pits[i]++;
    seeds--;
    path.push(i);
  }
  let captured = 0;
  // Landing in one of your own empty pits captures it and the opposite pit.
  if (pitsOf(me).includes(i) && pits[i] === 1 && pits[opposite(i)] > 0) {
    captured = pits[opposite(i)] + 1;
    pits[STORE[me]] += captured;
    pits[i] = 0;
    pits[opposite(i)] = 0;
  }
  const extraTurn = i === STORE[me];
  let next: MancalaState = { pits, turn: extraTurn ? me : me === 1 ? 2 : 1 };
  if (isOver(next)) next = sweep(next);
  return { state: next, path, extraTurn: extraTurn && !isOver(next), captured };
}

/** When one side is empty, each player banks the seeds left on their side. */
function sweep(s: MancalaState): MancalaState {
  const pits = [...s.pits];
  for (const p of [1, 2] as const) {
    for (const i of pitsOf(p)) {
      pits[STORE[p]] += pits[i];
      pits[i] = 0;
    }
  }
  return { ...s, pits };
}

export const mancalaGame: SearchGame<MancalaState, number> = {
  moves: legal,
  play: (s, m) => sow(s, m).state,
  switches: (s, m) => sow(s, m).state.turn !== s.turn,
  terminal(s) {
    if (!isOver(s)) return null;
    const mine = s.pits[STORE[s.turn]];
    const theirs = s.pits[STORE[s.turn === 1 ? 2 : 1]];
    return mine === theirs ? 0 : mine > theirs ? WIN : -WIN;
  },
  evaluate(s) {
    const them = s.turn === 1 ? 2 : 1;
    const side = (p: 1 | 2) => pitsOf(p).reduce((a, i) => a + s.pits[i], 0);
    return (s.pits[STORE[s.turn]] - s.pits[STORE[them]]) * 4 + (side(s.turn) - side(them));
  },
};
