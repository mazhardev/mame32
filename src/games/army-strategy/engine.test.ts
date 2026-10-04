import { describe, expect, it } from 'vitest';
import { createRng } from '@/utils/random';
import {
  MISSIONS,
  UNITS,
  aiPlan,
  aiTurn,
  attack,
  canAttack,
  damage,
  endTurn,
  move,
  newBattle,
  reachable,
  validBattle,
} from './engine';
import type { Battle, Unit, UnitKind } from './engine';

/** An open 9×7 field with whatever units a test places. */
function field(units: [UnitKind, 0 | 1, number, number][]): Battle {
  const b = newBattle(0, 'normal');
  b.map = b.map.map(() => 'grass');
  b.map[0] = 'banner0';
  b.map[b.map.length - 1] = 'banner1';
  b.units = units.map(([kind, side, x, y], i) => ({
    id: i + 1,
    side,
    kind,
    x,
    y,
    hp: UNITS[kind].hp,
    moved: false,
    acted: false,
  }));
  return b;
}
const u = (b: Battle, id: number) => b.units.find((x) => x.id === id) as Unit;

describe('army strategy', () => {
  it('missions are well-formed rectangles with both banners', () => {
    for (const m of MISSIONS) {
      expect(new Set(m.rows.map((r) => r.length)).size).toBe(1);
      expect(m.units.every((r) => r.length === m.rows[0].length)).toBe(true);
      expect(m.rows.join('')).toContain('B');
      expect(m.rows.join('')).toContain('b');
    }
    for (const d of ['easy', 'normal', 'hard'] as const)
      for (let i = 0; i < MISSIONS.length; i++)
        expect(validBattle(JSON.parse(JSON.stringify(newBattle(i, d))))).toBe(true);
    expect(newBattle(0, 'hard').units.filter((x) => x.side === 1).length).toBeGreaterThan(
      newBattle(0, 'easy').units.filter((x) => x.side === 1).length,
    );
  });

  it('movement respects range, terrain cost and enemy blocking', () => {
    const b = field([
      ['spear', 0, 4, 3],
      ['spear', 1, 5, 3],
    ]);
    const r = reachable(b, u(b, 1));
    expect(r.has(3 * b.w + 7)).toBe(false);
    expect(r.has(3 * b.w + 5)).toBe(false);
    expect(r.has(0 * b.w + 4)).toBe(true);
    b.map[2 * b.w + 4] = 'forest';
    b.map[1 * b.w + 4] = 'water';
    expect(reachable(b, u(b, 1)).has(1 * b.w + 4)).toBe(false);
    expect(move(b, u(b, 1), 4, 0)).toBe(false);
    expect(move(b, u(b, 1), 3, 1)).toBe(true);
    expect(move(b, u(b, 1), 3, 2)).toBe(false);
  });

  it('archers shoot at range 2–3 and take no counter-attack', () => {
    const b = field([
      ['archer', 0, 1, 1],
      ['spear', 1, 3, 1],
      ['spear', 1, 2, 1],
    ]);
    expect(canAttack(b, u(b, 1), u(b, 3))).toBe(false);
    const res = attack(b, u(b, 1), u(b, 2))!;
    expect(res.taken).toBe(0);
    expect(u(b, 2).hp).toBe(UNITS.spear.hp - res.dealt);
  });

  it('melee attacks draw a counter-attack and unit counters matter', () => {
    const b = field([
      ['horse', 0, 1, 1],
      ['spear', 1, 2, 1],
      ['archer', 1, 1, 2],
    ]);
    expect(damage(b, u(b, 2), u(b, 1))).toBeGreaterThan(damage(b, u(b, 1), u(b, 2)));
    expect(damage(b, u(b, 1), u(b, 3))).toBeGreaterThan(UNITS.horse.atk);
    const res = attack(b, u(b, 1), u(b, 2))!;
    expect(res.taken).toBeGreaterThan(0);
    b.map[1 * b.w + 2] = 'forest';
  });

  it('cover reduces damage and catapults cannot fire after moving', () => {
    const b = field([
      ['catapult', 0, 0, 3],
      ['spear', 1, 4, 3],
    ]);
    const open = damage(b, u(b, 1), u(b, 2));
    b.map[3 * b.w + 4] = 'forest';
    expect(damage(b, u(b, 1), u(b, 2))).toBeLessThan(open);
    expect(move(b, u(b, 1), 1, 3)).toBe(true);
    expect(canAttack(b, u(b, 1), u(b, 2))).toBe(false);
  });

  it('wins by defeating every enemy or by holding their banner for a turn', () => {
    const b = field([
      ['horse', 0, 7, 6],
      ['archer', 1, 0, 6],
    ]);
    expect(move(b, u(b, 1), 8, 6)).toBe(true);
    expect(b.winner).toBeNull();
    endTurn(b);
    endTurn(b);
    expect(b.winner).toBe(0);
    const k = field([
      ['horse', 0, 1, 1],
      ['archer', 1, 2, 1],
    ]);
    u(k, 2).hp = 1;
    attack(k, u(k, 1), u(k, 2));
    expect(k.winner).toBe(0);
  });

  it('the AI only makes legal moves and every battle ends', () => {
    for (const d of ['easy', 'normal', 'hard'] as const)
      for (let m = 0; m < MISSIONS.length; m++) {
        const rng = createRng(m * 10 + 1);
        const b = newBattle(m, d);
        let guard = 0;
        while (b.winner === null && guard++ < 200) {
          for (const unit of b.units.filter((x) => x.side === b.turn)) {
            const plan = aiPlan(b, unit, d, rng.next);
            expect(reachable(b, unit).has(plan.to[1] * b.w + plan.to[0])).toBe(true);
          }
          aiTurn(b, b.turn === 0 ? 'hard' : d, rng.next);
        }
        expect(b.winner).not.toBeNull();
      }
  });

  it('every mission can be won on every difficulty by careful play', () => {
    for (const d of ['easy', 'normal', 'hard'] as const)
      for (let m = 0; m < MISSIONS.length; m++) {
        let wins = 0;
        for (let seed = 1; seed <= 10; seed++) {
          const rng = createRng(seed);
          const b = newBattle(m, d);
          while (b.winner === null) aiTurn(b, b.turn === 0 ? 'hard' : d, rng.next);
          if (b.winner === 0) wins++;
        }
        expect(wins, `${d} mission ${m}`).toBeGreaterThan(0);
      }
  });
});
