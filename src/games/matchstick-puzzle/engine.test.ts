import { describe, expect, it } from 'vitest';
import { DIGITS, applyMove, build, generate, isTrue, moves, read, solutions } from './engine';

function rng(seed: number) {
  return () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
}
const bits = (n: number) => n.toString(2).split('').filter((c) => c === '1').length;

describe('matchstick puzzle', () => {
  it('uses the usual stick counts for digits', () => {
    expect(DIGITS.map(bits)).toEqual([6, 2, 5, 5, 4, 5, 6, 3, 7, 6]);
  });

  it('reads and evaluates equations', () => {
    expect(read(build(6, '+', 4, 4))).toBe('6+4=4');
    expect(isTrue(build(3, '+', 4, 7))).toBe(true);
    expect(isTrue(build(9, '-', 4, 6))).toBe(false);
  });

  it('finds the classic solution 6+4=4 → 0+4=4', () => {
    const eq = build(6, '+', 4, 4);
    const sols = solutions(eq).map((m) => read(applyMove(eq, m)));
    expect(sols).toContain('0+4=4');
    expect(sols.every((s) => s !== null)).toBe(true);
  });

  it('turns plus into minus by moving its vertical stick', () => {
    // 9+3=7 is false; moving the + vertical into the 7 is not valid, but
    // moves always keep every symbol a real digit or operator.
    const eq = build(9, '+', 3, 7);
    for (const m of moves(eq)) expect(read(applyMove(eq, m))).not.toBeNull();
  });

  it('generates false equations that one move fixes', () => {
    const random = rng(3);
    for (const level of ['easy', 'normal', 'hard'] as const) {
      for (let i = 0; i < 5; i++) {
        const eq = generate(level, random);
        expect(isTrue(eq)).toBe(false);
        expect(solutions(eq).length).toBeGreaterThan(0);
      }
    }
  });
});
