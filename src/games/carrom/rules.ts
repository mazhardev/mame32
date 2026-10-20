import { L, R_COIN, R_POCKET, POCKETS, disc } from './physics';
import type { Disc } from './physics';

/**
 * Carrom rules (simplified ICF):
 *  - Pocket one of your own coins and you shoot again.
 *  - The queen may only be pocketed once you have pocketed a coin of your
 *    own, and must then be "covered" by pocketing another of your coins in
 *    the same or the next shot — otherwise it goes back to the centre.
 *  - Pocketing the striker is a foul: coins you pocketed in that shot come
 *    back, plus one penalty coin (owed if you have none yet).
 *  - You may not pocket your last coin while the queen is uncovered, and
 *    pocketing your opponent's last coin returns it to the centre.
 *  - The first player to pocket all their coins (with the queen covered)
 *    wins the board, scoring one point per opponent coin left plus three
 *    for the queen if they covered it.
 */
export type Color = 'white' | 'black';
export const COINS = 9;

export const other = (c: Color): Color => (c === 'white' ? 'black' : 'white');

export interface Board {
  /** The 19 coins (the striker is kept separately). */
  discs: Disc[];
  turn: Color;
  /** Where the queen is: on the board, pocketed awaiting cover, or covered by a colour. */
  queen: 'board' | 'pending' | Color;
  pendingBy: Color | null;
  /** Penalty coins owed (fouls committed with no coin to give back). */
  due: Record<Color, number>;
  winner: Color | null;
  /** Points the winner scored on this board. */
  points: number;
}

export interface ShotResult {
  notes: string[];
  keepTurn: boolean;
  foul: boolean;
  /** Own coins pocketed this shot. */
  mine: number;
  /** Own coins still pocketed after penalties and returns. */
  kept: number;
  /** Opponent coins pocketed this shot (they count for the opponent). */
  theirs: number;
  queenIn: boolean;
  /** The queen was covered by this shot. */
  covered: boolean;
}

export function newBoard(): Board {
  const discs: Disc[] = [];
  const c = L / 2;
  let id = 1;
  discs.push(disc(id++, 'queen', c, c));
  const d = 2 * R_COIN + 0.4;
  const rot = Math.PI / 6;
  for (let k = 0; k < 6; k++) {
    const a = rot + (k * Math.PI) / 3;
    discs.push(disc(id++, k % 2 ? 'black' : 'white', c + Math.cos(a) * d, c + Math.sin(a) * d));
  }
  // Outer ring: six corners of the hexagon (white) and six edge midpoints (black).
  for (let k = 0; k < 12; k++) {
    const a = rot + (k * Math.PI) / 6;
    const r = k % 2 ? Math.sqrt(3) * d : 2 * d;
    discs.push(disc(id++, k % 2 ? 'black' : 'white', c + Math.cos(a) * r, c + Math.sin(a) * r));
  }
  return { discs, turn: 'white', queen: 'board', pendingBy: null, due: { white: 0, black: 0 }, winner: null, points: 0 };
}

export function cloneBoard(b: Board): Board {
  return { ...b, discs: b.discs.map((d) => ({ ...d })), due: { ...b.due } };
}

export function onBoard(b: Board, kind: Color | 'queen'): number {
  let n = 0;
  for (const d of b.discs) if (d.on && d.kind === kind) n++;
  return n;
}

export function pocketedCount(b: Board, c: Color): number {
  return COINS - onBoard(b, c);
}

export const queenCovered = (b: Board) => b.queen === 'white' || b.queen === 'black';

/** A free spot as close to the centre as possible. */
export function centreSpot(discs: Disc[], r = R_COIN, avoid: Disc[] = []): [number, number] {
  const c = L / 2;
  const free = (x: number, y: number) =>
    [...discs, ...avoid].every((d) => !d.on || (d.x - x) ** 2 + (d.y - y) ** 2 >= (d.r + r + 0.6) ** 2) &&
    POCKETS.every(([px, py]) => (px - x) ** 2 + (py - y) ** 2 > (R_POCKET + r) ** 2);
  if (free(c, c)) return [c, c];
  for (let ring = 1; ring < 40; ring++) {
    const rad = ring * r * 0.9;
    const steps = Math.max(6, Math.floor((2 * Math.PI * rad) / (r * 0.9)));
    for (let k = 0; k < steps; k++) {
      const a = (k / steps) * Math.PI * 2;
      const x = c + Math.cos(a) * rad;
      const y = c + Math.sin(a) * rad;
      if (free(x, y)) return [x, y];
    }
  }
  return [c, c];
}

