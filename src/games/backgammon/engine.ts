/**
 * Backgammon rules. `points[i]` holds a signed checker count: positive for
 * player 1 (who moves from index 23 down to 0 and bears off below 0),
 * negative for player 2 (who moves from 0 up to 23 and bears off above 23).
 * Player 1's bar is position 24; player 2's bar is position −1.
 */
export type Player = 1 | 2;

export interface BGState {
  points: number[];
  bar: Record<Player, number>;
  off: Record<Player, number>;
  turn: Player;
}
export interface Step {
  from: number;
  to: number; // may be off the board (< 0 or > 23)
  die: number;
  hit: boolean;
}

export function initial(): BGState {
  const points = new Array<number>(24).fill(0);
  points[23] = 2;
  points[12] = 5;
  points[7] = 3;
  points[5] = 5;
  points[0] = -2;
  points[11] = -5;
  points[16] = -3;
  points[18] = -5;
  return { points, bar: { 1: 0, 2: 0 }, off: { 1: 0, 2: 0 }, turn: 1 };
}

const sign = (p: Player) => (p === 1 ? 1 : -1);
const dir = (p: Player) => (p === 1 ? -1 : 1);
export const barPos = (p: Player) => (p === 1 ? 24 : -1);
const mine = (s: BGState, i: number, p: Player) => s.points[i] * sign(p) > 0;
const count = (s: BGState, i: number, p: Player) => Math.max(0, s.points[i] * sign(p));
/** Distance of a point from bearing off, 1–24, for player p. */
const distance = (i: number, p: Player) => (p === 1 ? i + 1 : 24 - i);

export function pipCount(s: BGState, p: Player): number {
  let n = s.bar[p] * 25;
  for (let i = 0; i < 24; i++) n += count(s, i, p) * distance(i, p);
  return n;
}

function allHome(s: BGState, p: Player): boolean {
  if (s.bar[p]) return false;
  for (let i = 0; i < 24; i++) if (count(s, i, p) && distance(i, p) > 6) return false;
  return true;
}

/** Legal single steps for one die value. */
export function stepsFor(s: BGState, die: number): Step[] {
  const p = s.turn;
  const out: Step[] = [];
  const target = (to: number) => {
    const v = s.points[to] * sign(p);
    return v >= -1; // open, own, or a single opposing blot
  };
  if (s.bar[p]) {
    const to = barPos(p) + dir(p) * die;
    if (target(to)) out.push({ from: barPos(p), to, die, hit: s.points[to] * sign(p) === -1 });
    return out;
  }
  const home = allHome(s, p);
  for (let i = 0; i < 24; i++) {
    if (!mine(s, i, p)) continue;
    const to = i + dir(p) * die;
    if (to >= 0 && to <= 23) {
      if (target(to)) out.push({ from: i, to, die, hit: s.points[to] * sign(p) === -1 });
    } else if (home) {
      const d = distance(i, p);
      // Exact bear-off, or a larger die when no checker sits farther back.
      let farther = false;
      for (let j = 0; j < 24; j++) if (count(s, j, p) && distance(j, p) > d) farther = true;
      if (d === die || (die > d && !farther)) out.push({ from: i, to, die, hit: false });
    }
  }
  return out;
}

export function applyStep(s: BGState, st: Step): BGState {
  const p = s.turn;
  const q: Player = p === 1 ? 2 : 1;
  const points = [...s.points];
  const bar = { ...s.bar };
  const off = { ...s.off };
  if (st.from === barPos(p)) bar[p]--;
  else points[st.from] -= sign(p);
  if (st.to < 0 || st.to > 23) off[p]++;
  else {
    if (st.hit) {
      points[st.to] = 0;
      bar[q]++;
    }
    points[st.to] += sign(p);
  }
  return { points, bar, off, turn: p };
}

export const keyOf = (s: BGState) => `${s.points.join(',')}|${s.bar[1]},${s.bar[2]}|${s.off[1]},${s.off[2]}`;

/**
 * Every legal way to play a roll. Players must use as many dice as possible;
 * if only one of two different dice can be used, it must be the larger.
 * Sequences leading to the same position are merged.
 */
