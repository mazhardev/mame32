import { describe, expect, it } from 'vitest';
import { emptyInput, inputWith } from '../_shared/arcade/kit';
import { createRng } from '@/utils/random';
import { BOW, FOES, SHOP, buy, create, fire, spec, startWave, waveFoes } from './game';
import type { State } from './game';

/** A gunner who aims at the nearest attacker and buys upgrades between waves. */
function play(s: State, rng: () => number, aimWell: boolean) {
  for (let i = 0; i < 60 * 900 && !s.over; i++) {
    s.time += 1 / 60;
    if (s.phase === 'shop') {
      for (const id of ['repair', 'damage', 'reload', 'archer', 'catapult', 'triple', 'stone'])
        buy(s, id);
      startWave(s);
      continue;
    }
    if (aimWell) {
      const target = [...s.foes].sort((a, b) => a.x - b.x)[0];
      if (target) {
        // Lead slightly and allow for drop over the distance.
        const dx = target.x - BOW.x;
        const t = dx / 720;
        const lead = FOES[target.kind].flying ? 0 : FOES[target.kind].speed * t;
        s.aim = Math.atan2(target.y - BOW.y - 0.5 * 320 * t * t, dx - lead);
        fire(s);
      }
    }
    spec.update(s, 1 / 60, emptyInput(), rng);
  }
}

describe('castle defense', () => {
  it('the shop sells upgrades only between waves', () => {
    const s = create('normal');
    s.gold = 1000;
    expect(buy(s, 'damage')).toBe(true);
    expect(s.damage).toBeGreaterThan(22);
    startWave(s);
    expect(buy(s, 'archer')).toBe(false);
    expect(SHOP.length).toBeGreaterThan(4);
  });

  it('a castle with nobody shooting falls', () => {
    const s = create('normal');
    play(s, createRng(1).next, false);
    expect(s.over).toBe(true);
    expect(s.wall).toBe(0);
  });

  it('a good shot who upgrades holds every difficulty', () => {
    for (const d of ['easy', 'normal', 'hard'] as const) {
      const s = create(d);
      play(s, createRng(2).next, true);
      expect(s.over).toBe(true);
      expect(s.wall).toBeGreaterThan(0);
    }
  });

  it('holding fire respects the reload time', () => {
    const s = create('normal');
    startWave(s);
    for (let i = 0; i < 60; i++) spec.update(s, 1 / 60, inputWith(['action']), Math.random);
    expect(s.fired).toBe(2);
    expect(waveFoes(10, 10)).toContain('giant');
  });
});
