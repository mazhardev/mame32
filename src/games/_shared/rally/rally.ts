import type { SoundName } from '@/services/audio';
import { clamp } from '../arcade/kit';

/**
 * Shared rally engine for net games seen from above (table tennis, tennis).
 * The ball flies in 3D (x across, y along the court, z height) while players
 * move on the ground. Player 0 is the human at the bottom (+y), player 1 the
 * computer at the top (−y); the net sits at y = 0.
 *
 * Rules applied to every shot:
 * - a shot that meets the net below its height loses the point for the hitter;
 * - the first bounce after a shot must land in the receiver's half, else the
 *   hitter loses the point;
 * - a second bounce before the receiver plays the ball wins the point for the
 *   hitter.
 */

export type Side = 0 | 1;

export interface Court {
  /** In-bounds width and baseline-to-baseline length (metres). */
  width: number;
  length: number;
  netHeight: number;
  gravity: number;
  /** Vertical restitution on a bounce. */
  bounce: number;
  /** Fraction of horizontal speed kept on a bounce. */
  grip: number;
  /** Whether a ball may be played before it bounces (tennis volleys). */
  volleys: boolean;
  /** Horizontal distance from a player at which the ball can be struck. */
  reach: number;
  /** Highest ball a player can strike. */
  hitHeight: number;
  playerSpeed: number;
  /** Players may move towards and away from the net (tennis). */
  depthMove: boolean;
  /** Where players wait, measured behind their baseline. */
  home: number;
  /** How far behind the baseline players may go. */
  roam: number;
  /** Seconds a normal shot takes to land. */
  flight: number;
  /** Height the ball is struck from on a serve. */
  serveZ: number;
}

export interface RallyBall {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  lastHitter: Side | null;
  /** Bounces since the last shot. */
  bounces: number;
  /** Where the current shot is expected to land, for the guide marker. */
  landX: number;
  landY: number;
}

export interface Player {
  x: number;
  y: number;
  /** Seconds left of the swing animation. */
  swing: number;
}

export interface AiSkill {
  /** Movement speed as a fraction of the court's player speed. */
  speed: number;
  /** Chance that a shot goes out or into the net. */
  error: number;
  /** Seconds before the computer starts moving after your shot. */
  reaction: number;
  /** Flight-time multiplier for its shots (lower is faster). */
  pace: number;
  /** How hard it aims away from you (0 = random, 1 = always the far side). */
  placement: number;
}

export interface Control {
  /** Desired movement direction, each −1…1. */
  mx: number;
  my: number;
  /** World point to walk towards instead (pointer / touch). */
  target: { x: number; y: number } | null;
  /** Shot steering held at contact: −1 left, 1 right. */
  steer: number;
  /** −1 short, 0 normal, 1 deep. */
  depth: number;
  serve: boolean;
}

export interface Rally {
  court: Court;
  ball: RallyBall;
  players: [Player, Player];
  server: Side;
  phase: 'serve' | 'play' | 'point';
  phaseT: number;
  lastPoint: { winner: Side; reason: string } | null;
  ai: AiSkill;
  aiWait: number;
  aiGoal: { x: number; y: number } | null;
  /** Shots in the current rally and the longest rally so far. */
  shots: number;
  longest: number;
  /** Shots you struck that landed in. */
  winners: number;
  events: SoundName[];
}

export const dirOf = (p: Side) => (p === 0 ? 1 : -1);
export const other = (p: Side): Side => (p === 0 ? 1 : 0);

export function emptyControl(): Control {
  return { mx: 0, my: 0, target: null, steer: 0, depth: 0, serve: false };
}

export function createRally(court: Court, ai: AiSkill, server: Side = 0): Rally {
  const r: Rally = {
    court,
    ball: { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, lastHitter: null, bounces: 0, landX: 0, landY: 0 },
    players: [
      { x: 0, y: 0, swing: 0 },
      { x: 0, y: 0, swing: 0 },
    ],
    server,
    phase: 'serve',
    phaseT: 0,
    lastPoint: null,
    ai,
    aiWait: 0,
    aiGoal: null,
    shots: 0,
    longest: 0,
    winners: 0,
    events: [],
  };
  resetForServe(r, server);
  return r;
}

