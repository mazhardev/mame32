import { describe, expect, it } from 'vitest';
import { createRng } from '@/utils/random';
import { CONFIGS, FallingWords, GROUND } from './engine';

const words = ['cat', 'dog', 'sun', 'tree', 'house', 'garden', 'kitchen', 'elephant'];
const pick = (n: number) => words.find((w) => w.length === n) ?? 'cat';

describe('FallingWords', () => {
  it('spawns words that fall over time', () => {
    const g = new FallingWords(CONFIGS.normal, pick, createRng(1));
    g.update(0.5);
    expect(g.words.length).toBe(1);
    const y = g.words[0].y;
    g.update(0.5);
    expect(g.words[0].y).toBeGreaterThan(y);
  });

  it('typing a word clears it and scores', () => {
    const g = new FallingWords(CONFIGS.normal, pick, createRng(1));
    g.update(0.5);
    const text = g.words[0].text;
    expect(g.target(text.slice(0, 1))?.text).toBe(text);
    expect(g.type(text)).toBeGreaterThan(0);
    expect(g.words).toHaveLength(0);
    expect(g.cleared).toBe(1);
    expect(g.type('nothing')).toBe(0);
  });

  it('words reaching the ground cost lives and end the game', () => {
    const g = new FallingWords({ ...CONFIGS.hard, lives: 1 }, pick, createRng(2));
    g.update(0.5);
    g.words[0].y = GROUND - 1;
    const missed = g.update(0.1);
    expect(missed).toBe(1);
    expect(g.lives).toBe(0);
    expect(g.over).toBe(true);
  });
});
