import { describe, expect, it } from 'vitest';
import {
  COMPANIES,
  START_CASH,
  TUNING,
  buy,
  fee,
  maxBuy,
  netWorth,
  newMarket,
  nextDay,
  price,
  sell,
  validMarket,
} from './engine';

describe('stock market', () => {
  it('is deterministic for a seed', () => {
    const a = newMarket(7);
    const b = newMarket(7);
    for (let i = 0; i < 20; i++) {
      nextDay(a, TUNING.normal);
      nextDay(b, TUNING.normal);
    }
    expect(a.prices).toEqual(b.prices);
  });

  it('buying and selling charge fees and track holdings', () => {
    const m = newMarket(1);
    const p = price(m, 'BFN');
    expect(buy(m, 'BFN', 10)).toBe(true);
    expect(m.cash).toBeCloseTo(START_CASH - 10 * p - fee(10 * p));
    expect(sell(m, 'BFN', 11)).toBe(false);
    expect(sell(m, 'BFN', 10)).toBe(true);
    expect(m.holdings.BFN.shares).toBe(0);
    expect(m.cash).toBeLessThan(START_CASH);
    const n = maxBuy(m, 'CLF');
    expect(buy(m, 'CLF', n)).toBe(true);
    expect(buy(m, 'CLF', 1)).toBe(false);
  });

  it('good news tends to lift a price on Easy', () => {
    let up = 0;
    let total = 0;
    for (let seed = 1; seed <= 120; seed++) {
      const m = newMarket(seed);
      const news = nextDay(m, TUNING.easy);
      for (let d = 0; d < 3; d++) nextDay(m, TUNING.easy);
      for (const h of news) {
        // Compare with the price before the headline.
        const before = m.prices[h.sym][0];
        const moved = price(m, h.sym) > before;
        if (moved === h.good) up++;
        total++;
      }
    }
    expect(up / total).toBeGreaterThan(0.6);
  });

  it('prices stay positive and net worth adds up', () => {
    const m = newMarket(3);
    buy(m, 'TDL', 100);
    for (let i = 0; i < TUNING.hard.days; i++) nextDay(m, TUNING.hard);
    for (const c of COMPANIES) expect(price(m, c.sym)).toBeGreaterThan(0);
    expect(netWorth(m)).toBeCloseTo(m.cash + 100 * price(m, 'TDL'));
    expect(validMarket(m)).toBe(true);
    expect(validMarket({ ...m, day: 2 })).toBe(false);
  });
});
