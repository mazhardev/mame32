import { describe, expect, it } from 'vitest';
import { createRng } from '@/utils/random';
import {
  DAYS,
  DISH,
  TUNING,
  botStep,
  buy,
  cookTime,
  dayOver,
  menu,
  newKitchen,
  ready,
  serve,
  setupDay,
  tapStation,
  tick,
  UPGRADES,
  validKitchen,
} from './engine';
import type { Kitchen } from './engine';
import type { DifficultySetting } from '@/types';

const seat = (k: Kitchen, order: Kitchen['hands']) => {
  k.customers[0] = {
    id: 1,
    table: 0,
    order: order as never,
    served: [],
    patience: 30,
    max: 30,
    eating: null,
    face: '🧑',
  };
};

describe('restaurant simulator', () => {
  it('unlocks one more dish on days 2 to 4', () => {
    expect(menu(1).map((d) => d.id)).toEqual(['burger', 'smoothie']);
    expect(menu(5)).toHaveLength(5);
  });

  it('cooks, picks up and serves a dish, then the customer pays', () => {
    const k = newKitchen('normal');
    seat(k, ['burger']);
    k.nextArrival = 999;
    expect(tapStation(k, 0)).toBe('start');
    expect(tapStation(k, 0)).toBe('busy');
    tick(k, DISH.burger.cook + 0.01, 'normal', () => 0.5);
    expect(ready(k, k.stations[0])).toBe(true);
    expect(tapStation(k, 0)).toBe('pick');
    expect(k.hands).toEqual(['burger']);
    expect(serve(k, 0)).toBe(1);
    expect(k.customers[0]?.eating).not.toBeNull();
    tick(k, 5, 'normal', () => 0.5);
    expect(k.customers[0]).toBeNull();
    expect(k.earnedToday).toBeGreaterThan(DISH.burger.price);
    expect(k.servedToday).toBe(1);
  });

  it('only serves what the table ordered', () => {
    const k = newKitchen('normal');
    seat(k, ['burger']);
    k.hands = ['smoothie'];
    expect(serve(k, 0)).toBe(0);
    expect(k.hands).toEqual(['smoothie']);
  });

  it('burns food left on the grill and lets impatient customers leave', () => {
    const k = newKitchen('normal');
    k.nextArrival = 999;
    tapStation(k, 0);
    tick(k, cookTime(k, 'burger') + DISH.burger.burn! + 0.1, 'normal', () => 0.5);
    expect(k.stations[0].burnt).toBe(true);
    expect(tapStation(k, 0)).toBe('trash');
    seat(k, ['burger']);
    tick(k, 31, 'normal', () => 0.5);
    expect(k.customers[0]).toBeNull();
    expect(k.lostToday).toBe(1);
  });

  it('upgrades cost cash and change the kitchen', () => {
    const k = newKitchen('easy');
    expect(buy(k, 'grill')).toBe(false);
    k.cash = 500;
    for (const u of UPGRADES) expect(buy(k, u.id)).toBe(true);
    expect(buy(k, 'grill')).toBe(false);
    setupDay(k, 'easy');
    expect(k.stations.filter((s) => s.dish === 'burger')).toHaveLength(2);
    expect(k.customers).toHaveLength(TUNING.easy.tables + 1);
    expect(cookTime(k, 'burger')).toBeCloseTo(DISH.burger.cook * 0.75);
    expect(validKitchen(JSON.parse(JSON.stringify(k)))).toBe(true);
    expect(validKitchen({ ...k, upgrades: ['rocket'] })).toBe(false);
  });

  function play(d: DifficultySetting, reaction: number, seed: number) {
    const rng = createRng(seed);
    const k = newKitchen(d);
    for (let day = 1; day <= DAYS; day++) {
      let wait = 0;
      while (!dayOver(k)) {
        tick(k, 0.1, d, rng.next);
        wait -= 0.1;
        if (wait <= 0) {
          botStep(k);
          wait = reaction;
        }
      }
      if (k.earnedToday < TUNING[d].goals[day - 1]) return day;
      for (const u of UPGRADES) buy(k, u.id);
      k.day += 1;
      if (k.day <= DAYS) setupDay(k, d);
    }
    return DAYS + 1;
  }

  it('a player tapping once a second clears all five days on every difficulty', () => {
    for (const d of ['easy', 'normal', 'hard'] as const)
      for (const seed of [1, 2, 3]) expect(play(d, 1, seed), `${d} ${seed}`).toBe(DAYS + 1);
  });

  it('an idle player fails on day one', () => {
    expect(play('easy', 1000, 1)).toBe(1);
  });
});
