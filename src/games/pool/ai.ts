import { BOTTOM, HEAD_X, LEFT, MAX_SPEED, POCKETS, R, RIGHT, TOP, cloneBalls, freeSpot, simulateShot } from './physics';
import type { Ball } from './physics';
import { groupOf, judge, onTheEight } from './rules';
import type { Table } from './rules';

/**
 * Computer player: ghost-ball aiming. For every legal ball and pocket it finds
 * the spot the cue ball must reach, rejects blocked lines and extreme cuts,
 * then test-simulates the most promising shots and plays the best one that
 * actually pots a ball.
 */
export interface ShotPlan {
  angle: number;
  speed: number;
  target: number | null;
  score: number;
}

export interface Skill {
  /** Standard deviation of aiming error (radians). */
  aimError: number;
  /** Candidates verified by simulation (more = smarter). */
  lookahead: number;
}

const FRICTION = 150;

export function legalTargets(balls: Ball[], t: Table): number[] {
  const mine = t.groups[t.turn];
  const on = balls.filter((b) => !b.potted && b.n !== 0);
  if (onTheEight(t, t.turn)) return [8];
  if (mine === null) return on.filter((b) => b.n !== 8).map((b) => b.n);
  return on.filter((b) => groupOf(b.n) === mine).map((b) => b.n);
}

function segmentDistance(px: number, py: number, ax: number, ay: number, bx: number, by: number) {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2));
  return Math.hypot(px - (ax + dx * t), py - (ay + dy * t));
}

function clear(balls: Ball[], ax: number, ay: number, bx: number, by: number, ignore: number[]) {
  return balls.every((b) => b.potted || ignore.includes(b.n) || segmentDistance(b.x, b.y, ax, ay, bx, by) >= R * 2 - 0.5);
}

/** Geometric candidates, best first. */
export function candidates(balls: Ball[], t: Table, cue: { x: number; y: number }): ShotPlan[] {
  const out: ShotPlan[] = [];
  for (const n of legalTargets(balls, t)) {
    const tb = balls.find((b) => b.n === n);
    if (!tb) continue;
    POCKETS.forEach((p, pi) => {
      const dx = p.x - tb.x;
      const dy = p.y - tb.y;
      const d2 = Math.hypot(dx, dy);
      const ux = dx / d2;
      const uy = dy / d2;
      if ((pi === 1 || pi === 4) && Math.abs(uy) < 0.55) return;
      const gx = tb.x - ux * R * 2;
      const gy = tb.y - uy * R * 2;
      const d1 = Math.hypot(gx - cue.x, gy - cue.y);
      if (d1 < 1) return;
      const vx = (gx - cue.x) / d1;
      const vy = (gy - cue.y) / d1;
      const cos = vx * ux + vy * uy;
      if (cos < 0.3) return;
      if (!clear(balls, cue.x, cue.y, gx, gy, [0, n])) return;
      if (!clear(balls, tb.x, tb.y, p.x, p.y, [0, n])) return;
      const objectSpeed = Math.sqrt(2 * FRICTION * d2) * 1.25 + 90;
      const cueAtContact = objectSpeed / cos;
      const speed = Math.min(MAX_SPEED, Math.sqrt(cueAtContact ** 2 + 2 * FRICTION * d1) * 1.08);
      out.push({ angle: Math.atan2(vy, vx), speed, target: n, score: cos * cos * 100 - d1 * 0.04 - d2 * 0.05 });
    });
  }
  return out.sort((a, b) => b.score - a.score);
}

/** Simple fallback: roll the cue ball straight at the nearest legal ball. */
function safety(balls: Ball[], t: Table, cue: Ball): ShotPlan {
  const targets = legalTargets(balls, t)
    .map((n) => balls.find((b) => b.n === n))
    .filter((b): b is Ball => !!b)
    .sort((a, b) => Math.hypot(a.x - cue.x, a.y - cue.y) - Math.hypot(b.x - cue.x, b.y - cue.y));
  const tb = targets.find((b) => clear(balls, cue.x, cue.y, b.x, b.y, [0, b.n])) ?? targets[0];
  if (!tb) return { angle: 0, speed: 500, target: null, score: -1 };
  return { angle: Math.atan2(tb.y - cue.y, tb.x - cue.x), speed: 520, target: tb.n, score: -1 };
}

/** Picks a shot, verifying the best candidates by simulation. */
export function planShot(balls: Ball[], t: Table, skill: Skill): ShotPlan {
  const cue = balls.find((b) => b.n === 0);
  if (!cue) return { angle: 0, speed: 0, target: null, score: -1 };
  const list = candidates(balls, t, cue).slice(0, skill.lookahead);
  let best: ShotPlan | null = null;
  for (const c of list) {
    const sim = cloneBalls(balls);
    const log = simulateShot(sim, c.angle, c.speed);
    const v = judge({ ...t, remaining: balls.filter((b) => !b.potted && b.n !== 0).map((b) => b.n) }, log);
    const good = v.foul === null && (v.again || v.winner === t.turn);
    if (good && (!best || c.score > best.score)) best = c;
  }
  return best ?? list[0] ?? safety(balls, t, cue);
}

/** Ball in hand: try spots around the table and keep the one with the best shot. */
export function placeCueBall(balls: Ball[], t: Table, random: () => number, kitchen: boolean): { x: number; y: number } {
  let best = { x: HEAD_X, y: (TOP + BOTTOM) / 2, score: -Infinity };
  const maxX = kitchen ? HEAD_X : RIGHT - R;
  for (let i = 0; i < 60; i++) {
    const x = LEFT + R + random() * (maxX - LEFT - R);
    const y = TOP + R + random() * (BOTTOM - TOP - R * 2);
    if (!freeSpot(balls, x, y)) continue;
    const top = candidates(balls, t, { x, y })[0];
    const score = top ? top.score : -100;
    if (score > best.score) best = { x, y, score };
  }
  if (!freeSpot(balls, best.x, best.y)) {
    for (let x = LEFT + R; x < maxX; x += R) {
      if (freeSpot(balls, x, (TOP + BOTTOM) / 2)) return { x, y: (TOP + BOTTOM) / 2 };
    }
  }
  return { x: best.x, y: best.y };
}

export function gaussian(random: () => number): number {
  return Math.sqrt(-2 * Math.log(Math.max(1e-9, random()))) * Math.cos(2 * Math.PI * random());
}
