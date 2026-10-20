import type { DifficultySetting } from '@/types';
import { BASE, BASE_HALF, L, PHYS, POCKETS, R_STRIKER, disc, powerFor, settle, speedFor } from './physics';
import type { Disc, PhysEvent } from './physics';
import { cloneBoard, other, pocketedCount, resolveShot } from './rules';
import type { Board, Color } from './rules';

/**
 * The computer player. It lists direct "ghost-ball" shots — for each of its
 * coins and each pocket, the striker position and angle that send the coin
 * straight in — ranks them by how clean the cut is, then plays out the best
 * few with the real physics and keeps the one with the best result. Lower
 * difficulties look at fewer shots and aim less precisely.
 */
export interface Shot {
  x: number;
  angle: number;
  power: number;
}

interface Candidate extends Shot {
  h: number;
}

const SKILL: Record<DifficultySetting, { sims: number; angle: number; power: number; blunder: number }> = {
  easy: { sims: 5, angle: 0.05, power: 0.2, blunder: 0.3 },
  normal: { sims: 14, angle: 0.017, power: 0.08, blunder: 0.06 },
  hard: { sims: 30, angle: 0.004, power: 0.03, blunder: 0 },
};

export const baseY = (c: Color) => (c === 'white' ? L - BASE : BASE);
export const MIN_X = L / 2 - BASE_HALF;
export const MAX_X = L / 2 + BASE_HALF;

/** The striker may sit at (x, y) without touching a coin. */
export function strikerFits(discs: Disc[], x: number, y: number): boolean {
  return discs.every((d) => !d.on || (d.x - x) ** 2 + (d.y - y) ** 2 >= (d.r + R_STRIKER + 0.5) ** 2);
}

/** No coin (other than those in `skip`) lies within `r` of the segment a→b. */
function clear(ax: number, ay: number, bx: number, by: number, r: number, discs: Disc[], skip: Disc): boolean {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy || 1;
  for (const d of discs) {
    if (!d.on || d === skip) continue;
    const t = Math.max(0, Math.min(1, ((d.x - ax) * dx + (d.y - ay) * dy) / len2));
    const cx = ax + dx * t;
    const cy = ay + dy * t;
    if ((d.x - cx) ** 2 + (d.y - cy) ** 2 < (r + d.r) ** 2) return false;
  }
  return true;
}

/** Keeps a shot heading away from the shooter's own edge. */
export function clampAim(angle: number, c: Color): number {
  const fwd = c === 'white' ? -1 : 1;
  let dx = Math.cos(angle);
  let dy = Math.sin(angle);
  if (dy * fwd < 0.12) {
    dy = 0.12 * fwd;
    dx = (dx < 0 ? -1 : 1) * Math.sqrt(1 - 0.0144);
  }
  return Math.atan2(dy, dx);
}

const FRICTION = PHYS.friction * 1.2;
const TRANSFER = ((1 + PHYS.eDisc) * 2.6) / 3.6;

function candidates(b: Board, me: Color): Candidate[] {
  const y = baseY(me);
  const fwd = me === 'white' ? -1 : 1;
  const out: Candidate[] = [];
  const xs: number[] = [];
  for (let k = 0; k <= 24; k++) xs.push(MIN_X + (k * (MAX_X - MIN_X)) / 24);
  const targets = b.discs.filter((d) => d.on && (d.kind === me || (d.kind === 'queen' && b.queen === 'board' && pocketedCount(b, me) > 0)));
  for (const t of targets) {
    for (const [px, py] of POCKETS) {
      const dist = Math.hypot(px - t.x, py - t.y);
      const tx = (px - t.x) / dist;
      const ty = (py - t.y) / dist;
      if (!clear(t.x, t.y, px, py, t.r * 0.95, b.discs, t)) continue;
      const gx = t.x - tx * (t.r + R_STRIKER);
      const gy = t.y - ty * (t.r + R_STRIKER);
      const spots = xs.slice();
      // Where a dead-straight shot would start from, if the line reaches the baseline.
      if (ty * fwd > 0.05) spots.push(gx - tx * ((gy - y) / ty));
      for (const x0 of spots) {
        const x = Math.max(MIN_X, Math.min(MAX_X, x0));
        if (!strikerFits(b.discs, x, y)) continue;
        const sd = Math.hypot(gx - x, gy - y);
        const sx = (gx - x) / sd;
        const sy = (gy - y) / sd;
        if (sy * fwd < 0.12) continue;
        const cos = sx * tx + sy * ty;
        if (cos < 0.3) continue;
        if (!clear(x, y, gx, gy, R_STRIKER * 0.95, b.discs, t)) continue;
        const coin = Math.sqrt(2 * FRICTION * dist) + 70;
        const impact = coin / (TRANSFER * cos);
        const launch = Math.sqrt(impact * impact + 2 * FRICTION * sd);
        if (launch > PHYS.maxSpeed * 1.05) continue;
        const h = (cos * cos * (t.kind === 'queen' ? 1.3 : 1)) / (1 + (sd + dist) / 380);
        out.push({ x, angle: Math.atan2(sy, sx), power: powerFor(launch * 1.06), h });
      }
    }
  }
  out.sort((a, c) => c.h - a.h);
  return out;
}

