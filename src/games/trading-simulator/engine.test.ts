import { describe, expect, it } from 'vitest';
import {
  GOODS,
  PORTS,
  START_GOLD,
  TUNING,
  buy,
  cargoUsed,
  distance,
  newTrader,
  passDay,
  priceOf,
  sail,
  sell,
  sellPrice,
  upgradeHold,
  validTrader,
} from './engine';
import type { Good, Trader } from './engine';

/** A merchant who buys whatever has the best margin to some port and sails there. */
function play(t: Trader, tune = TUNING.normal) {
  while (t.day < tune.days) {
    for (const g of GOODS) sell(t, g, 999, tune);
    if (t.gold > 2000 && t.capacity < 150) upgradeHold(t);
    let best: { g: Good; to: string; score: number } | null = null;
    for (const p of PORTS) {
      if (p.id === t.port) continue;
      for (const g of GOODS) {
        const margin = sellPrice(t, p.id, g) - priceOf(t, t.port, g);
        const score = margin / distance(t.port, p.id);
        if (!best || score > best.score) best = { g, to: p.id, score };
      }
    }
    if (!best) break;
    if (best.score > 0) buy(t, best.g, 999, tune);
    if (t.day + distance(t.port, best.to) > tune.days) break;
    sail(t, best.to, tune);
  }
  for (const g of GOODS) sell(t, g, 999, tune);
  return t.gold;
}

describe('trading simulator', () => {
  it('buying raises the price and selling lowers it', () => {
    const t = newTrader(1);
    const p0 = priceOf(t, 'salt', 'grain');
    expect(buy(t, 'grain', 20, TUNING.normal)).toBe(20);
    expect(priceOf(t, 'salt', 'grain')).toBeGreaterThan(p0);
    expect(cargoUsed(t)).toBe(20);
    const gold = t.gold;
    sell(t, 'grain', 20, TUNING.normal);
    expect(t.gold).toBeLessThan(START_GOLD);
    expect(t.gold).toBeGreaterThan(gold);
  });

  it('the hold limits cargo and can be enlarged', () => {
    const t = newTrader(2);
    t.gold = 10000;
    expect(buy(t, 'grain', 80, TUNING.normal)).toBe(50);
    expect(upgradeHold(t)).toBe(true);
    expect(t.capacity).toBe(75);
  });

  it('sailing takes days and costs upkeep', () => {
    const t = newTrader(3);
    const days = sail(t, 'amber', TUNING.easy);
    expect(days).toBe(distance('salt', 'amber'));
    expect(t.port).toBe('amber');
    expect(t.day).toBeGreaterThanOrEqual(1 + days);
    expect(t.gold).toBeLessThan(START_GOLD);
  });

  it('markets recover after a big trade', () => {
    const t = newTrader(4);
    buy(t, 'grain', 40, TUNING.normal);
    const high = priceOf(t, 'salt', 'grain');
    for (let i = 0; i < 10; i++) passDay(t, TUNING.normal);
    expect(priceOf(t, 'salt', 'grain')).toBeLessThan(high);
  });

  it('a sensible merchant reaches each goal', () => {
    for (const d of ['easy', 'normal', 'hard'] as const) {
      let wins = 0;
      const golds: number[] = [];
      for (let seed = 1; seed <= 6; seed++) {
        const g = play(newTrader(seed), TUNING[d]);
        golds.push(Math.round(g));
        if (g >= TUNING[d].goal) wins++;
      }
      // A simple greedy merchant: easy is comfortable, hard needs better play than this.
      expect(wins).toBeGreaterThanOrEqual(d === 'easy' ? 5 : d === 'normal' ? 3 : 2);
    }
  });

  it('validates saves', () => {
    expect(validTrader(newTrader(1))).toBe(true);
    expect(validTrader({ ...newTrader(1), port: 'atlantis' })).toBe(false);
  });
});
