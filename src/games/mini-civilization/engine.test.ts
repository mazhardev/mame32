import { describe, expect, it } from 'vitest';
import { createRng } from '@/utils/random';
import {
  MAX_TURNS,
  addUnit,
  aiTurn,
  attack,
  availableTechs,
  canBuild,
  canFound,
  cityAt,
  cityYield,
  endTurn,
  growthNeeded,
  moveUnit,
  newGame,
  processCities,
  reachable,
  settle,
  techCost,
  validGame,
  winChance,
} from './engine';
import type { Game } from './engine';

/** A blank all-grassland game with no starting pieces. */
function blank(): Game {
  const g = newGame(1);
  g.map = g.map.map(() => ({ t: 'grass', bonus: null }));
  g.cities = [];
  g.units = [];
  return g;
}

describe('mini civilization', () => {
  it('starts both sides with a capital, a warrior and settlers on a valid map', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const g = newGame(seed);
      expect(g.cities.filter((c) => c.capital)).toHaveLength(2);
      expect(g.units).toHaveLength(4);
      for (const c of g.cities)
        expect(['water', 'mountain']).not.toContain(g.map[c.y * g.w + c.x].t);
      expect(validGame(JSON.parse(JSON.stringify(g)))).toBe(true);
    }
    expect(validGame({ ...newGame(1), map: [] })).toBe(false);
  });

  it('cities must be at least three tiles apart', () => {
    const g = blank();
    const s = addUnit(g, 0, 'settler', 2, 2);
    expect(settle(g, s)).not.toBeNull();
    expect(canFound(g, 4, 2)).toBe(false);
    expect(canFound(g, 5, 2)).toBe(true);
  });

  it('cities grow from surplus food and build what they are set to', () => {
    const g = blank();
    const c = settle(g, addUnit(g, 0, 'settler', 3, 3))!;
    expect(cityYield(g, c).surplus).toBeGreaterThan(0);
    c.food = growthNeeded(c);
    c.prod = 10;
    processCities(g, 0);
    expect(c.pop).toBe(2);
    expect(g.units.some((u) => u.kind === 'warrior' && u.x === 3 && u.y === 3)).toBe(true);
  });

  it('research follows the tech tree', () => {
    const g = blank();
    const civ = g.civs[0];
    expect(availableTechs(civ)).not.toContain('astronomy');
    expect(availableTechs(civ)).not.toContain('mathematics');
    civ.research = 'masonry';
    civ.science = techCost(civ);
    settle(g, addUnit(g, 0, 'settler', 3, 3));
    processCities(g, 0);
    expect(civ.techs).toContain('masonry');
    expect(availableTechs(civ)).toContain('mathematics');
    const c = g.cities[0];
    expect(canBuild(g, c, { type: 'building', id: 'walls' })).toBe(true);
    expect(canBuild(g, c, { type: 'unit', id: 'rider' })).toBe(false);
  });

  it('units cannot cross water or enter enemy-held tiles', () => {
    const g = blank();
    g.map[3 * g.w + 4] = { t: 'water', bonus: null };
    const u = addUnit(g, 0, 'warrior', 3, 3);
    addUnit(g, 1, 'warrior', 3, 4);
    const r = reachable(g, u);
    expect(r.has(3 * g.w + 4)).toBe(false);
    expect(r.has(4 * g.w + 3)).toBe(false);
    expect(r.has(2 * g.w + 3)).toBe(true);
    expect(moveUnit(g, u, 3, 2)).toBe(true);
    expect(moveUnit(g, u, 3, 1)).toBe(false);
  });

  it('walls and fortification make defenders harder to beat', () => {
    const g = blank();
    const c = settle(g, addUnit(g, 1, 'settler', 5, 5))!;
    const d = addUnit(g, 1, 'spearman', 5, 5);
    const a = addUnit(g, 0, 'rider', 4, 5);
    const open = winChance(g, a, 5, 5);
    c.buildings.push('walls');
    d.fortified = true;
    expect(winChance(g, a, 5, 5)).toBeLessThan(open);
  });

  it('capturing the rival capital wins by conquest', () => {
    const g = blank();
    settle(g, addUnit(g, 1, 'settler', 5, 5))!.capital = true;
    const a = addUnit(g, 0, 'warrior', 4, 5);
    const res = attack(g, a, 5, 5, () => 0);
    expect(res?.captured?.owner).toBe(0);
    expect(cityAt(g, 5, 5)?.owner).toBe(0);
    expect(g.winner).toBe(0);
    expect(g.how).toBe('conquest');
  });

  it('completing the Grand Observatory wins by science', () => {
    const g = blank();
    const c = settle(g, addUnit(g, 0, 'settler', 3, 3))!;
    g.civs[0].techs = [
      'pottery',
      'bronze',
      'writing',
      'horses',
      'masonry',
      'mathematics',
      'philosophy',
      'astronomy',
    ];
    c.build = { type: 'building', id: 'observatory' };
    c.prod = 200;
    endTurn(g, 0, 'normal');
    expect(g.winner).toBe(0);
    expect(g.how).toBe('science');
  });

  it('computer-played games always finish, and difficulty favours the rival more on hard', () => {
    const wins: Record<string, number> = {};
    for (const d of ['easy', 'hard'] as const) {
      wins[d] = 0;
      for (let seed = 1; seed <= 6; seed++) {
        const rng = createRng(seed);
        const g = newGame(seed);
        while (g.winner === null) {
          aiTurn(g, 0, d, rng.next, 0.3);
          if (g.winner === null) aiTurn(g, 1, d, rng.next, 0.5);
        }
        expect(g.turn).toBeLessThanOrEqual(MAX_TURNS + 1);
        if (g.winner === 0) wins[d]++;
      }
    }
    expect(wins.easy).toBeGreaterThanOrEqual(5);
    expect(wins.hard).toBeLessThan(wins.easy);
  });
});
