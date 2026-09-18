import type { Rng } from '@/utils/random';
import type { DifficultySetting } from '@/types';
import { numericChoices } from './engine';
import type { QuizQuestion } from './engine';

type Level = DifficultySetting;

export function numericQuestion(
  prompt: string,
  answer: number,
  rng: Rng,
  spread = 10,
  explain?: string,
  visual?: QuizQuestion['visual'],
): QuizQuestion {
  const choices = rng.shuffle([String(answer), ...numericChoices(answer, rng, spread)]);
  return { prompt, choices, answer: choices.indexOf(String(answer)), explain, visual };
}

/** Mixed arithmetic. Division always divides exactly. */
export function arithmetic(rng: Rng, level: Level): QuizQuestion {
  const ops =
    level === 'easy' ? ['+', '−'] : level === 'normal' ? ['+', '−', '×'] : ['+', '−', '×', '÷'];
  const op = rng.pick(ops);
  const max = level === 'easy' ? 20 : level === 'normal' ? 100 : 1000;
  let a: number;
  let b: number;
  let answer: number;
  switch (op) {
    case '+':
      a = rng.int(1, max);
      b = rng.int(1, max);
      answer = a + b;
      break;
    case '−':
      a = rng.int(2, max);
      b = rng.int(1, a);
      answer = a - b;
      break;
    case '×': {
      const m = level === 'hard' ? 15 : 10;
      a = rng.int(2, m + 1);
      b = rng.int(2, m + 1);
      answer = a * b;
      break;
    }
    default: {
      b = rng.int(2, 13);
      answer = rng.int(2, 13);
      a = b * answer;
    }
  }
  const spread = Math.max(3, Math.round(Math.abs(answer) * 0.15));
  return numericQuestion(`${a} ${op} ${b} = ?`, answer, rng, spread);
}

export function multiplication(rng: Rng, level: Level): QuizQuestion {
  const [lo, hi] = level === 'easy' ? [1, 5] : level === 'normal' ? [2, 10] : [6, 15];
  const a = rng.int(lo, hi + 1);
  const b = rng.int(level === 'hard' ? 6 : 1, level === 'hard' ? 16 : 11);
  const answer = a * b;
  // Distractors come from neighbouring rows of the times table.
  const wrong = new Set<number>(
    [a * (b + 1), a * (b - 1), (a + 1) * b, (a - 1) * b, answer + 10, answer - 1].filter(
      (v) => v > 0 && v !== answer,
    ),
  );
  for (let pad = 2; wrong.size < 3; pad++) if (answer + pad !== answer) wrong.add(answer + pad);
  const picks = rng.shuffle([...wrong]).slice(0, 3);
  const choices = rng.shuffle([answer, ...picks]).map(String);
  return { prompt: `${a} × ${b} = ?`, choices, answer: choices.indexOf(String(answer)) };
}

export function mentalMath(rng: Rng, level: Level): QuizQuestion {
  const kind = rng.int(0, level === 'easy' ? 2 : level === 'normal' ? 4 : 6);
  switch (kind) {
    case 0: {
      const a = rng.int(2, 10);
      const b = rng.int(2, 10);
      const c = rng.int(1, 20);
      return numericQuestion(`${a} × ${b} + ${c} = ?`, a * b + c, rng, 6);
    }
    case 1: {
      const a = rng.int(10, 60);
      const b = rng.int(10, 40);
      const c = rng.int(2, 20);
      return numericQuestion(`${a} + ${b} − ${c} = ?`, a + b - c, rng, 6);
    }
    case 2: {
      const pct = rng.pick([10, 25, 50]);
      const base = rng.int(1, 20) * (pct === 25 ? 4 : pct === 50 ? 2 : 10);
      return numericQuestion(`${pct}% of ${base} = ?`, (base * pct) / 100, rng, 5);
    }
    case 3: {
      const n = rng.int(2, level === 'hard' ? 21 : 13);
      return numericQuestion(`${n}² = ?`, n * n, rng, Math.max(4, n));
    }
    case 4: {
      const a = rng.int(2, 9);
      const b = rng.int(2, 9);
      const c = rng.int(2, 6);
      return numericQuestion(`(${a} + ${b}) × ${c} = ?`, (a + b) * c, rng, 8);
    }
    default: {
      const b = rng.int(3, 12);
      const q = rng.int(3, 15);
      const c = rng.int(1, 30);
      return numericQuestion(`${b * q} ÷ ${b} + ${c} = ?`, q + c, rng, 6);
    }
  }
}

