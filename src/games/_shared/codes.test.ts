import { describe, expect, it } from 'vitest';
import { createRng } from '@/utils/random';
import { randomCode, scoreCode } from './codes';
import { LESSONS, lessonText } from '../typing-tutor/lessons';

describe('scoreCode', () => {
  it('counts exact and misplaced symbols', () => {
    expect(scoreCode([1, 2, 3, 4], [1, 2, 3, 4])).toEqual({ exact: 4, partial: 0 });
    expect(scoreCode([4, 3, 2, 1], [1, 2, 3, 4])).toEqual({ exact: 0, partial: 4 });
    expect(scoreCode([1, 5, 6, 2], [1, 2, 3, 4])).toEqual({ exact: 1, partial: 1 });
  });

  it('does not over-count repeated symbols', () => {
    expect(scoreCode(['r', 'r', 'r', 'r'], ['r', 'g', 'b', 'y'])).toEqual({ exact: 1, partial: 0 });
    expect(scoreCode(['g', 'r', 'r', 'b'], ['r', 'g', 'b', 'r'])).toEqual({ exact: 0, partial: 4 });
    expect(scoreCode(['r', 'r', 'g', 'g'], ['r', 'g', 'y', 'y'])).toEqual({ exact: 1, partial: 1 });
  });

  it('random codes respect uniqueness', () => {
    const rng = createRng(1);
    for (let i = 0; i < 50; i++) {
      const c = randomCode(rng, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], 4, true);
      expect(new Set(c).size).toBe(4);
    }
  });
});

describe('typing tutor lessons', () => {
  it('every lesson produces text using only its keys', () => {
    for (const lesson of LESSONS) {
      const text = lessonText(lesson, createRng(3), 120);
      expect(text.length).toBeGreaterThanOrEqual(100);
      expect(text).not.toContain('undefined');
      if (lesson.kind !== 'text') {
        const allowed = new Set([...lesson.keys, ' ']);
        expect([...text].every((c) => allowed.has(c))).toBe(true);
      }
    }
  });
});
