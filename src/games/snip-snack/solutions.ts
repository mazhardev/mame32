import type { Action } from './engine';

/**
 * A three-star solution for every level, as the frame of each cut, pop and
 * puff. The tests replay them, and scripts/check-snip-snack.ts reports how
 * much timing slack each step has.
 */
export const SOLUTIONS: Action[][] = [
  // 1. First Snip
  [{ f: 6, kind: 'cut', rope: 0 }],
  // 2. Two Knots
  [{ f: 10, kind: 'cut', rope: 0 }, { f: 78, kind: 'cut', rope: 1 }],
  // 3. Pendulum
  [{ f: 190, kind: 'cut', rope: 0 }],
  // 4. Three Strings
  [{ f: 10, kind: 'cut', rope: 2 }, { f: 60, kind: 'cut', rope: 1 }, { f: 135, kind: 'cut', rope: 0 }],
  // 5. Long Drop
  [{ f: 72, kind: 'cut', rope: 0 }],
  // 6. Bubble Up
  [{ f: 10, kind: 'cut', rope: 0 }],
  // 7. Gust
  [{ f: 10, kind: 'cut', rope: 0 }, { f: 96, kind: 'blow', i: 0 }, { f: 150, kind: 'pop' }],
  // 8. Catch Me
  [{ f: 100, kind: 'cut', rope: 0 }, { f: 165, kind: 'cut', rope: 1 }],
  // 9. Spike Wall
  [{ f: 84, kind: 'cut', rope: 0 }],
  // 10. Up and Over
  [{ f: 10, kind: 'cut', rope: 0 }, { f: 150, kind: 'blow', i: 0 }],
  // 11. Relay
  [{ f: 38, kind: 'cut', rope: 0 }, { f: 108, kind: 'cut', rope: 1 }, { f: 174, kind: 'cut', rope: 2 }],
  // 12. Crosswind
  [{ f: 10, kind: 'cut', rope: 0 }, { f: 66, kind: 'blow', i: 0 }, { f: 134, kind: 'blow', i: 1 }],
  // 13. Bubble Lift
  [{ f: 10, kind: 'cut', rope: 0 }, { f: 180, kind: 'pop' }, { f: 249, kind: 'cut', rope: 1 }],
  // 14. Spike Gauntlet
  [{ f: 38, kind: 'cut', rope: 0 }, { f: 105, kind: 'cut', rope: 1 }],
  // 15. Grand Finale
  [{ f: 9, kind: 'cut', rope: 1 }, { f: 76, kind: 'cut', rope: 0 }, { f: 187, kind: 'blow', i: 0 }, { f: 246, kind: 'pop' }, { f: 312, kind: 'cut', rope: 2 }],
];
