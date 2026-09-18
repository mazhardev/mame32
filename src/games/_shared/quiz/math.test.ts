import { describe, expect, it } from 'vitest';
import { createRng } from '@/utils/random';
import { arithmetic, mathPuzzle, mentalMath, multiplication, repeat, sequence } from './math';
import { QuizEngine, drawFromBank, toQuestion } from './engine';
import type { QuizQuestion } from './engine';

/** Evaluates "a op b [op c]" prompts the generators produce. */
function evaluate(expr: string): number {
  const js = expr
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .replace(/−/g, '-')
    .replace(/(\d+)²/g, '($1*$1)')
    .replace(/(\d+)% of (\d+)/g, '($1/100*$2)');
  if (!/^[\d\s+\-*/().]+$/.test(js)) throw new Error(`unexpected expression ${expr}`);
  // Tiny recursive-descent evaluator (no eval) for + - * / and parentheses.
  let i = 0;
  const s = js.replace(/\s+/g, '');
  const num = (): number => {
    if (s[i] === '(') {
      i++;
      const v = add();
      i++;
      return v;
    }
    const m = /^\d+(\.\d+)?/.exec(s.slice(i))!;
    i += m[0].length;
    return Number(m[0]);
  };
  const mul = (): number => {
    let v = num();
    while (s[i] === '*' || s[i] === '/') v = s[i++] === '*' ? v * num() : v / num();
    return v;
  };
  const add = (): number => {
    let v = mul();
    while (s[i] === '+' || s[i] === '-') v = s[i++] === '+' ? v + mul() : v - mul();
    return v;
  };
  return add();
}

function checkShape(q: QuizQuestion) {
  expect(q.choices).toHaveLength(4);
  expect(new Set(q.choices).size).toBe(4);
  expect(q.answer).toBeGreaterThanOrEqual(0);
  expect(q.answer).toBeLessThan(4);
}

describe('math generators', () => {
  const levels = ['easy', 'normal', 'hard'] as const;

  it.each(levels)('arithmetic and mental math answers are correct (%s)', (level) => {
    const rng = createRng(level);
    for (let n = 0; n < 300; n++) {
      for (const q of [
        arithmetic(rng, level),
        mentalMath(rng, level),
        multiplication(rng, level),
      ]) {
        checkShape(q);
        const expr = q.prompt.replace(/ = \?$/, '');
        expect(Number(q.choices[q.answer])).toBeCloseTo(evaluate(expr));
      }
    }
  });

  it('division questions always divide exactly', () => {
    const rng = createRng(5);
    for (let n = 0; n < 500; n++) {
      const q = arithmetic(rng, 'hard');
      if (q.prompt.includes('÷')) expect(Number.isInteger(Number(q.choices[q.answer]))).toBe(true);
    }
  });

  it('sequences have a unique, correct next term', () => {
    const rng = createRng(9);
    for (let n = 0; n < 300; n++) {
      const q = sequence(rng, 'hard');
      checkShape(q);
      expect(q.explain).toBeTruthy();
    }
    const rng2 = createRng(1);
    // Arithmetic sequences on easy: next term continues the constant step.
    for (let n = 0; n < 100; n++) {
      const q = sequence(rng2, 'easy');
      const terms = q.prompt.replace(', ?', '').split(', ').map(Number);
      const step = terms[1] - terms[0];
      expect(Number(q.choices[q.answer])).toBe(terms[terms.length - 1] + step);
    }
  });

  it('missing-number and missing-operator puzzles have exactly one right answer', () => {
    const rng = createRng(3);
    for (let n = 0; n < 300; n++) {
      const q = mathPuzzle(rng, 'hard');
      checkShape(q);
      if (q.prompt.includes('Which sign')) {
        const [, a, b, t] = /^(\d+) \? (\d+) = (-?\d+)/.exec(q.prompt)!;
        const fits = q.choices.filter((op) => evaluate(`${a} ${op} ${b}`) === Number(t));
        expect(fits).toEqual([q.choices[q.answer]]);
      } else {
        const x = Number(q.choices[q.answer]);
        const filled = q.prompt.replace('?', String(x));
        const [lhs, rhs] = filled.split(' = ');
        expect(evaluate(lhs)).toBe(Number(rhs));
      }
    }
  });

  it('repeat() never repeats a question', () => {
    const qs = repeat(40, () => arithmetic(createRng(Math.random()), 'normal'));
    expect(new Set(qs.map((q) => q.prompt + q.choices.join())).size).toBe(qs.length);
  });
});

describe('QuizEngine', () => {
  const qs: QuizQuestion[] = [
    { prompt: 'a', choices: ['1', '2'], answer: 0 },
    { prompt: 'b', choices: ['1', '2'], answer: 1 },
    { prompt: 'c', choices: ['1', '2'], answer: 1 },
    { prompt: 'd', choices: ['1', '2'], answer: 0 },
  ];

  it('scores correct answers with time and streak bonuses', () => {
    const e = new QuizEngine(qs);
    expect(e.answer(0, 1).points).toBe(150);
    e.next();
    expect(e.answer(1, 0).points).toBe(100);
    e.next();
    expect(e.answer(1, 0.5).points).toBe(100 + 25 + 20);
    e.next();
    expect(e.answer(1).correct).toBe(false);
    expect(e.streak).toBe(0);
    expect(e.bestStreak).toBe(3);
    e.next();
    expect(e.finished).toBe(true);
    expect(e.accuracy).toBe(0.75);
  });

  it('ignores a second answer to the same question', () => {
    const e = new QuizEngine(qs);
    e.answer(0);
    expect(e.answer(0).points).toBe(0);
    expect(e.correct).toBe(1);
  });

  it('a timeout counts as wrong', () => {
    const e = new QuizEngine(qs);
    const r = e.answer(null, 0);
    expect(r).toEqual({ correct: false, points: 0, timedOut: true });
  });

  it('bank drawing respects difficulty and shuffles choices', () => {
    const bank = Array.from({ length: 30 }, (_, i) => ({
      prompt: `q${i}`,
      correct: `c${i}`,
      wrong: [`w${i}a`, `w${i}b`, `w${i}c`],
      level: ((i % 3) + 1) as 1 | 2 | 3,
    }));
    const rng = createRng(2);
    const easy = drawFromBank(bank, rng, 'easy', 10);
    expect(easy).toHaveLength(10);
    for (const q of easy) {
      const i = Number(q.prompt.slice(1));
      expect(i % 3).toBe(0);
      expect(q.choices[q.answer]).toBe(`c${i}`);
    }
    const one = toQuestion(bank[0], rng);
    expect(one.choices).toContain('c0');
  });
});
