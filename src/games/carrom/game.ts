import type { DifficultySetting } from '@/types';
import type { SoundName } from '@/services/audio';
import { baseState } from '../_shared/arcade/kit';
import type { BaseState, Input } from '../_shared/arcade/kit';
import { MAX_X, MIN_X, baseY, chooseShot, clampAim, strikerFits } from './ai';
import type { Shot } from './ai';
import { L, advance, disc, speedFor } from './physics';
import type { Disc, PhysEvent } from './physics';
import { COINS, newBoard, onBoard, other, pocketedCount, resolveShot } from './rules';
import type { Board, Color } from './rules';

/** Carrom game flow: aiming, the computer's turn, shots and their results. */
export const FRAME = 22;
export const SIZE = L + 2 * FRAME;

export type Mode = 'ai' | 'local';
export type Phase = 'aim' | 'think' | 'cpu-aim' | 'cpu-power' | 'moving' | 'pause' | 'end';

export interface Aim {
  x: number;
  angle: number;
  power: number;
  charging: boolean;
  drag: 'place' | 'aim' | null;
  startX: number;
  startY: number;
}

export interface State extends BaseState {
  mode: Mode;
  difficulty: DifficultySetting;
  board: Board;
  striker: Disc;
  all: Disc[];
  phase: Phase;
  timer: number;
  aim: Aim;
  lastX: Record<Color, number>;
  cpu: { shot: Shot; fromX: number; fromAngle: number; t: number } | null;
  shot: { pocketed: Disc[]; strikerIn: boolean };
  notes: { text: string; t: number }[];
  /** Short "whose turn" line. */
  banner: string;
  invalid: number;
  playerScore: number;
  won: boolean | null;
  stats: { best: number; queen: boolean; fouls: number; shots: number };
}

const sound = (s: State, n: SoundName) => {
  if (!s.events.includes(n)) s.events.push(n);
};

export const isCpu = (s: State, c: Color) => s.mode === 'ai' && c === 'black';

export function label(s: State, c: Color): string {
  if (s.mode === 'ai') return c === 'white' ? 'You' : 'Computer';
  return c === 'white' ? 'White' : 'Black';
}

function note(s: State, text: string) {
  s.notes.push({ text, t: 2.2 });
  if (s.notes.length > 3) s.notes.shift();
}

export function create(difficulty: DifficultySetting, _random: () => number, mode: Mode = 'ai'): State {
  const board = newBoard();
  const striker = disc(0, 'striker', L / 2, baseY('white'));
  const s: State = {
    ...baseState(),
    mode,
    difficulty,
    board,
    striker,
    all: [...board.discs, striker],
    phase: 'aim',
    timer: 0,
    aim: { x: L / 2, angle: -Math.PI / 2, power: 0, charging: false, drag: null, startX: 0, startY: 0 },
    lastX: { white: L / 2, black: L / 2 },
    cpu: null,
    shot: { pocketed: [], strikerIn: false },
    notes: [],
    banner: '',
    invalid: 0,
    playerScore: 0,
    won: null,
    stats: { best: 0, queen: false, fouls: 0, shots: 0 },
  };
  startTurn(s);
  return s;
}

const clampX = (x: number) => Math.max(MIN_X, Math.min(MAX_X, x));

/** The free striker position closest to `x` on the current baseline. */
function nearestFree(s: State, x: number): number {
  const y = baseY(s.board.turn);
  for (let k = 0; k < 120; k++) {
    for (const sgn of [1, -1]) {
      const cx = clampX(x + sgn * k * 2);
      if (strikerFits(s.board.discs, cx, y)) return cx;
    }
  }
  return clampX(x);
}

export function startTurn(s: State) {
  const c = s.board.turn;
  const st = s.striker;
  st.on = true;
  st.vx = 0;
  st.vy = 0;
  st.y = baseY(c);
  st.x = nearestFree(s, s.lastX[c]);
  s.aim = { x: st.x, angle: c === 'white' ? -Math.PI / 2 : Math.PI / 2, power: 0, charging: false, drag: null, startX: 0, startY: 0 };
  s.banner = s.mode === 'ai' ? (c === 'white' ? 'Your turn' : 'Computer’s turn') : `${label(s, c)}’s turn`;
  if (isCpu(s, c)) {
    s.phase = 'think';
    s.timer = 0.7;
  } else s.phase = 'aim';
}

function shoot(s: State) {
  const st = s.striker;
  if (!strikerFits(s.board.discs, st.x, st.y)) {
    s.invalid = 0.6;
    s.aim.power = 0;
    note(s, 'Move the striker clear of the coins first.');
    sound(s, 'failure');
    return;
  }
  const sp = speedFor(s.aim.power);
  st.vx = Math.cos(s.aim.angle) * sp;
  st.vy = Math.sin(s.aim.angle) * sp;
  s.lastX[s.board.turn] = st.x;
  s.shot = { pocketed: [], strikerIn: false };
  s.phase = 'moving';
  s.stats.shots++;
  sound(s, 'hit');
}

