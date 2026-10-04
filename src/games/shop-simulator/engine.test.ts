import { describe, expect, it } from 'vitest';
import type { DifficultySetting } from '@/types';
import {
  DAYS,
  PRODUCT,
  TUNING,
  available,
  buyUpgrade,
  capacity,
  demandHint,
  newShop,
  onShelf,
  restock,
  runDay,
  setPrice,
  validShop,
} from './engine';

function play(seed: number, d: DifficultySetting, markup: number) {
  const s = newShop(seed, d);
  while (s.day <= DAYS) {
    for (const u of ['shelves', 'fridge', 'range', 'advert'] as const)
      if (s.cash > 300) buyUpgrade(s, u);
    for (const p of available(s)) {
      setPrice(s, p.id, PRODUCT[p.id].fair * markup);
      restock(s, p.id, demandHint(s, p.id, d) - onShelf(s, p.id));
    }
    runDay(s, d);
  }
  return s;
}

describe('shop simulator', () => {
  it('restocking respects cash and shelf space', () => {
    const s = newShop(1, 'normal');
    s.cash = 20;
    expect(restock(s, 'bread', 50)).toBe(10);
    expect(s.cash).toBe(0);
    s.cash = 1000;
    expect(restock(s, 'bread', 50)).toBe(capacity(s) - 10);
    expect(onShelf(s, 'bread')).toBe(15);
  });

  it('perishables spoil and the chiller makes them last longer', () => {
    const s = newShop(1, 'normal');
    s.cash = 1000;
    restock(s, 'paper', 15);
    setPrice(s, 'paper', 90);
    runDay(s, 'normal');
    expect(onShelf(s, 'paper')).toBe(0);
    expect(s.spoiled).toBe(15);
    const f = newShop(1, 'normal');
    f.cash = 1000;
    buyUpgrade(f, 'fridge');
    restock(f, 'bread', 15);
    setPrice(f, 'bread', 15);
    for (let i = 0; i < 3; i++) runDay(f, 'normal');
    expect(onShelf(f, 'bread')).toBeGreaterThan(0);
  });

  it('nobody pays three times the fair price, and empty shelves hurt reputation', () => {
    const s = newShop(2, 'normal');
    s.cash = 1000;
    for (const p of available(s)) {
      restock(s, p.id, 15);
      setPrice(s, p.id, p.fair * 3);
    }
    const r = runDay(s, 'normal');
    expect(r.revenue).toBe(0);
    expect(r.repAfter).toBeLessThan(r.repBefore);
    const e = newShop(2, 'normal');
    const r2 = runDay(e, 'normal');
    expect(r2.visits.every((v) => v.mood === 'sad')).toBe(true);
  });

  it('the same seed plays out the same day', () => {
    const a = newShop(5, 'easy');
    const b = newShop(5, 'easy');
    for (const s of [a, b]) {
      s.cash = 500;
      for (const p of available(s)) restock(s, p.id, 10);
    }
    expect(runDay(a, 'easy')).toEqual(runDay(b, 'easy'));
  });

  it('wider range unlocks coffee and toys', () => {
    const s = newShop(1, 'easy');
    expect(available(s).map((p) => p.id)).not.toContain('coffee');
    s.cash = 500;
    expect(buyUpgrade(s, 'range')).toBe(true);
    expect(available(s).map((p) => p.id)).toContain('toys');
    expect(validShop(JSON.parse(JSON.stringify(s)))).toBe(true);
    expect(validShop({ ...s, upgrades: ['laser'] })).toBe(false);
  });

  it('a sensible shopkeeper reaches the goal on every difficulty; a greedy one does not', () => {
    for (const d of ['easy', 'normal', 'hard'] as const)
      for (const seed of [1, 2, 3, 4]) {
        expect(play(seed, d, 1).cash, `${d} ${seed}`).toBeGreaterThanOrEqual(TUNING[d].goal);
        expect(play(seed, d, 1.6).cash).toBeLessThan(TUNING[d].goal);
      }
  });
});
