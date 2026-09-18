import { describe, expect, it } from 'vitest';
import { createRng } from '@/utils/random';
import { answerFor, cipherLetters, encode, isSolved, makeKey } from './engine';

describe('cryptogram', () => {
  const key = makeKey(createRng(1));

  it('never maps a letter to itself and is one-to-one', () => {
    const values = Object.values(key);
    expect(new Set(values).size).toBe(26);
    for (const [p, c] of Object.entries(key)) expect(p).not.toBe(c);
  });

  it('keeps punctuation and spaces', () => {
    const c = encode('Hi, you!', key);
    expect(c[2]).toBe(',');
    expect(c[3]).toBe(' ');
    expect(c.endsWith('!')).toBe(true);
  });

  it('is solved only when every cipher letter is decoded correctly', () => {
    const plain = 'Well done';
    const cipher = encode(plain, key);
    const guesses: Record<string, string> = {};
    for (const c of cipherLetters(cipher)) guesses[c] = answerFor(c, key);
    expect(isSolved(cipher, plain, guesses)).toBe(true);
    const first = cipherLetters(cipher)[0];
    expect(isSolved(cipher, plain, { ...guesses, [first]: 'Z' })).toBe(false);
  });
});
