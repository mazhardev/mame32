/**
 * Equation Guess: find the hidden equation (such as 12+35=47) in six tries.
 * Every guess must itself be a true equation of the right length. After each
 * guess the tiles turn green (right symbol, right place), amber (in the
 * equation, elsewhere) or grey (not in it), counting repeated symbols like a
 * word game does.
 *
 * Symbols: digits, + - * / and one =. The usual order of operations applies,
 * division must come out exact, the answer is a whole number of 0 or more, and
 * numbers have no leading zeros.
 */
export type Mark = 'correct' | 'present' | 'absent';
export const SYMBOLS = '0123456789+-*/=';
export const OPS = '+-*/';
export const MAX_GUESSES = 6;

/** Splits "12+3*4" into numbers and operators; null if malformed. */
function tokens(expr: string): (number | string)[] | null {
  const out: (number | string)[] = [];
  let num = '';
  for (const ch of expr) {
    if (ch >= '0' && ch <= '9') num += ch;
    else if (OPS.includes(ch)) {
      if (!num) return null;
      out.push(num);
      out.push(ch);
      num = '';
    } else return null;
  }
  if (!num) return null;
  out.push(num);
  // No leading zeros: "07" is not a number here.
  for (let i = 0; i < out.length; i += 2) {
    const s = out[i] as string;
    if (s.length > 1 && s[0] === '0') return null;
    out[i] = Number(s);
  }
  return out;
}

/** Evaluates with × and ÷ before + and −; null if a division is not exact. */
export function evaluate(expr: string): number | null {
  const t = tokens(expr);
  if (!t) return null;
  // First pass: multiply and divide.
  const terms: (number | string)[] = [t[0]];
  for (let i = 1; i < t.length; i += 2) {
    const op = t[i] as string;
    const n = t[i + 1] as number;
    if (op === '*' || op === '/') {
      const a = terms.pop() as number;
      if (op === '/' && (n === 0 || a % n !== 0)) return null;
      terms.push(op === '*' ? a * n : a / n);
    } else terms.push(op, n);
  }
  let v = terms[0] as number;
  for (let i = 1; i < terms.length; i += 2) v = terms[i] === '+' ? v + (terms[i + 1] as number) : v - (terms[i + 1] as number);
  return v;
}

export type Problem = 'length' | 'equals' | 'syntax' | 'false';

/** Why a guess is not a valid equation, or null if it is. */
export function problem(guess: string, length: number): Problem | null {
  if (guess.length !== length) return 'length';
  const parts = guess.split('=');
  if (parts.length !== 2 || !parts[0] || !parts[1]) return 'equals';
  if (!/^\d+$/.test(parts[1]) || (parts[1].length > 1 && parts[1][0] === '0')) return 'syntax';
  if (!/[+\-*/]/.test(parts[0])) return 'syntax';
  const v = evaluate(parts[0]);
  if (v === null) return 'syntax';
  return v === Number(parts[1]) ? null : 'false';
}

export const PROBLEMS: Record<Problem, string> = {
  length: 'Fill every square',
  equals: 'Use exactly one = with a number after it',
  syntax: 'That is not a valid sum',
  false: 'That equation is not true',
};

/** Green / amber / grey marks, handling repeats like a word game. */
export function marks(guess: string, answer: string): Mark[] {
  const out: Mark[] = Array(guess.length).fill('absent');
  const left = new Map<string, number>();
  for (let i = 0; i < answer.length; i++) {
    if (guess[i] === answer[i]) out[i] = 'correct';
    else left.set(answer[i], (left.get(answer[i]) ?? 0) + 1);
  }
  for (let i = 0; i < guess.length; i++) {
    if (out[i] === 'correct') continue;
    const n = left.get(guess[i]) ?? 0;
    if (n > 0) {
      out[i] = 'present';
      left.set(guess[i], n - 1);
    }
  }
  return out;
}

/** Best known mark per symbol, for the keypad. */
export function keyMarks(guesses: string[], answer: string): Map<string, Mark> {
  const m = new Map<string, Mark>();
  const rank = { absent: 0, present: 1, correct: 2 };
  for (const g of guesses) {
    marks(g, answer).forEach((k, i) => {
      const cur = m.get(g[i]);
      if (!cur || rank[k] > rank[cur]) m.set(g[i], k);
    });
  }
  return m;
}

const rint = (random: () => number, lo: number, hi: number) => lo + Math.floor(random() * (hi - lo + 1));

/** A random true equation of exactly `length` symbols. */
export function makeEquation(length: number, random: () => number): string {
  for (;;) {
    const ops = length <= 6 ? 1 : random() < 0.55 ? 2 : 1;
    const big = length >= 8 ? 99 : length === 7 ? 50 : 20;
    const nums = Array.from({ length: ops + 1 }, () => rint(random, 1, random() < 0.6 ? 9 : big));
    const opList = Array.from({ length: ops }, () => OPS[Math.floor(random() * (length <= 6 ? 3 : 4))]);
    let expr = String(nums[0]);
    opList.forEach((op, i) => (expr += op + nums[i + 1]));
    const v = evaluate(expr);
    if (v === null || v < 0) continue;
    const eq = `${expr}=${v}`;
    if (eq.length === length && problem(eq, length) === null) return eq;
  }
}

/** Display form of a symbol: × and ÷ for * and /. */
export const show = (ch: string) => (ch === '*' ? '×' : ch === '/' ? '÷' : ch === '-' ? '−' : ch);

export function validGuesses(v: unknown, length: number): v is string[] {
  return Array.isArray(v) && v.length <= MAX_GUESSES && v.every((g) => typeof g === 'string' && problem(g, length) === null);
}