/** Plays a shot out on a copy of the board and scores the result for `me`. */
export function evaluate(b: Board, me: Color, shot: Shot): number {
  const bb = cloneBoard(b);
  bb.turn = me;
  const s = disc(-1, 'striker', shot.x, baseY(me));
  const sp = speedFor(shot.power);
  s.vx = Math.cos(shot.angle) * sp;
  s.vy = Math.sin(shot.angle) * sp;
  const events: PhysEvent[] = [];
  settle([...bb.discs, s], events, 10);
  const pocketed = events.filter((e) => e.type === 'pocket' && e.a.kind !== 'striker').map((e) => e.a);
  const res = resolveShot(bb, pocketed, !s.on, [s]);
  if (bb.winner === me) return 1000;
  if (bb.winner === other(me)) return -1000;
  let v = res.kept * 10 - res.theirs * 6 + (res.covered ? 14 : 0) + (bb.queen === 'pending' ? 6 : 0);
  if (res.foul) v -= 15;
  if (res.keepTurn) v += 3;
  // Coins sitting near pockets are easy next shots — good for whoever shoots next.
  for (const d of bb.discs) {
    if (!d.on || d.kind === 'queen') continue;
    const near = Math.min(...POCKETS.map(([px, py]) => Math.hypot(px - d.x, py - d.y)));
    const w = Math.max(0, 1 - near / 90);
    if (d.kind === me) v += 1.5 * w;
    else if (!res.keepTurn) v -= 1.2 * w;
  }
  return v;
}

function gauss(random: () => number): number {
  const u = Math.max(1e-9, random());
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * random());
}

/** The computer's shot for colour `me`. */
export function chooseShot(b: Board, me: Color, level: DifficultySetting, random: () => number): Shot {
  const skill = SKILL[level];
  const y = baseY(me);
  const fwd = me === 'white' ? -1 : 1;
  const list: Shot[] = candidates(b, me).slice(0, skill.sims);
  // A few spreading shots in case nothing goes straight in.
  for (let k = 0; k < 4; k++) {
    let x = MIN_X + random() * (MAX_X - MIN_X);
    for (let tries = 0; tries < 20 && !strikerFits(b.discs, x, y); tries++) x = MIN_X + random() * (MAX_X - MIN_X);
    const tx = L / 2 + (random() - 0.5) * 120;
    const ty = L / 2 + (random() - 0.5) * 120;
    list.push({ x, angle: clampAim(Math.atan2(ty - y, tx - x), me), power: 0.55 + random() * 0.4 });
  }
  const scored = list
    .filter((s) => strikerFits(b.discs, s.x, y))
    .map((s) => ({ s, v: evaluate(b, me, s) }))
    .sort((a, c) => c.v - a.v);
  let pick = scored[0]?.s ?? { x: L / 2, angle: fwd < 0 ? -Math.PI / 2 : Math.PI / 2, power: 0.8 };
  if (scored.length > 1 && random() < skill.blunder) pick = scored[Math.min(scored.length - 1, 1 + Math.floor(random() * 4))].s;
  return {
    x: pick.x,
    angle: clampAim(pick.angle + gauss(random) * skill.angle, me),
    power: Math.max(0.05, Math.min(1, pick.power * (1 + gauss(random) * skill.power))),
  };
}
