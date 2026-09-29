import { describe, expect, it } from 'vitest';
import { createRng } from '@/utils/random';
import { emptyInput, inputWith, simulate } from '../_shared/arcade/kit';
import { BOUNCE, GROUND, RADII, breakRock, create, damage, fireInterval, levelPlan, makeRock, spec, stepRock } from './game';
import type { Rock, State } from './game';

const rng = () => 0.5;

function quiet(): State {
  const s = create('normal', rng);
  s.toSpawn = [];
  // Keep one far-away boulder so the level is not immediately cleared.
  s.rocks = [{ x: -500, y: -500, vx: 0, vy: 0, size: 0, hp: 1e9, maxHp: 1e9, flash: 0 }];
  return s;
}

describe('cannon shooter', () => {
  it('bounces each size of boulder to the same height every time', () => {
    for (let size = 0; size < 4; size++) {
      const r: Rock = { x: 180, y: 300, vx: 0, vy: 0, size, hp: 1, maxHp: 1, flash: 0 };
      let top = Infinity;
      for (let t = 0; t < 6; t += 1 / 120) {
        stepRock(r, 1 / 120);
        if (t > 2) top = Math.min(top, r.y);
      }
      expect(GROUND - RADII[size] - top).toBeCloseTo(BOUNCE[size], -1);
    }
  });

  it('bounces boulders off the side walls once they are inside', () => {
    const r: Rock = { x: 100, y: 300, vx: -80, vy: 0, size: 1, hp: 1, maxHp: 1, flash: 0 };
    for (let i = 0; i < 240; i++) stepRock(r, 1 / 60);
    expect(r.vx).toBeGreaterThan(0);
    expect(r.x).toBeGreaterThan(0);
  });

  it('fires automatically and chips away at boulders above the cannon', () => {
    const s = quiet();
    s.rocks.push({ x: s.cannonX, y: 200, vx: 0, vy: 0, size: 3, hp: 50, maxHp: 50, flash: 0 });
    simulate(spec, s, 0.5, emptyInput(), rng);
    const big = s.rocks.find((r) => r.size === 3)!;
    expect(big.hp).toBeLessThan(50);
    expect(s.score).toBe(50 - big.hp);
  });

  it('splits a broken boulder into two smaller ones with half the hit points', () => {
    const s = quiet();
    s.rocks = [{ x: 180, y: 300, vx: 0, vy: 0, size: 2, hp: 0, maxHp: 21, flash: 0 }];
    breakRock(s, 0);
    expect(s.rocks).toHaveLength(2);
    expect(s.rocks.every((r) => r.size === 1 && r.hp === 11)).toBe(true);
    expect(s.rocks[0].vx).toBeLessThan(0);
    expect(s.rocks[1].vx).toBeGreaterThan(0);
    s.rocks = [{ x: 180, y: 300, vx: 0, vy: 0, size: 0, hp: 0, maxHp: 4, flash: 0 }];
    breakRock(s, 0);
    expect(s.rocks).toHaveLength(0);
  });

  it('costs a life when a boulder lands on the cannon, with a moment of safety', () => {
    const s = quiet();
    s.rocks.push({ x: s.cannonX, y: GROUND - 40, vx: 0, vy: 50, size: 1, hp: 1e6, maxHp: 1e6, flash: 0 });
    simulate(spec, s, 0.2, emptyInput(), rng);
    expect(s.lives).toBe(2);
    simulate(spec, s, 0.5, emptyInput(), rng);
    expect(s.lives).toBe(2);
  });

  it('moves the cannon with the keys and stays on screen', () => {
    const s = quiet();
    simulate(spec, s, 2, inputWith(['right']), rng);
    expect(s.cannonX).toBeLessThanOrEqual(360 - 22);
    expect(s.cannonX).toBeGreaterThan(300);
  });

  it('clears a level once every boulder is broken and starts the next', () => {
    const s = quiet();
    s.rocks = [];
    simulate(spec, s, 0.1, emptyInput(), rng);
    expect(s.clearT).toBeGreaterThan(0);
    expect(s.score).toBe(25);
    simulate(spec, s, 2, emptyInput(), rng);
    expect(s.level).toBe(2);
    expect(s.toSpawn.length + s.rocks.length).toBeGreaterThan(0);
  });

  it('scales boulders, fire rate and damage with the level', () => {
    expect(levelPlan(1, rng).length).toBeLessThan(levelPlan(10, rng).length);
    expect(fireInterval(10)).toBeLessThan(fireInterval(1));
    expect(damage(7)).toBeGreaterThan(damage(1));
    const s = create('normal', rng);
    const easy = create('easy', rng);
    expect(makeRock(easy, 3, rng).hp).toBeLessThan(makeRock(s, 3, rng).hp);
  });

  it('can be played through several levels by a careful cannon', () => {
    let levels = 0;
    for (const seed of [1, 2, 3, 4]) {
      const random = createRng(`cannon-${seed}`).next;
      const s = create('normal', random);
      // Seconds until a boulder would land on a cannon parked at x (capped at 1).
      const safeFor = (x: number) => {
        let first = 60;
        for (const rock of s.rocks) {
          const r = { ...rock };
          for (let k = 0; k < first; k++) {
            stepRock(r, 1 / 60);
            if (Math.abs(r.x - x) < RADII[r.size] + 24 && r.y + RADII[r.size] > GROUND - 36) {
              first = k;
              break;
            }
          }
        }
        return first / 60;
      };
      // The bot shuffles towards the highest boulder, but only onto spots
      // that will still be clear when it gets there.
      for (let t = 0; t < 120 * 60 && !s.over && s.level < 4; t++) {
        const input = emptyInput();
        if (t % 3 === 0) {
          const target = [...s.rocks].sort((a, b) => a.y - b.y)[0];
          let best = s.cannonX;
          let bestScore = -Infinity;
          for (let x = Math.max(22, s.cannonX - 48); x <= Math.min(338, s.cannonX + 48); x += 6) {
            const margin = safeFor(x) - Math.abs(x - s.cannonX) / 900;
            const score = Math.min(margin, 0.5) * 2000 - Math.abs(x - (target?.x ?? 180));
            if (score > bestScore) {
              bestScore = score;
              best = x;
            }
          }
          s.lastPointerX = -1;
          input.pointer = { x: best, y: 300, down: true, pressed: false, released: false, active: true };
        } else input.pointer = { x: s.lastPointerX, y: 300, down: false, pressed: false, released: false, active: true };
        s.time += 1 / 60;
        spec.update(s, 1 / 60, input, random);
      }
      levels += s.level;
    }
    expect(levels / 4).toBeGreaterThanOrEqual(3);
  });
});
