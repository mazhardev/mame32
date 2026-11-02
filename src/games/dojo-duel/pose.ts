import { movePhase } from './engine';
import type { Fighter } from './engine';
import type { Pose as MovePose } from './moves';

/**
 * Fighter poses. A pose places the hips, the lean of the torso and the four
 * hands and feet in the fighter's own frame (x forward, y up from the
 * floor); elbows and knees are solved with two-bone inverse kinematics when
 * drawing. Each state blends between a few key poses over its frames.
 */
export type P2 = [number, number];

export interface Pose {
  hip: P2;
  lean: number;
  footF: P2;
  footB: P2;
  handF: P2;
  handB: P2;
  /** Whole-body rotation about the hips (tumbling). */
  rot: number;
  /** Eyes shut (knocked out). */
  out?: boolean;
}

export const THIGH = 22;
export const SHIN = 22;
export const TORSO = 30;
export const UPPER = 17;
export const FORE = 16;
export const HEAD_R = 9.5;

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const lp = (a: P2, b: P2, t: number): P2 => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];

export function blend(a: Pose, b: Pose, t: number): Pose {
  const k = Math.max(0, Math.min(1, t));
  return {
    hip: lp(a.hip, b.hip, k),
    lean: lerp(a.lean, b.lean, k),
    footF: lp(a.footF, b.footF, k),
    footB: lp(a.footB, b.footB, k),
    handF: lp(a.handF, b.handF, k),
    handB: lp(a.handB, b.handB, k),
    rot: lerp(a.rot, b.rot, k),
    out: k < 0.5 ? a.out : b.out,
  };
}

const pose = (hip: P2, lean: number, footF: P2, footB: P2, handF: P2, handB: P2, rot = 0): Pose => ({ hip, lean, footF, footB, handF, handB, rot });

export const STANCE = pose([0, 40], 0.06, [13, 0], [-13, 0], [17, 60], [9, 64]);
const CROUCH = pose([0, 24], 0.3, [16, 0], [-14, 0], [20, 44], [12, 46]);
const AIR = pose([0, 40], 0.1, [9, 20], [-8, 15], [15, 62], [6, 60]);
const BLOCK = pose([-2, 40], -0.08, [12, 0], [-14, 0], [12, 67], [10, 61]);
const CBLOCK = pose([-1, 24], 0.18, [15, 0], [-14, 0], [15, 48], [12, 44]);
const HIT = pose([-5, 39], -0.42, [12, 0], [-15, 0], [-8, 52], [-15, 47]);
const DOWN = pose([6, 7], -1.48, [40, 3], [35, 8], [-30, 6], [-24, 12]);
const WIN = pose([0, 40], -0.02, [11, 0], [-11, 0], [7, 102], [8, 50]);

/** Key poses for a move: wind-up, the blow, and how it ends. */
function movePoses(kind: MovePose, t: number, base: Pose): [Pose, Pose] {
  switch (kind) {
    case 'punch':
      return [pose([0, 40], 0.02, [13, 0], [-13, 0], [9, 61], [10, 64]), pose([3, 40], 0.16, [15, 0], [-12, 0], [41, 62], [8, 58])];
    case 'kick':
      return [pose([0, 41], -0.05, [8, 26], [-10, 0], [12, 62], [2, 60]), pose([-3, 42], -0.28, [47, 44], [-9, 0], [-2, 62], [-12, 58])];
    case 'cpunch':
      return [CROUCH, pose([2, 24], 0.32, [16, 0], [-14, 0], [37, 37], [10, 44])];
    case 'ckick':
      return [CROUCH, pose([-2, 22], -0.05, [55, 4], [-12, 0], [10, 40], [-6, 30])];
    case 'jpunch':
      return [AIR, pose([0, 40], 0.25, [8, 20], [-8, 16], [31, 34], [4, 58])];
    case 'jkick':
      return [AIR, pose([0, 40], -0.2, [35, 4], [-4, 22], [10, 60], [-6, 56])];
    case 'throw':
      return [pose([3, 40], 0.25, [15, 0], [-12, 0], [31, 58], [27, 52]), pose([-4, 40], -0.3, [12, 0], [-15, 0], [-10, 70], [-6, 64])];
    case 'push':
      return [pose([-2, 38], 0.0, [15, 0], [-13, 0], [-6, 46], [-8, 44]), pose([3, 38], 0.22, [19, 0], [-13, 0], [37, 55], [33, 50])];
    case 'rise':
      return [CROUCH, pose([0, 46], -0.06, [7, 20], [-7, 4], [13, 104], [-6, 58])];
    case 'rush':
      return [pose([-3, 38], 0.1, [13, 0], [-15, 0], [4, 58], [-2, 60]), pose([5, 37], 0.46, [21, 0], [-22, 5], [45, 57], [-5, 50])];
    case 'spin': {
      const side = Math.floor(t / 5) % 2 === 0;
      return [
        pose([0, 44], 0, [10, 18], [-10, 4], [24, 70], [-22, 70]),
        side
          ? pose([0, 46], -0.15, [43, 47], [-6, 6], [-18, 72], [18, 72])
          : pose([0, 46], 0.15, [6, 6], [-43, 47], [20, 72], [-20, 72]),
      ];
    }
    case 'grab':
      return [pose([2, 40], 0.22, [15, 0], [-12, 0], [31, 59], [29, 53]), pose([-2, 41], -0.2, [12, 0], [-14, 0], [16, 76], [12, 72])];
    case 'vanish':
      return [base, base];
    case 'dive':
      return [AIR, pose([0, 40], -0.32, [31, -9], [-6, 18], [12, 62], [-8, 58])];
    case 'slide':
      return [CROUCH, pose([0, 14], -0.65, [51, 4], [20, 6], [7, 30], [-26, 4])];
    case 'stomp':
      return [pose([0, 42], -0.05, [14, 32], [-12, 0], [22, 70], [-16, 70]), pose([0, 34], 0.2, [16, 0], [-14, 0], [26, 36], [-22, 38])];
    case 'burst':
      return [CROUCH, pose([0, 42], -0.12, [16, 0], [-16, 0], [26, 80], [-22, 80])];
    case 'hammer':
      return [pose([0, 42], -0.1, [10, 16], [-10, 12], [10, 100], [4, 98]), pose([0, 40], 0.4, [12, 8], [-10, 4], [37, 30], [33, 34])];
    case 'flurry': {
      const alt = Math.floor(t / 3) % 2 === 0;
      return [
        pose([0, 39], 0.2, [16, 0], [-14, 0], [10, 60], [6, 58]),
        alt
          ? pose([4, 38], 0.32, [18, 0], [-15, 0], [43, 61], [10, 56])
          : pose([4, 38], 0.32, [18, 0], [-15, 0], [12, 58], [41, 53]),
      ];
    }
  }
}

