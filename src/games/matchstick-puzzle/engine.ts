/**
 * Matchstick Puzzle: an equation is made of matchsticks; move exactly one
 * stick to make it true.
 *
 * Digits are seven-segment shapes (segments a–g as bits 0–6). Operators have
 * two slots: a horizontal bar and a vertical bar, so "+" can become "−" by
 * taking its vertical stick away. The equals sign is fixed.
 */
export type Level = 'easy' | 'normal' | 'hard';

//   a
//  f b
//   g
//  e c
//   d
const A = 1, B = 2, C = 4, D = 8, E = 16, F = 32, G = 64;
export const DIGITS: number[] = [
  A | B | C | D | E | F, // 0
  B | C, // 1
  A | B | G | E | D, // 2
  A | B | G | C | D, // 3
  F | G | B | C, // 4
  A | F | G | C | D, // 5
  A | F | G | E | D | C, // 6
  A | B | C, // 7
  A | B | C | D | E | F | G, // 8
  A | B | C | D | F | G, // 9
];
const PLUS = 3; // horizontal (1) + vertical (2)
const MINUS = 1;

export type Kind = 'digit' | 'op' | 'eq';
export interface Sym {
  kind: Kind;
  /** Bit mask of lit sticks. */
  lit: number;
}
export type Equation = Sym[];

/** Number of stick slots a symbol has. */
export const slots = (k: Kind) => (k === 'digit' ? 7 : k === 'op' ? 2 : 0);

export const digitOf = (lit: number) => DIGITS.indexOf(lit);
const validSym = (s: Sym) => (s.kind === 'digit' ? digitOf(s.lit) >= 0 : s.kind === 'op' ? s.lit === PLUS || s.lit === MINUS : true);

export function build(a: number, op: '+' | '-', b: number, c: number): Equation {
  const num = (n: number): Sym[] => String(n).split('').map((d) => ({ kind: 'digit', lit: DIGITS[Number(d)] }));
  return [...num(a), { kind: 'op', lit: op === '+' ? PLUS : MINUS }, ...num(b), { kind: 'eq', lit: 0 }, ...num(c)];
}

/** Reads an equation as text, or null if a symbol is not a valid shape. */
export function read(eq: Equation): string | null {
  let out = '';
  for (const s of eq) {
    if (!validSym(s)) return null;
    out += s.kind === 'digit' ? String(digitOf(s.lit)) : s.kind === 'op' ? (s.lit === PLUS ? '+' : '-') : '=';
  }
  return out;
}

/** Evaluates "a+b=c" / "a-b=c"; multi-digit numbers may not start with 0. */
export function isTrue(eq: Equation): boolean {
  const text = read(eq);
  if (!text) return false;
  const m = /^(\d+)([+-])(\d+)=(\d+)$/.exec(text);
  if (!m) return false;
  if ([m[1], m[3], m[4]].some((n) => n.length > 1 && n[0] === '0')) return false;
  const [a, b, c] = [Number(m[1]), Number(m[3]), Number(m[4])];
  return (m[2] === '+' ? a + b : a - b) === c;
}

export interface StickMove {
  from: [number, number];
  to: [number, number];
}

export function applyMove(eq: Equation, m: StickMove): Equation {
  const next = eq.map((s) => ({ ...s }));
  next[m.from[0]].lit &= ~(1 << m.from[1]);
  next[m.to[0]].lit |= 1 << m.to[1];
  return next;
}

/** Every single-stick move that leaves all symbols valid. */
export function moves(eq: Equation): StickMove[] {
  const out: StickMove[] = [];
  eq.forEach((s, i) => {
    for (let a = 0; a < slots(s.kind); a++) {
      if (!(s.lit & (1 << a))) continue;
      eq.forEach((t, j) => {
        for (let b = 0; b < slots(t.kind); b++) {
          if (i === j && a === b) continue;
          const occupied = t.lit & (1 << b);
          if (occupied && !(i === j)) continue;
          if (i === j && occupied) continue;
          const m: StickMove = { from: [i, a], to: [j, b] };
          if (read(applyMove(eq, m))) out.push(m);
        }
      });
    }
  });
  return out;
}

export const solutions = (eq: Equation) => moves(eq).filter((m) => isTrue(applyMove(eq, m)));

const RANGE: Record<Level, [number, number]> = { easy: [0, 9], normal: [0, 20], hard: [10, 60] };

/** A false equation that one stick move makes true. */
export function generate(level: Level, random: () => number): Equation {
  const [lo, hi] = RANGE[level];
  for (;;) {
    const op = random() < 0.5 ? '+' : '-';
    let a = lo + Math.floor(random() * (hi - lo + 1));
    let b = lo + Math.floor(random() * (hi - lo + 1));
    if (op === '-' && b > a) [a, b] = [b, a];
    const c = op === '+' ? a + b : a - b;
    if (level === 'easy' && c > 9) continue;
    const truth = build(a, op, b, c);
    const candidates = moves(truth)
      .map((m) => applyMove(truth, m))
      .filter((e) => !isTrue(e) && read(e) && /^(\d+)[+-](\d+)=(\d+)$/.test(read(e)!) && solutions(e).length > 0);
    if (candidates.length) return candidates[Math.floor(random() * candidates.length)];
  }
}