export function sequences(s: BGState, dice: [number, number]): Step[][] {
  const orders = dice[0] === dice[1] ? [[dice[0], dice[0], dice[0], dice[0]]] : [dice, [dice[1], dice[0]]];
  const found = new Map<string, Step[]>();
  let best = 0;
  const walk = (st: BGState, rest: number[], path: Step[]) => {
    const options = rest.length && st.off[st.turn] < 15 ? stepsFor(st, rest[0]) : [];
    if (!options.length) {
      if (path.length > best) {
        best = path.length;
        found.clear();
      }
      if (path.length === best) {
        const k = keyOf(st);
        if (!found.has(k)) found.set(k, path);
      }
      return;
    }
    for (const o of options) walk(applyStep(st, o), rest.slice(1), [...path, o]);
  };
  for (const order of orders) walk(s, order, []);
  let seqs = [...found.values()];
  if (best === 1 && dice[0] !== dice[1]) {
    const high = Math.max(...dice);
    if (seqs.some((q) => q[0].die === high)) seqs = seqs.filter((q) => q[0].die === high);
  }
  return best === 0 ? [[]] : seqs;
}

export function endTurn(s: BGState): BGState {
  return { ...s, turn: s.turn === 1 ? 2 : 1 };
}

/** 1 = single game, 2 = gammon, 3 = backgammon; null while still playing. */
export function result(s: BGState): { winner: Player; value: number } | null {
  for (const p of [1, 2] as Player[]) {
    if (s.off[p] < 15) continue;
    const q: Player = p === 1 ? 2 : 1;
    if (s.off[q] > 0) return { winner: p, value: 1 };
    let deep = s.bar[q] > 0;
    for (let i = 0; i < 24; i++) if (count(s, i, q) && distance(i, p) <= 6) deep = true;
    return { winner: p, value: deep ? 3 : 2 };
  }
  return null;
}

export type Level = 'easy' | 'normal' | 'hard';

/** Positional score for player p (higher is better). */
export function evaluate(s: BGState, p: Player, level: Level): number {
  const q: Player = p === 1 ? 2 : 1;
  if (s.off[p] === 15) return 1e6;
  let v = (pipCount(s, q) - pipCount(s, p)) + s.off[p] * 2 + s.bar[q] * 10 - s.bar[p] * 10;
  // Contact: some player-1 checker still has player-2 checkers ahead of it.
  let max1 = s.bar[1] ? 24 : -1;
  let min2 = s.bar[2] ? -1 : 24;
  for (let i = 0; i < 24; i++) {
    if (s.points[i] > 0) max1 = Math.max(max1, i);
    if (s.points[i] < 0) min2 = Math.min(min2, i);
  }
  const contact = max1 > min2;
  if (!contact) return v * 2;
  for (let i = 0; i < 24; i++) {
    const n = count(s, i, p);
    if (n >= 2) v += distance(i, p) <= 6 ? 5 : 2;
    if (n === 1) {
      if (level === 'hard') {
        // Count opposing checkers that could hit this blot with one die.
        let shots = s.bar[q] && distance(i, p) <= 6 ? 1 : 0;
        for (let j = 0; j < 24; j++) {
          const gap = (j - i) * dir(q) * -1;
          if (count(s, j, q) && gap >= 1 && gap <= 6) shots++;
        }
        v -= shots * (3 + (25 - distance(i, p)) / 6);
      } else v -= 4;
    }
  }
  return v;
}

export function chooseSequence(s: BGState, dice: [number, number], level: Level, rand: () => number = Math.random): Step[] {
  const seqs = sequences(s, dice);
  if (level === 'easy' && rand() < 0.5) return seqs[Math.floor(rand() * seqs.length)];
  let best = seqs[0];
  let bestV = -Infinity;
  for (const q of seqs) {
    const after = q.reduce(applyStep, s);
    const v = evaluate(after, s.turn, level) + rand() * 0.5;
    if (v > bestV) {
      bestV = v;
      best = q;
    }
  }
  return best;
}
