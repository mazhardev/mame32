import { describe, expect, it } from 'vitest';
import {
  CROPS,
  LAST_DAY,
  TUNING,
  act,
  actionFor,
  canFinish,
  expand,
  forage,
  newFarm,
  placeSprinkler,
  ripe,
  sleep,
  sprinklerCover,
  validFarm,
} from './engine';
import type { Farm, Tuning } from './engine';

/** Plants the most profitable in-season crop, waters everything, harvests, invests. */
function play(f: Farm, t: Tuning) {
  while (f.day <= LAST_DAY) {
    const choices = CROPS.filter((c) => canFinish(c, f.day));
    choices.sort((a, b) => (b.sell - b.seed) / (b.days + 1) - (a.sell - a.seed) / (a.days + 1));
    for (let i = 0; i < f.plots.length && f.energy > 0; i++)
      if (actionFor(f.plots[i]) === 'harvest') act(f, i, '');
    for (let i = 0; i < f.plots.length && f.energy > 0; i++)
      if (actionFor(f.plots[i]) === 'water') act(f, i, '');
    for (let i = 0; i < f.plots.length && f.energy > 0; i++)
      if (actionFor(f.plots[i]) === 'clear') act(f, i, '');
    if (f.coins > 400 && f.cols < 8) expand(f);
    if (f.coins > 500 && f.plots.filter((p) => p.sprinkler).length < 3) {
      const spot = f.plots.findIndex(
        (p, i) =>
          !p.crop &&
          !p.sprinkler &&
          i % f.cols === 1 + 3 * f.plots.filter((q) => q.sprinkler).length,
      );
      if (spot >= 0) placeSprinkler(f, spot);
    }
    // Keep enough energy to water what is already growing tomorrow.
    for (let i = 0; i < f.plots.length && f.energy > 2; i++) {
      const pick = choices.find((c) => c.seed <= f.coins);
      if (pick && actionFor(f.plots[i]) === 'plant') act(f, i, pick.id);
    }
    if (f.energy > 0) forage(f, f.energy);
    if (f.day === LAST_DAY) break;
    sleep(f, t);
  }
  return f.coins;
}

describe('farm simulator', () => {
  it('crops grow only with water and wither after two dry nights', () => {
    const t = { ...TUNING.normal, rain: 0 };
    const f = newFarm(1, t);
    f.raining = false;
    expect(act(f, 0, 'radish')).toBe('plant');
    expect(act(f, 0, 'radish')).toBe('water');
    sleep(f, t);
    expect(f.plots[0].age).toBe(1);
    sleep(f, t);
    expect(f.plots[0].dead).toBe(false);
    sleep(f, t);
    expect(f.plots[0].dead).toBe(true);
  });

  it('harvesting pays the day’s price; perennials regrow', () => {
    const t = { ...TUNING.normal, rain: 1 };
    const f = newFarm(2, t);
    f.coins = 500;
    act(f, 0, 'strawberry');
    for (let d = 0; d < 4; d++) sleep(f, t);
    expect(ripe(f.plots[0])).toBe(true);
    const coins = f.coins;
    expect(act(f, 0, '')).toBe('harvest');
    expect(f.coins).toBeGreaterThan(coins);
    expect(f.plots[0].crop).toBe('strawberry');
    expect(ripe(f.plots[0])).toBe(false);
  });

  it('energy limits actions and out-of-season seeds cannot be planted', () => {
    const t = TUNING.hard;
    const f = newFarm(3, t);
    f.coins = 10000;
    f.raining = false;
    expect(act(f, 0, 'pumpkin')).toBeNull();
    let acts = 0;
    for (let i = 0; i < f.plots.length; i++)
      for (let k = 0; k < 3; k++) if (act(f, i, 'radish')) acts++;
    expect(acts).toBe(t.energy);
  });

  it('sprinklers water their neighbours and the farm can grow', () => {
    const t = TUNING.normal;
    const f = newFarm(4, t);
    f.coins = 1000;
    expect(placeSprinkler(f, 6)).toBe(true);
    expect(sprinklerCover(f).has(0)).toBe(true);
    expect(sprinklerCover(f).has(12)).toBe(true);
    expect(expand(f)).toBe(true);
    expect(f.cols).toBe(6);
    expect(f.plots[7].sprinkler).toBe(true);
  });

  it('a diligent farmer reaches the goal on every difficulty', () => {
    for (const d of ['easy', 'normal', 'hard'] as const) {
      const coins = [1, 2, 3].map((seed) => play(newFarm(seed, TUNING[d]), TUNING[d]));
      expect(Math.max(...coins)).toBeGreaterThanOrEqual(TUNING[d].goal);
    }
  });

  it('validates saves', () => {
    expect(validFarm(newFarm(1, TUNING.easy))).toBe(true);
    expect(validFarm({ ...newFarm(1, TUNING.easy), cols: 9 })).toBe(false);
  });
});
