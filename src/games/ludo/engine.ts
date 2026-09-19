/**
 * Ludo. Each token's progress runs −1 (yard), 0–50 (main track, relative to
 * its colour's start), 51–55 (home column) and 56 (finished). The 52-square
 * main track is shared; START[colour] is where that colour enters it.
 */
export const COLORS = ['red', 'green', 'yellow', 'blue'] as const;
export type Color = 0 | 1 | 2 | 3;
export const START: Record<Color, number> = { 0: 0, 1: 13, 2: 26, 3: 39 };
export const SAFE = new Set([0, 8, 13, 21, 26, 34, 39, 47]);
export const HOME = 56;

export interface LudoState {
  /** tokens[colour] = four progress values. */
  tokens: Record<Color, number[]>;
  players: Color[];
  turn: number; // index into players
  sixes: number;
}

export function initial(players: Color[]): LudoState {
  return { tokens: { 0: [-1, -1, -1, -1], 1: [-1, -1, -1, -1], 2: [-1, -1, -1, -1], 3: [-1, -1, -1, -1] }, players, turn: 0, sixes: 0 };
}

export const trackSquare = (c: Color, progress: number) => (progress >= 0 && progress <= 50 ? (START[c] + progress) % 52 : -1);

export function target(progress: number, roll: number): number | null {
  if (progress === -1) return roll === 6 ? 0 : null;
  if (progress + roll > HOME) return null;
  return progress + roll;
}

export function movable(s: LudoState, c: Color, roll: number): number[] {
  return s.tokens[c].map((p, i) => (p !== HOME && target(p, roll) !== null ? i : -1)).filter((i) => i >= 0);
}

export interface MoveResult {
  state: LudoState;
  captured: { color: Color; token: number }[];
  finished: boolean;
  extraTurn: boolean;
}

/** Moves a token for the current player. Sixes, captures and reaching home earn another roll. */
export function move(s: LudoState, token: number, roll: number): MoveResult {
  const c = s.players[s.turn];
  const to = target(s.tokens[c][token], roll) as number;
  const tokens = { ...s.tokens, [c]: s.tokens[c].map((p, i) => (i === token ? to : p)) } as Record<Color, number[]>;
  const captured: MoveResult['captured'] = [];
  const sq = trackSquare(c, to);
  if (sq >= 0 && !SAFE.has(sq)) {
    for (const other of s.players) {
      if (other === c) continue;
      tokens[other] = tokens[other].map((p, i) => {
        if (trackSquare(other, p) === sq) {
          captured.push({ color: other, token: i });
          return -1;
        }
        return p;
      });
    }
  }
  const finished = to === HOME;
  const sixes = roll === 6 ? s.sixes + 1 : 0;
  const extraTurn = (roll === 6 && sixes < 3) || captured.length > 0 || finished;
  const won = tokens[c].every((p) => p === HOME);
  return {
    state: { ...s, tokens, turn: extraTurn && !won ? s.turn : (s.turn + 1) % s.players.length, sixes: extraTurn && !won ? sixes : 0 },
    captured,
    finished,
    extraTurn: extraTurn && !won,
  };
}

/** Passes the turn (no legal move, or a third six in a row). */
export function passTurn(s: LudoState): LudoState {
  return { ...s, turn: (s.turn + 1) % s.players.length, sixes: 0 };
}

export const hasWon = (s: LudoState, c: Color) => s.tokens[c].every((p) => p === HOME);

/** How many opposing tokens sit 1–6 squares behind a main-track square (could hit it next roll). */
function threats(s: LudoState, c: Color, sq: number): number {
  if (sq < 0 || SAFE.has(sq)) return 0;
  let n = 0;
  for (const o of s.players) {
    if (o === c) continue;
    for (const p of s.tokens[o]) {
      const osq = trackSquare(o, p);
      if (osq < 0) continue;
      const gap = (sq - osq + 52) % 52;
      if (gap >= 1 && gap <= 6) n++;
    }
  }
  return n;
}

export type Level = 'easy' | 'normal' | 'hard';

export function chooseToken(s: LudoState, roll: number, level: Level, rand: () => number = Math.random): number | null {
  const c = s.players[s.turn];
  const options = movable(s, c, roll);
  if (!options.length) return null;
  if (level === 'easy') return options[Math.floor(rand() * options.length)];
  let best = options[0];
  let bestValue = -Infinity;
  for (const t of options) {
    const from = s.tokens[c][t];
    const r = move(s, t, roll);
    const to = r.state.tokens[c][t];
    let v = r.captured.length * 60 + (r.finished ? 50 : 0) + (from === -1 ? 35 : 0) + to * 0.4;
    if (to > 50) v += 20; // safe in the home column
    if (level === 'hard') {
      const before = threats(s, c, trackSquare(c, from));
      const after = threats(r.state, c, trackSquare(c, to));
      v += before * 18 - after * 22;
      if (SAFE.has(trackSquare(c, to))) v += 10;
    } else if (SAFE.has(trackSquare(c, to))) v += 6;
    if (v > bestValue) {
      bestValue = v;
      best = t;
    }
  }
  return best;
}
