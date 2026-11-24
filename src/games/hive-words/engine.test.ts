import { describe, expect, it } from 'vitest';
import { createRng } from '@/utils/random';
import { RANKS, check, hiveForSeed, makeHive, points, rankIndex, scoreOf } from './engine';

describe('hive words', () => {
  it('builds a hive of seven different letters with a centre, answers and a full-hive word', () => {
    const hive = makeHive(createRng('hive-test').next);
    expect(new Set(hive.letters).size).toBe(7);
    expect(hive.letters.at(-1)).toBe(hive.center);
    expect(hive.letters).not.toContain('s');
    expect(hive.answers.length).toBeGreaterThanOrEqual(20);
    expect(hive.answers.length).toBeLessThanOrEqual(55);
    expect(hive.pangrams.length).toBeGreaterThanOrEqual(1);
    for (const w of hive.answers) {
      expect(w.length).toBeGreaterThanOrEqual(4);
      expect(w).toContain(hive.center);
      expect([...w].every((ch) => hive.letters.includes(ch))).toBe(true);
    }
  });

  it('gives everyone the same hive for the same day', () => {
    expect(hiveForSeed('2026-11-24').letters).toEqual(hiveForSeed('2026-11-24').letters);
    expect(hiveForSeed('2026-11-24').letters).not.toEqual(hiveForSeed('2026-11-25').letters);
  });

  it('scores 1 for four letters, one per letter beyond, and 7 extra for a full hive', () => {
    expect(points('abcd', false)).toBe(1);
    expect(points('abcde', false)).toBe(5);
    expect(points('abcdefg', true)).toBe(14);
  });

  it('accepts answers and rejects short, off-hive, centre-less, unknown and repeated words', () => {
    const hive = makeHive(createRng('hive-check').next);
    const word = hive.answers.find((w) => w.length > 4) as string;
    const ok = check(hive, word, []);
    expect(ok.ok).toBe(true);
    expect(check(hive, word, [word])).toEqual({ ok: false, reason: 'found' });
    expect(check(hive, hive.letters.slice(0, 3).join(''), [])).toEqual({ ok: false, reason: 'short' });
    const outsider = 'abcdefghijklmnopqrstuvwxyz'.split('').find((c) => !hive.letters.includes(c)) as string;
    expect(check(hive, outsider.repeat(4), [])).toEqual({ ok: false, reason: 'letters' });
    const noCentre = hive.letters.slice(0, 4).join('');
    expect(check(hive, noCentre, [])).toEqual({ ok: false, reason: 'center' });
    const nonsense = (hive.center + hive.letters[0]).repeat(3).slice(0, 6);
    if (!hive.answers.includes(nonsense)) expect(check(hive, nonsense, []).ok).toBe(false);
    const full = check(hive, hive.pangrams[0], []);
    expect(full.ok && full.pangram).toBe(true);
  });

  it('climbs ranks with points and reaches Hive Master only with every answer', () => {
    const hive = makeHive(createRng('hive-rank').next);
    expect(rankIndex(0, hive.max)).toBe(0);
    expect(scoreOf(hive, hive.answers)).toBe(hive.max);
    expect(rankIndex(hive.max, hive.max)).toBe(RANKS.length - 1);
    expect(rankIndex(hive.max - 1, hive.max)).toBeLessThan(RANKS.length - 1);
  });
});