export function returnToCentre(b: Board, d: Disc, avoid: Disc[] = []) {
  const [x, y] = centreSpot(b.discs, d.r, avoid);
  d.on = true;
  d.x = x;
  d.y = y;
  d.vx = 0;
  d.vy = 0;
}

const name = (c: Color) => (c === 'white' ? 'White' : 'Black');

/**
 * Applies the rules to a finished shot. `pocketed` lists the coins that went
 * in (they are already off the board). Mutates the board: returns coins,
 * moves the queen, passes the turn and decides the winner.
 */
export function resolveShot(b: Board, pocketed: Disc[], strikerIn: boolean, avoid: Disc[] = []): ShotResult {
  const me = b.turn;
  const opp = other(me);
  const queenDisc = b.discs.find((d) => d.kind === 'queen')!;
  const mine = pocketed.filter((d) => d.kind === me);
  const theirs = pocketed.filter((d) => d.kind === opp);
  const queenIn = pocketed.includes(queenDisc);
  const res: ShotResult = { notes: [], keepTurn: false, foul: false, mine: mine.length, kept: mine.length, theirs: theirs.length, queenIn, covered: false };
  const back = (d: Disc) => returnToCentre(b, d, avoid);

  if (strikerIn) {
    res.foul = true;
    res.notes.push('Foul! The striker went in.');
    for (const d of mine) back(d);
    res.kept = 0;
    if (queenIn || (b.queen === 'pending' && b.pendingBy === me)) {
      back(queenDisc);
      b.queen = 'board';
      b.pendingBy = null;
    }
    const penalty = b.discs.find((d) => d.kind === me && !d.on);
    if (penalty) {
      back(penalty);
      res.notes.push('One of your coins goes back to the centre.');
    } else b.due[me]++;
  } else {
    // Covering a queen pocketed on the previous shot.
    if (b.queen === 'pending' && b.pendingBy === me) {
      if (mine.length > 0) {
        b.queen = me;
        res.covered = true;
        res.notes.push('Queen covered!');
      } else {
        back(queenDisc);
        b.queen = 'board';
        res.notes.push('Queen not covered — back to the centre.');
      }
      b.pendingBy = null;
    }
    if (queenIn) {
      const before = pocketedCount(b, me) - mine.length;
      if (before === 0 && mine.length === 0) {
        back(queenDisc);
        res.notes.push('Pocket one of your own coins before the queen.');
      } else if (mine.length > 0) {
        b.queen = me;
        res.covered = true;
        res.notes.push('Queen pocketed and covered!');
      } else {
        b.queen = 'pending';
        b.pendingBy = me;
        res.notes.push('Queen pocketed — cover it with your next coin!');
      }
    }
    // Pay any penalty coins still owed.
    while (b.due[me] > 0 && res.kept > 0) {
      back(mine[res.kept - 1]);
      res.kept--;
      b.due[me]--;
      res.notes.push('A penalty coin goes back to the centre.');
    }
    res.keepTurn = res.kept > 0 || b.queen === 'pending';
    // Your last coin may not go in before the queen is covered.
    if (onBoard(b, me) === 0 && !queenCovered(b)) {
      back(mine[mine.length - 1] ?? b.discs.find((d) => d.kind === me && !d.on)!);
      res.kept--;
      res.foul = true;
      res.keepTurn = false;
      if (b.queen === 'pending') {
        back(queenDisc);
        b.queen = 'board';
        b.pendingBy = null;
      }
      res.notes.push('Cover the queen before your last coin!');
    }
  }

  // Pocketing your opponent's last coin returns it.
  if (onBoard(b, opp) === 0) {
    back(theirs[theirs.length - 1] ?? b.discs.find((d) => d.kind === opp && !d.on)!);
    res.foul = true;
    res.keepTurn = false;
    res.notes.push(`${name(opp)}'s last coin goes back to the centre.`);
  }

  if (onBoard(b, me) === 0 && queenCovered(b)) {
    b.winner = me;
    b.points = onBoard(b, opp) + (b.queen === me ? 3 : 0);
  } else if (!res.keepTurn) b.turn = opp;
  return res;
}