export function homeY(court: Court, p: Side): number {
  return dirOf(p) * (court.length / 2 + court.home);
}

export function resetForServe(r: Rally, server: Side) {
  r.server = server;
  r.phase = 'serve';
  r.phaseT = 0;
  r.shots = 0;
  r.aiGoal = null;
  for (const p of [0, 1] as Side[]) {
    r.players[p].x = 0;
    r.players[p].y = homeY(r.court, p);
    r.players[p].swing = 0;
  }
  holdBall(r);
}

function holdBall(r: Rally) {
  const p = r.players[r.server];
  const b = r.ball;
  b.x = p.x + 0.35 * r.court.reach;
  b.y = p.y - dirOf(r.server) * 0.1;
  b.z = r.court.serveZ;
  b.vx = b.vy = b.vz = 0;
  b.lastHitter = null;
  b.bounces = 0;
}

function inBounds(court: Court, x: number, y: number) {
  return Math.abs(x) <= court.width / 2 && Math.abs(y) <= court.length / 2;
}

/**
 * Strikes the ball towards (tx, ty), picking a vertical speed that lands it
 * there after `time` seconds. If that arc would clip the net, the flight is
 * lengthened until it clears (unless `intoNet` asks for a deliberate error).
 */
export function strike(r: Rally, who: Side, tx: number, ty: number, time: number, intoNet = false) {
  const b = r.ball;
  const g = r.court.gravity;
  let t = time;
  for (let i = 0; i < 12; i++) {
    const vy = (ty - b.y) / t;
    const vz = (-b.z + 0.5 * g * t * t) / t;
    const tn = vy !== 0 ? -b.y / vy : -1;
    const zn = tn > 0 && tn < t ? b.z + vz * tn - 0.5 * g * tn * tn : Infinity;
    if (intoNet || zn > r.court.netHeight * 1.25) break;
    t *= 1.1;
  }
  b.vx = (tx - b.x) / t;
  b.vy = (ty - b.y) / t;
  b.vz = (-b.z + 0.5 * g * t * t) / t;
  if (intoNet && b.vy !== 0) {
    // Aim the arc at half the net's height instead.
    const tn = -b.y / b.vy;
    if (tn > 0) b.vz = (r.court.netHeight * 0.5 - b.z + 0.5 * g * tn * tn) / tn;
  }
  b.landX = tx;
  b.landY = ty;
  b.lastHitter = who;
  b.bounces = 0;
  r.players[who].swing = 0.25;
  r.shots += 1;
  r.longest = Math.max(r.longest, r.shots);
  r.events.push('hit');
}

/** Can `who` play the ball right now? */
export function canHit(r: Rally, who: Side): boolean {
  const b = r.ball;
  if (b.lastHitter === who || b.lastHitter === null) return false;
  const d = dirOf(who);
  if (Math.sign(b.y) !== d || Math.sign(b.vy) !== d) return false;
  if (b.bounces === 0 && !r.court.volleys) return false;
  if (b.bounces > 1 || b.z > r.court.hitHeight) return false;
  const p = r.players[who];
  return Math.hypot(b.x - p.x, (b.y - p.y) * 0.8) <= r.court.reach;
}

/**
 * Advances the ball and applies the rules. Returns the point winner when the
 * point ends.
 */
