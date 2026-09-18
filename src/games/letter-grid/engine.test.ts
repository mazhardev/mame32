import { describe, expect, it } from 'vitest';
import { createRng } from '@/utils/random';
import { findPath, isPath, makeGrid, neighbours, solveGrid, wordPoints } from './engine';
import { isValidStep, nextOptions, pickStart, chainDepth } from '../word-builder/engine';
import {
  bestPlay,
  checkPlay,
  newBag,
  refill,
  removeTiles,
  wordValue,
} from '../tile-word-builder/engine';
import { makeLevel, tryWord } from '../letter-connect/engine';

describe('letter grid', () => {
  const grid = 'catsdogeranimalp'.split('');
  it('computes neighbours on the edges and in the middle', () => {
    expect(neighbours(0, 4).sort()).toEqual([1, 4, 5]);
    expect(neighbours(5, 4)).toHaveLength(8);
  });

  it('finds paths only through adjacent, unused tiles', () => {
    const p = findPath(grid, 4, 'cat');
    expect(p).toEqual([0, 1, 2]);
    expect(isPath([0, 1, 2], 4)).toBe(true);
    expect(isPath([0, 2], 4)).toBe(false);
    expect(isPath([0, 1, 0], 4)).toBe(false);
  });

  it('solver finds words that really are in the grid', () => {
    const words = solveGrid(grid, 4, 3);
    expect(words).toContain('cat');
    for (const w of words) expect(findPath(grid, 4, w)).not.toBeNull();
  });

  it('random grids are playable', () => {
    const rng = createRng(1);
    for (let i = 0; i < 10; i++) {
      const g = makeGrid(rng, 4);
      expect(g).toHaveLength(16);
      expect(solveGrid(g, 4, 3).length).toBeGreaterThan(5);
    }
    expect(wordPoints('abcdefgh')).toBeGreaterThan(wordPoints('abc'));
  });
});

describe('word builder', () => {
  it('a step adds one letter and may rearrange', () => {
    expect(isValidStep('art', 'rate')).toBe(true);
    expect(isValidStep('art', 'arts')).toBe(true);
    expect(isValidStep('art', 'rates')).toBe(false);
    expect(isValidStep('art', 'rain')).toBe(false);
  });

  it('starting words always allow a long chain', () => {
    const start = pickStart(createRng(3), 4);
    expect(start).toHaveLength(3);
    expect(chainDepth(start)).toBeGreaterThanOrEqual(4);
    for (const n of nextOptions(start)) expect(isValidStep(start, n)).toBe(true);
  });
});

describe('tile word builder', () => {
  it('values rare letters more and rewards long words', () => {
    expect(wordValue('quiz')).toBeGreaterThan(wordValue('tone'));
    expect(wordValue('stone')).toBe(Math.round(5 * 1.5));
  });

  it('only accepts words spelled from the rack', () => {
    const rack = 'stoneab'.split('');
    expect(checkPlay('stone', rack).ok).toBe(true);
    expect(checkPlay('stones', rack)).toEqual({ ok: false, reason: 'You don’t have those tiles' });
    expect(removeTiles(rack, 'stone')).toEqual(['a', 'b']);
    expect(bestPlay(rack)!.points).toBeGreaterThanOrEqual(wordValue('stone'));
  });

  it('refills from the bag up to seven tiles', () => {
    const bag = newBag(createRng(2));
    expect(bag.length).toBe(100);
    const [rack, rest] = refill([], bag);
    expect(rack).toHaveLength(7);
    expect(rest).toHaveLength(93);
  });
});

describe('letter connect', () => {
  it('levels contain the base word and only spellable targets', () => {
    const level = makeLevel(createRng(5), 6, 10);
    expect(level.letters).toHaveLength(6);
    expect(level.targets.length).toBeGreaterThanOrEqual(5);
    expect(level.targets.some((t) => t.length === 6)).toBe(true);
    for (const t of level.targets) expect(tryWord(t, level, [], []).kind).toBe('target');
    expect(tryWord('zzz', level, [], []).kind).toBe('invalid');
  });
});