/** Number sequences: find the next term. Each rule is explained afterwards. */
export function sequence(rng: Rng, level: Level): QuizQuestion {
  const kinds = level === 'easy' ? 2 : level === 'normal' ? 4 : 6;
  const kind = rng.int(0, kinds);
  let terms: number[];
  let explain: string;
  switch (kind) {
    case 0: {
      const start = rng.int(1, 20);
      const d = rng.int(2, 10);
      terms = Array.from({ length: 5 }, (_, i) => start + d * i);
      explain = `Add ${d} each time.`;
      break;
    }
    case 1: {
      const start = rng.int(60, 120);
      const d = rng.int(3, 12);
      terms = Array.from({ length: 5 }, (_, i) => start - d * i);
      explain = `Subtract ${d} each time.`;
      break;
    }
    case 2: {
      const start = rng.int(1, 5);
      const r = rng.int(2, 4);
      terms = Array.from({ length: 5 }, (_, i) => start * r ** i);
      explain = `Multiply by ${r} each time.`;
      break;
    }
    case 3: {
      const off = rng.int(1, 5);
      terms = Array.from({ length: 5 }, (_, i) => (i + off) ** 2);
      explain = 'These are square numbers.';
      break;
    }
    case 4: {
      const a = rng.int(1, 4);
      const b = rng.int(1, 5);
      terms = [a, b];
      while (terms.length < 6) terms.push(terms[terms.length - 1] + terms[terms.length - 2]);
      explain = 'Each number is the sum of the two before it.';
      break;
    }
    default: {
      const start = rng.int(1, 10);
      const p = rng.int(2, 6);
      const q = rng.int(7, 12);
      terms = [start];
      for (let i = 1; i < 6; i++) terms.push(terms[i - 1] + (i % 2 ? p : q));
      explain = `The steps alternate: +${p}, +${q}.`;
    }
  }
  const answer = terms.pop()!;
  return numericQuestion(
    `${terms.join(', ')}, ?`,
    answer,
    rng,
    Math.max(4, Math.round(answer * 0.12)),
    explain,
  );
}

/** Equation puzzles: the missing number or the missing operator. */
export function mathPuzzle(rng: Rng, level: Level): QuizQuestion {
  const kind = rng.int(0, level === 'easy' ? 2 : 3);
  if (kind === 0) {
    const x = rng.int(2, level === 'easy' ? 15 : 40);
    const b = rng.int(2, 25);
    return numericQuestion(`? + ${b} = ${x + b}`, x, rng, 5, `${x + b} − ${b} = ${x}`);
  }
  if (kind === 1) {
    const x = rng.int(2, 12);
    const b = rng.int(2, 10);
    return numericQuestion(`? × ${b} = ${x * b}`, x, rng, 4, `${x * b} ÷ ${b} = ${x}`);
  }
  // Missing operator: exactly one of + − × ÷ fits (checked below).
  const a = rng.int(4, 16);
  const b = rng.int(2, 6);
  const results: Record<string, number | null> = {
    '+': a + b,
    '−': a - b,
    '×': a * b,
    '÷': a % b === 0 ? a / b : null,
  };
  const op = rng.pick(Object.keys(results).filter((k) => results[k] !== null));
  const target = results[op]!;
  const valid = Object.keys(results).filter((k) => results[k] === target);
  if (valid.length > 1) return mathPuzzle(rng, level);
  const choices = rng.shuffle(['+', '−', '×', '÷']);
  return {
    prompt: `${a} ? ${b} = ${target}. Which sign is missing?`,
    choices,
    answer: choices.indexOf(op),
    explain: `${a} ${op} ${b} = ${target}`,
  };
}

export function repeat(n: number, make: () => QuizQuestion): QuizQuestion[] {
  const out: QuizQuestion[] = [];
  const seen = new Set<string>();
  let guard = 0;
  while (out.length < n && guard++ < n * 20) {
    const q = make();
    // Visual questions share prompt text, so the key includes the answers.
    const key = `${q.prompt}|${q.choices.join('|')}|${q.answer}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(q);
  }
  return out;
}