export function stepBall(r: Rally, dt: number): { winner: Side; reason: string } | null {
  const b = r.ball;
  const c = r.court;
  if (b.lastHitter === null) return null;
  const hitter = b.lastHitter;
  const receiver = other(hitter);
  const prevY = b.y;
  b.vz -= c.gravity * dt;
  b.x += b.vx * dt;
  b.y += b.vy * dt;
  b.z += b.vz * dt;

  // Crossing the net plane.
  if (Math.sign(prevY) !== Math.sign(b.y) && prevY !== 0 && Math.abs(b.x) < c.width / 2 + 0.6) {
    if (b.z < c.netHeight) {
      b.vy *= -0.15;
      b.y = prevY;
      return { winner: receiver, reason: 'Into the net' };
    }
  }

  if (b.z <= 0 && b.vz < 0) {
    b.z = 0;
    b.vz = -b.vz * c.bounce;
    b.vx *= c.grip;
    b.vy *= c.grip;
    r.events.push('blip');
    if (b.bounces === 0) {
      const onReceiverSide = Math.sign(b.y) === dirOf(receiver);
      if (!onReceiverSide || !inBounds(c, b.x, b.y)) {
        return { winner: receiver, reason: onReceiverSide ? 'Out' : 'Wrong side' };
      }
      b.bounces = 1;
    } else {
      return { winner: hitter, reason: hitter === 0 ? 'Winner!' : 'Missed it' };
    }
  }
  return null;
}

/**
 * Where should `who` stand to play the ball? Simulates the flight forward and
 * returns the first moment it becomes playable near the player's depth.
 */
export function predictIntercept(r: Rally, who: Side): { x: number; y: number } | null {
  const c = r.court;
  const sim: Rally = { ...r, ball: { ...r.ball }, events: [] };
  const b = sim.ball;
  const d = dirOf(who);
  const idealDepth = d * (c.length / 2 + c.home * 0.4);
  let best: { x: number; y: number; score: number } | null = null;
  for (let i = 0; i < 400; i++) {
    if (stepBall(sim, 1 / 120)) break;
    const playable =
      Math.sign(b.y) === d &&
      Math.sign(b.vy) === d &&
      (b.bounces === 1 || (c.volleys && Math.abs(b.y) > c.length * 0.3)) &&
      b.z <= c.hitHeight * 0.9;
    if (!playable) continue;
    const score = Math.abs(b.y - idealDepth) + (b.bounces === 0 ? 1.5 : 0);
    if (!best || score < best.score) best = { x: b.x, y: b.y, score };
  }
  return best && { x: best.x, y: best.y + d * c.reach * 0.3 };
}

function movePlayer(r: Rally, who: Side, dx: number, dy: number, speed: number, dt: number) {
  const c = r.court;
  const p = r.players[who];
  const len = Math.hypot(dx, dy);
  if (len > 1e-6) {
    const k = Math.min(1, len) / len;
    p.x += dx * k * speed * dt;
    if (c.depthMove) p.y += dy * k * speed * dt;
  }
  const d = dirOf(who);
  const limitX = c.width / 2 + c.roam;
  p.x = clamp(p.x, -limitX, limitX);
  const near = c.depthMove ? 0.8 : c.length / 2 + c.home * 0.5;
  const far = c.length / 2 + c.roam;
  p.y = d > 0 ? clamp(p.y, near, far) : clamp(p.y, -far, -near);
}

function walkTowards(r: Rally, who: Side, x: number, y: number, speed: number, dt: number) {
  const p = r.players[who];
  const dx = x - p.x;
  const dy = r.court.depthMove ? y - p.y : 0;
  const dist = Math.hypot(dx, dy);
  if (dist < 0.02) return;
  const k = Math.min(1, dist / (speed * dt));
  movePlayer(r, who, (dx / dist) * k, (dy / dist) * k, speed, dt);
}

function humanShot(r: Rally, control: Control, random: () => number) {
  const c = r.court;
  const b = r.ball;
  const p = r.players[0];
  const offset = clamp((b.x - p.x) / c.reach, -1, 1);
  const aim = clamp(offset * 0.6 + control.steer * 0.9, -1.2, 1.2);
  const depth = control.depth > 0 ? 0.88 : control.depth < 0 ? 0.42 : 0.7;
  let tx = aim * (c.width / 2) * 0.85;
  let ty = -(c.length / 2) * (depth + (random() - 0.5) * 0.12);
  // Catching the ball on the very edge of the racket is risky.
  if (Math.abs(offset) > 0.9 && random() < 0.35) {
    tx = Math.sign(offset) * c.width * (0.55 + random() * 0.2);
    ty -= c.length * 0.05;
  }
  const time = c.flight * (control.depth < 0 ? 1.1 : 1);
  strike(r, 0, tx, ty, time);
}