/** The pose a fighter is in this frame. */
export function poseOf(f: Fighter, frame: number): Pose {
  const breathe = Math.sin(frame * 0.09 + f.side) * 1.1;
  switch (f.act) {
    case 'stand': {
      if (f.guarding) return BLOCK;
      const p = { ...STANCE, hip: [0, 40 + breathe] as P2, handF: [17, 60 + breathe] as P2, handB: [9, 64 + breathe] as P2 };
      return p;
    }
    case 'walk': {
      const ph = f.t * 0.2;
      const dir = Math.sign(f.vx) * f.face;
      return {
        ...STANCE,
        hip: [Math.sin(ph) * 1.5, 40 + Math.abs(Math.cos(ph)) * 1.5],
        footF: [13 + Math.sin(ph * dir) * 6, Math.max(0, Math.cos(ph)) * 4],
        footB: [-13 + Math.sin(ph * dir + Math.PI) * 6, Math.max(0, -Math.cos(ph)) * 4],
      };
    }
    case 'crouch':
      return f.guarding ? CBLOCK : CROUCH;
    case 'jump': {
      const rising = f.vy > 2;
      return rising ? blend(STANCE, AIR, Math.min(1, f.t / 6)) : AIR;
    }
    case 'block':
      return f.pad.down ? CBLOCK : BLOCK;
    case 'hit':
      return blend(HIT, STANCE, Math.max(0, (f.t - 8) / 12));
    case 'fall':
    case 'thrown': {
      const k = Math.min(1, f.t / 18);
      const p = blend(HIT, pose([0, 30], -0.6, [22, 14], [14, 20], [-26, 46], [-20, 52]), k);
      p.rot = f.act === 'thrown' ? -f.t * 0.12 : -k * 0.9;
      return p;
    }
    case 'down':
      return { ...DOWN };
    case 'ko':
      return { ...DOWN, out: true };
    case 'getup':
      return f.t < 10 ? blend(DOWN, CROUCH, f.t / 10) : blend(CROUCH, STANCE, (f.t - 10) / 10);
    case 'win':
      return blend(STANCE, WIN, Math.min(1, f.t / 12));
    case 'move': {
      const r = f.run;
      if (!r) return STANCE;
      const m = r.m;
      const air = !!m.air || f.y > 2;
      const base = air ? AIR : STANCE;
      const [wind, blow] = movePoses(m.pose, r.t, base);
      const ph = movePhase(r);
      if (ph === 'startup') return blend(base, wind, r.t / Math.max(1, m.startup));
      if (ph === 'active') return blend(wind, blow, Math.min(1, (r.t - m.startup) / 2));
      const into = r.t - m.startup - m.active;
      return blend(blow, base, into / Math.max(1, m.recovery));
    }
  }
}

/** Two-bone inverse kinematics: the middle joint for a limb reaching `to`. */
export function solveLimb(from: P2, to: P2, a: number, b: number, bend: 1 | -1): [P2, P2] {
  let dx = to[0] - from[0];
  let dy = to[1] - from[1];
  let d = Math.hypot(dx, dy);
  const max = a + b - 0.01;
  if (d > max) {
    dx = (dx / d) * max;
    dy = (dy / d) * max;
    d = max;
  }
  d = Math.max(d, 0.001);
  const base = Math.atan2(dy, dx);
  const c = Math.max(-1, Math.min(1, (a * a + d * d - b * b) / (2 * a * d)));
  const ang = base + bend * Math.acos(c);
  return [
    [from[0] + Math.cos(ang) * a, from[1] + Math.sin(ang) * a],
    [from[0] + dx, from[1] + dy],
  ];
}