function humanAim(s: State, dt: number, input: Input) {
  const a = s.aim;
  const c = s.board.turn;
  const fine = input.held.has('action2') ? 0.3 : 1;
  const dir = (input.held.has('right') ? 1 : 0) - (input.held.has('left') ? 1 : 0);
  if (dir && !a.charging) a.x = clampX(a.x + dir * 120 * fine * dt);
  const rot = (input.held.has('down') ? 1 : 0) - (input.held.has('up') ? 1 : 0);
  if (rot) a.angle = clampAim(a.angle + rot * 1.2 * fine * dt, c);
  if (input.held.has('action')) {
    a.charging = true;
    a.power = Math.min(1, a.power + dt / 1.1);
  } else if (a.charging) {
    a.charging = false;
    s.striker.x = a.x;
    shoot(s);
    return;
  }

  // Pointer: drag along the baseline to place; pull back anywhere else to aim.
  const p = input.pointer;
  const bx = p.x - FRAME;
  const by = p.y - FRAME;
  if (p.pressed) {
    if (Math.abs(by - s.striker.y) < 20 && Math.abs(bx - a.x) < 40) a.drag = 'place';
    else {
      a.drag = 'aim';
      a.startX = bx;
      a.startY = by;
      a.power = 0;
    }
  }
  if (p.down && a.drag === 'place') a.x = clampX(bx);
  if (p.down && a.drag === 'aim') {
    const dx = a.startX - bx;
    const dy = a.startY - by;
    const len = Math.hypot(dx, dy);
    if (len > 6) {
      a.angle = clampAim(Math.atan2(dy, dx), c);
      a.power = Math.min(1, (len - 6) / 130);
    } else a.power = 0;
  }
  if (p.released) {
    const drag = a.drag;
    a.drag = null;
    s.striker.x = a.x;
    if (drag === 'aim' && a.power > 0.04) {
      shoot(s);
      return;
    }
    if (drag === 'aim') a.power = 0;
  }
  s.striker.x = a.x;
}

function angleLerp(a: number, b: number, t: number): number {
  let d = b - a;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d < -Math.PI) d += 2 * Math.PI;
  return a + d * t;
}

function endShot(s: State) {
  const me = s.board.turn;
  const res = resolveShot(s.board, s.shot.pocketed, s.shot.strikerIn, [s.striker]);
  res.notes.forEach((n) => note(s, n));
  if (res.foul) {
    sound(s, 'failure');
    if (!isCpu(s, me)) s.stats.fouls++;
  } else if (res.covered) sound(s, 'success');
  const human = s.mode === 'local' || me === 'white';
  if (human) s.stats.best = Math.max(s.stats.best, res.kept + (res.queenIn ? 1 : 0));
  if (me === 'white') {
    s.playerScore += res.kept * 100 + (res.covered ? 300 : 0);
    if (res.covered) s.stats.queen = true;
  } else if (res.covered && s.mode === 'local') s.stats.queen = true;
  if (s.board.winner) {
    const w = s.board.winner;
    note(s, `${label(s, w)} ${s.mode === 'ai' && w === 'white' ? 'win' : 'wins'} the board! +${s.board.points} points`);
    if (w === 'white') s.playerScore += 500 + s.board.points * 50;
    s.won = s.mode === 'ai' ? w === 'white' : null;
    s.score = s.playerScore;
    s.phase = 'end';
    s.timer = 1.8;
    return;
  }
  s.score = s.playerScore;
  s.phase = 'pause';
  s.timer = res.notes.length ? 1.1 : 0.45;
  if (s.board.turn === me && !res.foul) note(s, `${label(s, me)} ${me === 'white' && s.mode === 'ai' ? 'go' : 'goes'} again`);
}

export function update(s: State, dt: number, input: Input, random: () => number) {
  for (const n of s.notes) n.t -= dt;
  s.notes = s.notes.filter((n) => n.t > 0);
  s.invalid = Math.max(0, s.invalid - dt);

  switch (s.phase) {
    case 'aim':
      humanAim(s, dt, input);
      break;
    case 'think':
      s.timer -= dt;
      if (s.timer <= 0) {
        const shot = chooseShot(s.board, s.board.turn, s.difficulty, random);
        s.cpu = { shot, fromX: s.striker.x, fromAngle: s.aim.angle, t: 0 };
        s.phase = 'cpu-aim';
      }
      break;
    case 'cpu-aim': {
      const c = s.cpu!;
      c.t = Math.min(1, c.t + dt / 0.8);
      const e = c.t * c.t * (3 - 2 * c.t);
      s.aim.x = c.fromX + (c.shot.x - c.fromX) * e;
      s.striker.x = s.aim.x;
      s.aim.angle = angleLerp(c.fromAngle, c.shot.angle, e);
      if (c.t >= 1) s.phase = 'cpu-power';
      break;
    }
    case 'cpu-power': {
      const c = s.cpu!;
      s.aim.power = Math.min(c.shot.power, s.aim.power + dt / 0.5);
      if (s.aim.power >= c.shot.power) shoot(s);
      break;
    }
    case 'moving': {
      const events: PhysEvent[] = [];
      const still = !advance(s.all, Math.min(dt, 1 / 20), events);
      for (const e of events) {
        if (e.type === 'pocket') {
          if (e.a === s.striker) s.shot.strikerIn = true;
          else s.shot.pocketed.push(e.a);
          sound(s, 'pop');
        } else if (e.type === 'hit' && e.speed > 120) sound(s, 'blip');
      }
      if (still) endShot(s);
      break;
    }
    case 'pause':
      s.timer -= dt;
      if (s.timer <= 0) startTurn(s);
      break;
    case 'end':
      s.timer -= dt;
      if (s.timer <= 0) s.over = true;
      break;
  }
}

export function coinsLeft(s: State, c: Color) {
  return onBoard(s.board, c);
}

export function pocketedOf(s: State, c: Color) {
  return pocketedCount(s.board, c);
}

export { COINS, other };
