import { describe, expect, it } from 'vitest';
import { accuracy, appended, compareTyped, wpm } from './typing';

describe('typing maths', () => {
  it('computes words per minute from five-character words', () => {
    expect(wpm(250, 60)).toBe(50);
    expect(wpm(100, 30)).toBe(40);
    expect(wpm(10, 0)).toBe(0);
  });

  it('computes accuracy', () => {
    expect(accuracy(9, 10)).toBe(90);
    expect(accuracy(0, 0)).toBe(100);
  });

  it('compares typed text character by character', () => {
    expect(compareTyped('cat', 'cut')).toEqual(['ok', 'bad', 'ok']);
    expect(compareTyped('cat', 'c')).toEqual(['ok', 'todo', 'todo']);
  });

  it('finds characters appended to an input', () => {
    expect(appended('ab', 'abc')).toBe('c');
    expect(appended('ab', 'a')).toBe('');
    expect(appended('', 'hi')).toBe('hi');
  });
});
