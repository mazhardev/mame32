import { describe, expect, it } from 'vitest';
import { createRng } from '@/utils/random';
import { evaluate, keyMarks, makeEquation, marks, problem, show, validGuesses } from './engine';

describe('equation guess', () => {
  it('evaluates × and ÷ before + and −, and only exact division', () => {
    expect(evaluate('2+3*4')).toBe(14);
    expect(evaluate('20-12/4')).toBe(17);
    expect(evaluate('7/2')).toBeNull();
    expect(evaluate('5/0')).toBeNull();
    expect(evaluate('08+1')).toBeNull();
    expect(evaluate('+5')).toBeNull();
  });

  it('accepts only true equations of the right length', () => {
    expect(problem('12+35=47', 8)).toBeNull();
    expect(problem('12+35=48', 8)).toBe('false');
    expect(problem('12+35=47', 7)).toBe('length');
    expect(problem('1+2+3=6=', 8)).toBe('equals');
    expect(problem('12+35*=4', 8)).toBe('syntax');
    expect(problem('47=47+00', 8)).toBe('syntax');
    expect(problem('3*9=027', 7)).toBe('syntax');
  });

  it('generates true equations of each length', () => {
    for (const n of [6, 7, 8]) {
      const r = createRng(`gen-${n}`).next;
      for (let i = 0; i < 50; i++) {
        const eq = makeEquation(n, r);
        expect(eq).toHaveLength(n);
        expect(problem(eq, n)).toBeNull();
      }
    }
  });

  it('marks green, amber and grey, counting repeated symbols once each', () => {
    expect(marks('12+35=47', '12+35=47').every((m) => m === 'correct')).toBe(true);
    expect(marks('21+53=74', '12+35=47')).toEqual(['present', 'present', 'correct', 'present', 'present', 'correct', 'present', 'present']);
    // Two 1s guessed, only one in the answer and already green: the other is grey.
    expect(marks('11+2=13', '10+3=13').slice(0, 2)).toEqual(['correct', 'absent']);
  });

  it('remembers the best mark per key', () => {
    const km = keyMarks(['21+53=74', '12+35=47'], '12+35=47');
    expect(km.get('1')).toBe('correct');
    expect(km.get('+')).toBe('correct');
  });

  it('shows × ÷ − for the operators and validates saved guesses', () => {
    expect(['*', '/', '-'].map(show)).toEqual(['×', '÷', '−']);
    expect(validGuesses(['3*9=27'], 6)).toBe(true);
    expect(validGuesses(['3*9=28'], 6)).toBe(false);
  });
});
