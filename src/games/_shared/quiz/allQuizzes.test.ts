import { describe, expect, it } from 'vitest';
import { createRng } from '@/utils/random';
import type { Rng } from '@/utils/random';
import type { DifficultySetting } from '@/types';
import type { QuizQuestion } from './engine';

type Maker = (rng: Rng, d: DifficultySetting) => QuizQuestion[];

const modules = import.meta.glob<{ makeQuestions?: Maker }>('../../*/questions.{ts,tsx}', {
  eager: true,
});

const quizzes = Object.entries(modules)
  .filter(([, m]) => typeof m.makeQuestions === 'function')
  .map(([path, m]) => [path.split('/')[2], m.makeQuestions as Maker] as const);

describe('quiz question banks', () => {
  it('finds the quiz games', () => {
    expect(quizzes.length).toBeGreaterThanOrEqual(27);
  });

  it.each(quizzes)('%s always produces well-formed questions', (_id, make) => {
    for (const d of ['easy', 'normal', 'hard'] as const) {
      for (let seed = 1; seed <= 25; seed++) {
        const qs = make(createRng(seed * 7919), d);
        expect(qs.length).toBeGreaterThanOrEqual(10);
        for (const q of qs) {
          expect(q.prompt.trim().length).toBeGreaterThan(0);
          expect(q.choices.length).toBeGreaterThanOrEqual(2);
          expect(new Set(q.choices).size, `duplicate choice in "${q.prompt}"`).toBe(q.choices.length);
          expect(q.answer).toBeGreaterThanOrEqual(0);
          expect(q.answer).toBeLessThan(q.choices.length);
          for (const c of q.choices) expect(c.trim().length).toBeGreaterThan(0);
        }
      }
    }
  });
});
