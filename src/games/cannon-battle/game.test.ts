import { describe, expect, it } from 'vitest';
import { emptyInput, inputWith } from '../_shared/arcade/kit';
import { CASTLE_HP, W, aiChoose, create, explode, launch, makeGround, simulateShot, update } from './game';

function rng(seed: number) {
  return () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
}

describe('cannon battle', () => {
  it('ground is flat under both castles', () => {
    const g = makeGround(rng(4));
    expect(g).toHaveLength(W);
    for (let x = 41; x <= 99; x++) expect(g[x]).toBe(g[70]);
  });

  it('shots fire towards the enemy', () => {
    expect(launch(0, 45, 50)[0]).toBeGreaterThan(0);
    expect(launch(1, 45, 50)[0]).toBeLessThan(0);
  });

  it('the computer finds a shot that lands near your castle', () => {
    const s = create('hard', rng(7));
    s.wind = 0;
    s.aiError = 0;
    const [a, p] = aiChoose(s, () => 0.5);
    expect(Math.abs(simulateShot(s, 1, a, p).x - s.castleX[0])).toBeLessThan(30);
  });

  it('explosions dig craters and damage nearby castles', () => {
    const s = create('normal', rng(2));
    const before = s.ground[300];
    explode(s, 300, before, () => 0.5);
    expect(s.ground[300]).toBeGreaterThan(before);
    const x = s.castleX[1];
    explode(s, x, s.ground[x] - 10, () => 0.5);
    expect(s.hp[1]).toBeLessThan(CASTLE_HP);
  });

  it('a player shot ends the turn and the computer replies', () => {
    const s = create('normal', rng(5));
    update(s, 1 / 60, inputWith([], ['action']), () => 0.5);
    expect(s.phase).toBe('flying');
    for (let i = 0; i < 60 * 12 && s.turn === 0; i++) update(s, 1 / 60, emptyInput(), () => 0.5);
    expect(s.turn).toBe(1);
  });
});
