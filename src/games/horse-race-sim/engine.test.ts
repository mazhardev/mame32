import { describe, expect, it } from 'vitest';
import { createRng } from '@/utils/random';
import { DISTANCE, FIELD, TUNING, makeRace, payout, simulate, winChances } from './engine';

describe('horse race simulation', () => {
  it('every runner finishes and the order is a permutation', () => {
    const rng = createRng(1).next;
    const race = makeRace(TUNING.normal, rng);
    const run = simulate(race, TUNING.normal, rng, true);
    expect([...run.order].sort()).toEqual([0, 1, 2, 3, 4, 5]);
    expect(run.frames.at(-1)!.every((p) => p === DISTANCE)).toBe(true);
    expect(race.runners).toHaveLength(FIELD);
    expect(new Set(race.runners.map((r) => r.name)).size).toBe(FIELD);
  });

  it('favourites win more often than outsiders, and odds include a margin', () => {
    const rng = createRng(7).next;
    let favWins = 0;
    let outsiderWins = 0;
    for (let i = 0; i < 40; i++) {
      const race = makeRace(TUNING.normal, rng);
      const byOdds = race.runners.map((r, idx) => [r.odds, idx]).sort((a, b) => a[0] - b[0]);
      const winner = simulate(race, TUNING.normal, rng).order[0];
      if (winner === byOdds[0][1]) favWins++;
      if (winner === byOdds[FIELD - 1][1]) outsiderWins++;
      const book = race.runners.reduce((a, r) => a + 1 / r.odds, 0);
      expect(book).toBeGreaterThan(1);
    }
    expect(favWins).toBeGreaterThan(outsiderWins);
  });

  it('races are more predictable on Easy than on Hard', () => {
    const rng = createRng(3).next;
    const race = makeRace(TUNING.normal, rng);
    const top = (t: typeof TUNING.easy) => Math.max(...winChances(race, t, rng, 600));
    expect(top(TUNING.easy)).toBeGreaterThan(top(TUNING.hard));
  });

  it('pays win and place bets correctly', () => {
    expect(payout('win', 4, 10, 1)).toBe(40);
    expect(payout('win', 4, 10, 2)).toBe(0);
    expect(payout('place', 5, 20, 3)).toBe(40);
    expect(payout('place', 5, 20, 4)).toBe(0);
  });
});
