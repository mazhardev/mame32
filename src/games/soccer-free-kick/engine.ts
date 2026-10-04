/**
 * Free-kick physics. The ball starts at the origin; depth d runs towards the
 * goal line at d = dist, x is sideways (positive right) and z is height.
 * Spin produces a sideways Magnus force proportional to speed, so a curled
 * shot bends more early and less as it slows.
 */
export const GOAL_W = 7.32;
export const GOAL_H = 2.44;
export const BALL_R = 0.11;
export const WALL_D = 9.15;
const G = 9.81;
const DRAG = 0.015;
const MAGNUS = 0.22;

export interface Kick {
  /** Distance to the goal line and the goal's centre offset. */
  dist: number;
  goalX: number;
  /** Wall players' x positions. */
  wall: number[];
}

export interface Shot {
  speed: number;
  /** Radians: sideways angle and elevation. */
  yaw: number;
  pitch: number;
  /** −1…1: negative curls left, positive curls right. */
  spin: number;
}

export interface Flight {
  d: number;
  x: number;
  z: number;
  vd: number;
  vx: number;
  vz: number;
  t: number;
}

export function launch(s: Shot): Flight {
  const h = Math.cos(s.pitch) * s.speed;
  return {
    d: 0,
    x: 0,
    z: BALL_R,
    vd: Math.cos(s.yaw) * h,
    vx: Math.sin(s.yaw) * h,
    vz: Math.sin(s.pitch) * s.speed,
    t: 0,
  };
}

export function step(f: Flight, spin: number, dt: number, wind = 0) {
  const v = Math.hypot(f.vd, f.vx, f.vz);
  f.vd -= DRAG * v * f.vd * dt;
  f.vx -= DRAG * v * f.vx * dt;
  f.vz -= (DRAG * v * f.vz + G) * dt;
  // Magnus: sideways, perpendicular to the direction of travel along the ground.
  f.vx += spin * MAGNUS * v * dt * (f.vd / Math.max(1, Math.hypot(f.vd, f.vx)));
  f.vx += wind * dt;
  f.d += f.vd * dt;
  f.x += f.vx * dt;
  f.z += f.vz * dt;
  f.t += dt;
}

export type Result = 'goal' | 'saved' | 'wall' | 'post' | 'wide' | 'over' | 'short';

export interface KeeperCfg {
  /** Seconds before the keeper reacts (after the ball passes the wall). */
  reaction: number;
  speed: number;
  /** How far the keeper can stretch. */
  reach: number;
}

export interface Simulation {
  result: Result;
  path: Flight[];
  /** Where the ball crossed the goal line (or stopped). */
  at: { x: number; z: number; t: number };
  keeper: { x: number; z: number }[];
}

/**
 * Runs the whole kick: wall, then the keeper, then the goal frame.
 * The keeper moves towards where the ball will cross once it reacts.
 */
export function simulate(
  k: Kick,
  s: Shot,
  keeper: KeeperCfg,
  wallHeight: number,
  wind = 0,
): Simulation {
  const f = launch(s);
  const path: Flight[] = [{ ...f }];
  // The keeper shades towards the far post; the wall covers the near one.
  const kp = { x: k.goalX + Math.sign(k.goalX) * Math.min(1, Math.abs(k.goalX) / 4) * 0.8, z: 1 };
  const keeperPath: { x: number; z: number }[] = [{ ...kp }];
  const dt = 1 / 240;
  let passedWall = false;
  let reactAt = Infinity;
  for (let i = 0; i < 240 * 4; i++) {
    const prevD = f.d;
    step(f, s.spin, dt, wind);
    if (!passedWall && prevD < WALL_D && f.d >= WALL_D) {
      passedWall = true;
      reactAt = f.t + keeper.reaction;
      if (f.z < wallHeight && k.wall.some((wx) => Math.abs(wx - f.x) < 0.32 + BALL_R)) {
        path.push({ ...f });
        return { result: 'wall', path, at: { x: f.x, z: f.z, t: f.t }, keeper: keeperPath };
      }
    }
    if (f.t >= reactAt) {
      // Predict the crossing point with a straight-line guess and move there.
      const tLeft = Math.max(0.01, (k.dist - f.d) / Math.max(1, f.vd));
      const tx = f.x + f.vx * tLeft;
      const tz = Math.max(0.3, Math.min(GOAL_H, f.z + f.vz * tLeft - 0.5 * G * tLeft * tLeft));
      const dx = tx - kp.x;
      const dz = tz - kp.z;
      const dd = Math.hypot(dx, dz);
      const move = Math.min(dd, keeper.speed * dt);
      if (dd > 0) {
        kp.x += (dx / dd) * move;
        kp.z += (dz / dd) * move;
      }
    }
    if (i % 4 === 0) {
      path.push({ ...f });
      keeperPath.push({ ...kp });
    }
    if (f.z < BALL_R) {
      f.z = BALL_R;
      if (f.vz < -1.5) {
        f.vz = -f.vz * 0.5;
        f.vd *= 0.9;
        f.vx *= 0.9;
      } else {
        // Rolling along the grass.
        f.vz = 0;
        f.vd *= 1 - 0.8 * dt;
        f.vx *= 1 - 0.8 * dt;
      }
    }
    if (f.d >= k.dist) {
      path.push({ ...f });
      keeperPath.push({ ...kp });
      const rel = f.x - k.goalX;
      const at = { x: f.x, z: f.z, t: f.t };
      const nearPost = Math.abs(Math.abs(rel) - GOAL_W / 2) < BALL_R + 0.06 && f.z < GOAL_H + 0.06;
      const nearBar = Math.abs(f.z - GOAL_H) < BALL_R + 0.06 && Math.abs(rel) < GOAL_W / 2;
      if (nearPost || nearBar) return { result: 'post', path, at, keeper: keeperPath };
      if (Math.abs(rel) > GOAL_W / 2) return { result: 'wide', path, at, keeper: keeperPath };
      if (f.z > GOAL_H) return { result: 'over', path, at, keeper: keeperPath };
      if (Math.hypot(kp.x - f.x, kp.z - f.z) < keeper.reach)
        return { result: 'saved', path, at, keeper: keeperPath };
      return { result: 'goal', path, at, keeper: keeperPath };
    }
    if (f.vd < 0.5) break;
  }
  return { result: 'short', path, at: { x: f.x, z: f.z, t: f.t }, keeper: keeperPath };
}

/** Kick spots: distance and angle vary; the wall guards the near post. */
export function makeKick(n: number, random: () => number): Kick {
  const dist = 18 + random() * 9 + n * 0.3;
  const goalX = (random() - 0.5) * 14;
  const players = n < 3 ? 3 : n < 7 ? 4 : 5;
  // Shift the wall towards the ball-side post, as a real wall lines up.
  const toNear = goalX - Math.sign(goalX || 1) * (GOAL_W / 2 - 0.6);
  const wallCentre = toNear * (WALL_D / dist) + Math.sign(goalX || 1) * 0.2;
  const wall = Array.from(
    { length: players },
    (_, i) => wallCentre + (i - (players - 1) / 2) * 0.62,
  );
  return { dist, goalX, wall };
}

/** Points for a goal: corners score more. */
export function goalPoints(k: Kick, at: { x: number; z: number }): number {
  const side = Math.abs(at.x - k.goalX) / (GOAL_W / 2);
  const high = at.z / GOAL_H;
  return 100 + (side > 0.7 ? 50 : 0) + (high > 0.65 ? 50 : 0);
}
