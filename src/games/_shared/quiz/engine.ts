import type { ReactNode } from 'react';
import type { Rng } from '@/utils/random';

export interface QuizQuestion {
  prompt: string;
  choices: string[];
  /** Index into choices. */
  answer: number;
  /** Optional picture, flag, swatch or big text shown above the choices. */
  visual?: ReactNode;
  /** Shown after answering. */
  explain?: string;
}

/** A bank entry before its choices are shuffled. */
export interface BankItem {
  prompt: string;
  correct: string;
  wrong: string[];
  /** 1 = easy, 2 = normal, 3 = hard. Easy rounds draw from level 1, hard from all. */
  level?: 1 | 2 | 3;
  explain?: string;
  visual?: ReactNode;
}

/** Turns a bank item into a question with its choices shuffled. */
export function toQuestion(item: BankItem, rng: Rng, choiceCount = 4): QuizQuestion {
  const wrong = rng.shuffle([...new Set(item.wrong.filter((w) => w !== item.correct))]);
  const choices = rng.shuffle([item.correct, ...wrong.slice(0, choiceCount - 1)]);
  return {
    prompt: item.prompt,
    choices,
    answer: choices.indexOf(item.correct),
    visual: item.visual,
    explain: item.explain,
  };
}

/** Picks `count` distinct bank items suited to the difficulty. */
export function drawFromBank(
  bank: BankItem[],
  rng: Rng,
  difficulty: 'easy' | 'normal' | 'hard',
  count: number,
): QuizQuestion[] {
  const maxLevel = difficulty === 'easy' ? 1 : difficulty === 'normal' ? 2 : 3;
  let pool = bank.filter((b) => (b.level ?? 1) <= maxLevel);
  // Hard rounds lean on the harder questions but still mix in the rest.
  if (difficulty === 'hard') {
    const hard = rng.shuffle(bank.filter((b) => (b.level ?? 1) >= 2));
    const rest = rng.shuffle(bank.filter((b) => (b.level ?? 1) < 2));
    pool = [...hard, ...rest];
    return pool.slice(0, count).map((b) => toQuestion(b, rng));
  }
  if (pool.length < count) pool = bank;
  return rng
    .shuffle([...pool])
    .slice(0, count)
    .map((b) => toQuestion(b, rng));
}

/**
 * Wrong answers for a numeric question: nearby values that are distinct from
 * the answer and from each other, never negative unless the answer is.
 */
export function numericChoices(answer: number, rng: Rng, spread = 10): string[] {
  const out = new Set<number>();
  let guard = 0;
  while (out.size < 3 && guard++ < 200) {
    const delta = rng.int(1, Math.max(2, spread) + 1) * (rng.bool() ? 1 : -1);
    const v = answer + delta;
    if (v !== answer && (v >= 0 || answer < 0)) out.add(v);
  }
  let pad = 1;
  while (out.size < 3) {
    if (answer + pad !== answer) out.add(answer + pad);
    pad++;
  }
  return [...out].map(String);
}

export type AnswerResult = { correct: boolean; points: number; timedOut: boolean };

/**
 * Round state for a multiple-choice quiz. Scoring: 100 per correct answer,
 * up to 50 more for answering quickly on timed rounds, and +20 per answer
 * while on a streak of three or more.
 */
export class QuizEngine {
  index = 0;
  score = 0;
  correct = 0;
  streak = 0;
  bestStreak = 0;
  answered: (number | null)[] = [];

  constructor(public readonly questions: QuizQuestion[]) {}

  get current(): QuizQuestion | undefined {
    return this.questions[this.index];
  }

  get finished(): boolean {
    return this.index >= this.questions.length;
  }

  get total(): number {
    return this.questions.length;
  }

  get accuracy(): number {
    return this.answered.length ? this.correct / this.answered.length : 0;
  }

  /** `timeFraction` is the share of the question's time left (1 when untimed). */
  answer(choice: number | null, timeFraction = 1): AnswerResult {
    const q = this.current;
    if (!q || this.answered.length > this.index)
      return { correct: false, points: 0, timedOut: false };
    this.answered.push(choice);
    const correct = choice !== null && choice === q.answer;
    let points = 0;
    if (correct) {
      this.correct++;
      this.streak++;
      this.bestStreak = Math.max(this.bestStreak, this.streak);
      points =
        100 + Math.round(Math.max(0, Math.min(1, timeFraction)) * 50) + (this.streak >= 3 ? 20 : 0);
      this.score += points;
    } else {
      this.streak = 0;
    }
    return { correct, points, timedOut: choice === null };
  }

  next(): void {
    if (this.answered.length > this.index) this.index++;
  }
}
