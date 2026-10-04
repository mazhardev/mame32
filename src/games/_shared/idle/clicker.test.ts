import { describe, expect, it } from 'vitest';
import {
  buy,
  buyUpgrade,
  click,
  clickValue,
  newClicker,
  prestigeAvailable,
  prestigeReset,
  price,
  rate,
  tick,
  tieredUpgrades,
  validClicker,
} from './clicker';
import type { ClickerCfg, Producer } from './clicker';

const producers: Producer[] = [
  { id: 'a', name: 'A', icon: 'a', base: 10, rate: 1, desc: '' },
  { id: 'b', name: 'B', icon: 'b', base: 100, rate: 10, desc: '' },
];
const cfg: ClickerCfg = {
  producers,
  upgrades: [
    ...tieredUpgrades(producers, {}),
    { id: 'c', name: 'C', icon: 'c', cost: 5, desc: '', target: 'click', mult: 2 },
  ],
  click: 1,
  growth: 1.15,
  goal: 1e6,
  prestige: { per: 1000, bonus: 0.1 },
};

describe('clicker engine', () => {
  it('clicks, buys producers and earns per second', () => {
    const s = newClicker(cfg);
    for (let i = 0; i < 10; i++) click(cfg, s);
    expect(s.amount).toBe(10);
    expect(buy(cfg, s, 'a', 1)).toBe(true);
    expect(s.amount).toBe(0);
    expect(price(cfg, s, 'a', 1)).toBeCloseTo(11.5);
    tick(cfg, s, 2);
    expect(s.amount).toBeCloseTo(2);
    expect(buy(cfg, s, 'b', 1)).toBe(false);
  });

  it('upgrades multiply clicks and producers', () => {
    const s = newClicker(cfg);
    s.amount = 1000;
    buy(cfg, s, 'a', 1);
    const before = rate(cfg, s);
    expect(buyUpgrade(cfg, s, 'a-0')).toBe(true);
    expect(rate(cfg, s)).toBeCloseTo(before * 2);
    expect(buyUpgrade(cfg, s, 'a-1')).toBe(false); // needs 10 owned
    buyUpgrade(cfg, s, 'c');
    expect(clickValue(cfg, s)).toBe(2);
  });

  it('prestige resets progress for a permanent bonus', () => {
    const s = newClicker(cfg);
    s.total = 9000;
    s.amount = 50;
    s.owned.a = 5;
    expect(prestigeAvailable(cfg, s)).toBe(3);
    expect(prestigeReset(cfg, s)).toBe(true);
    expect(s.owned.a).toBe(0);
    expect(s.amount).toBe(0);
    expect(clickValue(cfg, s)).toBeCloseTo(1.3);
    expect(prestigeReset(cfg, s)).toBe(false);
  });

  it('validates saves', () => {
    expect(validClicker(newClicker(cfg))).toBe(true);
    expect(validClicker({ ...newClicker(cfg), amount: -5 })).toBe(false);
    expect(validClicker({ v: 1 })).toBe(false);
  });
});
