import { describe, expect, it } from 'vitest';
import type { DifficultySetting } from '@/types';
import {
  DAYS,
  GRACE,
  RUNWAY_TIME,
  SIZE,
  TUNING,
  autoGate,
  autoRunway,
  botStep,
  buy,
  dayOver,
  newAirport,
  payout,
  serviceTime,
  setupDay,
  tick,
  assignGate,
  assignRunway,
  validAirport,
} from './engine';
import type { Airport } from './engine';

function firstPlane(a: Airport) {
  while (!a.planes.length) tick(a, 0.1, 'normal');
  return a.planes[0];
}

describe('airport manager', () => {
  it('a plane lands, parks, turns around and departs for full pay', () => {
    const a = newAirport(1);
    const p = firstPlane(a);
    a.nextArrival = 1e9;
    expect(assignRunway(a, p.id, 0)).toBe(true);
    expect(assignRunway(a, p.id, 0)).toBe(false);
    tick(a, RUNWAY_TIME + 0.01, 'normal');
    expect(p.stage).toBe('taxi');
    expect(a.runways[0]).toBeNull();
    expect(assignGate(a, p.id, 0)).toBe(true);
    tick(a, serviceTime(a, p) + 0.01, 'normal');
    expect(p.stage).toBe('ready');
    expect(assignRunway(a, p.id, 0)).toBe(true);
    expect(a.gates[0].plane).toBeNull();
    tick(a, RUNWAY_TIME + 0.01, 'normal');
    expect(a.planes).toHaveLength(0);
    expect(a.flightsToday).toBe(1);
    expect(a.earnedToday).toBe(SIZE[p.size].pay);
  });

  it('jumbos only fit the big gates', () => {
    const a = newAirport(1);
    const p = firstPlane(a);
    p.size = 'large';
    p.stage = 'taxi';
    expect(assignGate(a, p.id, 1)).toBe(false);
    expect(assignGate(a, p.id, 0)).toBe(true);
  });

  it('waiting costs money and running out of fuel diverts the plane', () => {
    const p = {
      id: 1,
      code: 'X1',
      size: 'medium' as const,
      stage: 'ready' as const,
      t: 0,
      fuel: 0,
      waited: GRACE + 10,
      runway: null,
      gate: null,
    };
    expect(payout(p)).toBe(SIZE.medium.pay - 20);
    expect(payout({ ...p, waited: 999 })).toBe(Math.round(SIZE.medium.pay * 0.25));
    const a = newAirport(2);
    const q = firstPlane(a);
    a.nextArrival = 1e9;
    tick(a, q.fuel + 0.1, 'normal');
    expect(a.divertedToday).toBe(1);
    expect(a.earnedToday).toBe(-30);
  });

  it('tapping a free runway or gate handles the most urgent plane', () => {
    const a = newAirport(3);
    firstPlane(a);
    expect(autoRunway(a, 0)).toBe(true);
    expect(a.planes[0].stage).toBe('landing');
    expect(autoGate(a, 0)).toBe(false);
  });

  it('upgrades change the airport layout', () => {
    const a = newAirport(1);
    a.cash = 5000;
    for (const u of ['runway', 'gate', 'biggate', 'crew'] as const) expect(buy(a, u)).toBe(true);
    setupDay(a);
    expect(a.runways).toHaveLength(2);
    expect(a.gates).toHaveLength(5);
    expect(a.gates.filter((g) => g.large)).toHaveLength(2);
    expect(validAirport(JSON.parse(JSON.stringify(a)))).toBe(true);
    expect(validAirport({ ...a, upgrades: ['moon'] })).toBe(false);
  });

  function play(d: DifficultySetting, reaction: number, seed: number) {
    const a = newAirport(seed);
    for (let day = 1; day <= DAYS; day++) {
      let wait = 0;
      while (!dayOver(a)) {
        tick(a, 0.1, d);
        wait -= 0.1;
        if (wait <= 0) {
          botStep(a);
          wait = reaction;
        }
      }
      if (a.earnedToday < TUNING[d].goals[day - 1]) return day;
      for (const u of ['runway', 'gate', 'crew', 'biggate'] as const) buy(a, u);
      a.day += 1;
      if (a.day <= DAYS) setupDay(a);
    }
    return DAYS + 1;
  }

  it('a controller acting once a second gets through all five days', () => {
    for (const d of ['easy', 'normal', 'hard'] as const)
      for (const seed of [1, 2, 3]) expect(play(d, 1, seed), `${d} ${seed}`).toBe(DAYS + 1);
  });

  it('a slow controller falls short', () => {
    for (const d of ['easy', 'hard'] as const) expect(play(d, 2.5, 1)).toBeLessThanOrEqual(DAYS);
  });
});
