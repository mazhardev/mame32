import { describe, expect, it } from 'vitest';
import { createRng } from '@/utils/random';
import { HERO, newHero, stepHero, stepWalker } from './actors';
import type { Mob } from './actors';
import { COLS, H, ROWS, T, allStandable, buildStage, reachableCells, stageQuery, standable } from './stage';

const LADDER = buildStage(['', '', '', '', '...====..', '', '', '.====....', '', '', '...====..', '', '']);

describe('arena stages', () => {
  it('builds walls, a floor, mirrored rows and spawns', () => {
    const s = buildStage(['', '', '', '..g......', '...======', '', '', '', '', '', '', '', '']);
    expect(s.tiles).toHaveLength(COLS * ROWS);
    expect(s.tiles[14 * COLS + 5]).toBe('#');
    expect(s.tiles[3 * COLS + 0]).toBe('#');
    expect(s.spawns.map((sp) => sp.col).sort((a, b) => a - b)).toEqual([3, 16]);
    expect(standable(s, 5, 4)).toBe(true);
  });

  it('wrapping stages have gaps in the floor and the ceiling', () => {
    const s = buildStage(Array(13).fill(''), { wrap: true });
    const q = stageQuery(s);
    expect(q.at(10, 14)).toBe(0);
    expect(q.at(10, 0)).toBe(0);
    expect(q.at(2, 14)).toBe(1);
    // Below the floor wraps to the top row.
    expect(q.at(2, 15)).toBe(q.at(2, 0));
  });

  it('rejects malformed rows', () => {
    expect(() => buildStage(['....'])).toThrow();
    expect(() => buildStage([...Array(12).fill(''), '1234567'])).toThrow();
  });

  it('finds every ledge of a ladder of ledges reachable', () => {
    const reach = reachableCells(LADDER, [9, 13]);
    for (const [c, r] of allStandable(LADDER)) expect(reach.has(`${c},${r}`), `${c},${r}`).toBe(true);
  });

  it('flags ledges that are too high to reach', () => {
    const tall = buildStage(['', '', '', '', '...====..', '', '', '', '', '', '', '', '']);
    const reach = reachableCells(tall, [9, 13]);
    expect(reach.has('5,4')).toBe(false);
  });
});

describe('arena actors', () => {
  it('the hero jumps exactly onto the ledge three rows up', () => {
    const q = stageQuery(LADDER);
    const h = newHero(5, 13);
    const step = 1 / 60;
    let landed = false;
    stepHero(h, { left: false, right: false, jump: true, jumpPressed: true, downPressed: false }, step, q, false);
    for (let i = 0; i < 120 && !landed; i++) {
      stepHero(h, { left: false, right: false, jump: true, jumpPressed: false, downPressed: false }, step, q, false);
      landed = h.onGround && h.vy === 0;
    }
    expect(h.y + h.h).toBe(11 * T);
  });

  it('jump height clears three rows with room to spare', () => {
    const apex = (HERO.jump * HERO.jump) / (2 * HERO.gravity);
    expect(apex).toBeGreaterThan(3 * T + 8);
    expect(apex).toBeLessThan(4 * T);
  });

  it('walkers climb towards a hero standing above them', () => {
    const q = stageQuery(LADDER);
    const m: Mob = { ...newHero(5, 13), dir: 1, think: 0, jumpCD: 0 };
    const rng = createRng('climb').next;
    let best = m.y;
    for (let i = 0; i < 60 * 12; i++) {
      stepWalker(m, { x: 6 * T, y: 4 * T }, 1 / 60, q, { speed: 40, jump: HERO.jump, wrap: false, random: rng, chase: 1 });
      best = Math.min(best, m.y);
    }
    expect(best).toBeLessThan(11 * T);
    expect(m.y).toBeLessThan(H);
  });
});