function aiShot(r: Rally, random: () => number) {
  const c = r.court;
  const you = r.players[0];
  const away = you.x > 0 ? -1 : 1;
  const side = random() < r.ai.placement ? away : random() < 0.5 ? -1 : 1;
  let tx = side * (0.25 + random() * 0.6) * (c.width / 2);
  let ty = (c.length / 2) * (0.5 + random() * 0.42);
  const time = c.flight * r.ai.pace * (0.9 + random() * 0.25);
  if (random() < r.ai.error) {
    const kind = random();
    if (kind < 0.35) strike(r, 1, tx, ty, time, true);
    else {
      if (kind < 0.7) tx = side * c.width * (0.56 + random() * 0.15);
      else ty = (c.length / 2) * (1.08 + random() * 0.12);
      strike(r, 1, tx, ty, time);
    }
    return;
  }
  strike(r, 1, tx, ty, time);
}

/** Serves: from the server's position deep into the other half. */
function serve(r: Rally, steer: number, random: () => number) {
  const c = r.court;
  const d = dirOf(r.server);
  const aim = r.server === 0 ? steer * 0.6 : (random() - 0.5) * 1.1;
  const tx = aim * (c.width / 2) * 0.8;
  const ty = -d * (c.length / 2) * (0.55 + random() * 0.2);
  strike(r, r.server, tx, ty, c.flight * 1.1 * (r.server === 1 ? r.ai.pace : 1));
  r.shots = 0;
  r.phase = 'play';
  r.aiWait = r.server === 0 ? r.ai.reaction : 0;
}

/**
 * Advances the rally by dt. Returns the point result when a point ends; the
 * caller updates the score and calls `resetForServe` after `pointPause`.
 */
export function updateRally(
  r: Rally,
  dt: number,
  control: Control,
  random: () => number,
): { winner: Side; reason: string } | null {
  const c = r.court;
  r.players.forEach((p) => (p.swing = Math.max(0, p.swing - dt)));
  r.phaseT += dt;

  // You.
  if (control.target) walkTowards(r, 0, control.target.x, control.target.y, c.playerSpeed, dt);
  else movePlayer(r, 0, control.mx, control.my, c.playerSpeed, dt);

  if (r.phase === 'point') return null;

  if (r.phase === 'serve') {
    holdBall(r);
    if (r.server === 0 && control.serve) serve(r, control.steer, random);
    else if (r.server === 1 && r.phaseT > 1) serve(r, 0, random);
    return null;
  }

  // Computer: chase the predicted contact point, else drift back to the middle.
  const ball = r.ball;
  if (ball.lastHitter === 0) {
    r.aiWait -= dt;
    if (r.aiWait <= 0) {
      if (!r.aiGoal || r.phaseT % 0.2 < dt) r.aiGoal = predictIntercept(r, 1);
      const goal = r.aiGoal ?? { x: 0, y: homeY(c, 1) };
      walkTowards(r, 1, goal.x, goal.y, c.playerSpeed * r.ai.speed, dt);
    }
  } else {
    r.aiGoal = null;
    walkTowards(r, 1, ball.x * 0.3, homeY(c, 1), c.playerSpeed * r.ai.speed * 0.6, dt);
  }

  const result = stepBall(r, dt);
  if (result) return endPoint(r, result);

  if (canHit(r, 0)) {
    humanShot(r, control, random);
    r.aiWait = r.ai.reaction;
  } else if (canHit(r, 1)) {
    aiShot(r, random);
  }
  return null;
}

function endPoint(r: Rally, result: { winner: Side; reason: string }) {
  r.phase = 'point';
  r.phaseT = 0;
  r.lastPoint = result;
  if (result.winner === 0 && r.ball.lastHitter === 0) r.winners += 1;
  r.events.push(result.winner === 0 ? 'success' : 'failure');
  return result;
}
