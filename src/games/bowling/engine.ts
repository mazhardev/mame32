/**
 * Ten-pin bowling: frame scoring and a top-down pin-action simulation.
 *
 * World units are pixels on a lane 160 px wide (≈152 px per metre). The foul
 * line is at y = 0 and the ball rolls towards negative y; the head pin stands
 * at y = −LANE.
 */
export const LANE_W = 160;
export const HALF = LANE_W / 2;
export const GUTTER = 34;
export const LANE = 2780;
export const BALL_R = 16;
export const PIN_R = 9;
const PIN_SPACING = 46;
const ROW_GAP = 40;
const BALL_MASS = 6;
const PIN_MASS = 1.5;
/** Ball hooks only on the dry back end of the lane. */
export const HOOK_START = -LANE * 0.6;
const HOOK_ACCEL = 150;

export interface Pin {
  n: number;
  homeX: number;
  homeY: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  down: boolean;
  /** Fell into the gutter or the pit; no longer collides. */
  gone: boolean;
  standing: boolean;
  angle: number;
}

export interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  spin: number;
  gutter: boolean;
}

export interface Roll {
  ball: Ball;
  pins: Pin[];
  time: number;
  /** Seconds since the ball reached the pins. */
  pinTime: number;
  done: boolean;
}

/** Pin spots, numbered 1–10 from the head pin back. */
export function pinSpots(): { n: number; x: number; y: number }[] {
  const spots = [];
  let n = 1;
  for (let row = 0; row < 4; row++) {
    for (let i = 0; i <= row; i++) {
      spots.push({ n: n++, x: (i - row / 2) * PIN_SPACING, y: -LANE - row * ROW_GAP });
    }
  }
  return spots;
}

export function rack(standing: number[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]): Pin[] {
  return pinSpots()
    .filter((s) => standing.includes(s.n))
    .map((s) => ({
      n: s.n,
      homeX: s.x,
      homeY: s.y,
      x: s.x,
      y: s.y,
      vx: 0,
      vy: 0,
      down: false,
      gone: false,
      standing: true,
      angle: 0,
    }));
}

/** Starts a roll from `x` on the foul line at `angle` (radians from straight) with `speed`. */
export function startRoll(
  pins: Pin[],
  x: number,
  angle: number,
  speed: number,
  spin: number,
): Roll {
  return {
    ball: {
      x,
      y: -10,
      vx: Math.sin(angle) * speed,
      vy: -Math.cos(angle) * speed,
      spin,
      gutter: false,
    },
    pins: pins.map((p) => ({ ...p })),
    time: 0,
    pinTime: 0,
    done: false,
  };
}

function bump(
  a: { x: number; y: number; vx: number; vy: number },
  ma: number,
  b: Pin,
  mb: number,
  minDist: number,
  e: number,
): boolean {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const d = Math.hypot(dx, dy);
  if (d >= minDist || d === 0) return false;
  const nx = dx / d;
  const ny = dy / d;
  // Separate in proportion to the other body's mass.
  const overlap = minDist - d;
  const total = ma + mb;
  a.x -= nx * overlap * (mb / total);
  a.y -= ny * overlap * (mb / total);
  b.x += nx * overlap * (ma / total);
  b.y += ny * overlap * (ma / total);
  const rel = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
  if (rel >= 0) return true;
  const j = (-(1 + e) * rel) / (1 / ma + 1 / mb);
  a.vx -= (j / ma) * nx;
  a.vy -= (j / ma) * ny;
  b.vx += (j / mb) * nx;
  b.vy += (j / mb) * ny;
  return true;
}

/**
 * Advances a roll. Pins count as down once knocked clearly off their spot;
 * flying pins keep colliding, which is where most strikes come from.
 * Returns true when the ball hit a pin during this step.
 */
export function stepRoll(r: Roll, dt: number): boolean {
  const b = r.ball;
  let hit = false;
  r.time += dt;
  if (!b.gutter) {
    if (b.y < HOOK_START) b.vx += b.spin * HOOK_ACCEL * dt;
    if (Math.abs(b.x) > HALF - BALL_R * 0.35 && b.y > -LANE + 10) {
      b.gutter = true;
      b.x = Math.sign(b.x) * (HALF + GUTTER / 2);
      b.vx = 0;
    }
  }
  b.x += b.vx * dt;
  b.y += b.vy * dt;
  if (b.y < -LANE + 60) r.pinTime += dt;

  for (const p of r.pins) {
    if (p.gone) continue;
    if (!b.gutter && b.y > -LANE - 220 && bump(b, BALL_MASS, p, PIN_MASS, BALL_R + PIN_R, 0.75))
      hit = true;
  }
  for (let i = 0; i < r.pins.length; i++) {
    const a = r.pins[i];
    if (a.gone) continue;
    for (let k = i + 1; k < r.pins.length; k++) {
      const c = r.pins[k];
      if (c.gone) continue;
      // A standing pin is only hit by a moving one.
      if (a.standing && c.standing) continue;
      bump(a, PIN_MASS, c, PIN_MASS, PIN_R * 2, 0.8);
    }
  }
  const fade = Math.exp(-1.3 * dt);
  for (const p of r.pins) {
    if (p.gone) continue;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= fade;
    p.vy *= fade;
    const moved = Math.hypot(p.x - p.homeX, p.y - p.homeY);
    if (p.standing && (moved > 5 || Math.hypot(p.vx, p.vy) > 45)) {
      p.standing = false;
      p.down = true;
      p.angle = Math.atan2(p.vy, p.vx);
    }
    // Kickback plates beside the pin deck throw pins back in.
    const onDeck = p.y < -LANE + 30;
    const wall = HALF + GUTTER - PIN_R;
    if (onDeck && Math.abs(p.x) > wall) {
      p.x = Math.sign(p.x) * wall;
      p.vx = -p.vx * 0.6;
    }
    if ((!onDeck && Math.abs(p.x) > HALF + 6) || p.y < -LANE - 260) {
      p.gone = true;
      p.down = true;
      p.standing = false;
    }
  }
  const settled = r.pins.every((p) => p.gone || Math.hypot(p.vx, p.vy) < 6);
  if ((b.y < -LANE - 260 && settled) || r.pinTime > 4 || r.time > 9) r.done = true;
  return hit;
}

export function runRoll(r: Roll, step = 1 / 240): Roll {
  while (!r.done) stepRoll(r, step);
  return r;
}

export function knocked(r: Roll): number {
  return r.pins.filter((p) => p.down).length;
}

export function standingNumbers(r: Roll): number[] {
  return r.pins.filter((p) => !p.down).map((p) => p.n);
}

/**
 * Cumulative frame scores from a list of pinfalls. A frame whose bonus rolls
 * have not been bowled yet scores null.
 */
export function scoreFrames(rolls: number[]): (number | null)[] {
  const out: (number | null)[] = [];
  let i = 0;
  let total = 0;
  for (let frame = 0; frame < 10; frame++) {
    if (i >= rolls.length) break;
    const first = rolls[i];
    let value: number | null;
    if (first === 10) {
      value = i + 2 < rolls.length ? 10 + rolls[i + 1] + rolls[i + 2] : null;
      i += 1;
    } else if (i + 1 >= rolls.length) {
      value = null;
      i += 1;
    } else if (first + rolls[i + 1] === 10) {
      value = i + 2 < rolls.length ? 10 + rolls[i + 2] : null;
      i += 2;
    } else {
      value = first + rolls[i + 1];
      i += 2;
    }
    if (value === null) {
      out.push(null);
      break;
    }
    total += value;
    out.push(total);
  }
  return out;
}

/** Where the game stands after `rolls`: current frame (0–9), ball in frame, and whether it is over. */
export function position(rolls: number[]): {
  frame: number;
  ball: number;
  over: boolean;
  fullRack: boolean;
} {
  let i = 0;
  for (let frame = 0; frame < 9; frame++) {
    if (i >= rolls.length) return { frame, ball: 0, over: false, fullRack: true };
    if (rolls[i] === 10) {
      i += 1;
      continue;
    }
    if (i + 1 >= rolls.length) return { frame, ball: 1, over: false, fullRack: false };
    i += 2;
  }
  const tenth = rolls.slice(i);
  const [a, b] = tenth;
  if (tenth.length === 0) return { frame: 9, ball: 0, over: false, fullRack: true };
  if (tenth.length === 1) return { frame: 9, ball: 1, over: false, fullRack: a === 10 };
  if (tenth.length === 2) {
    if (a + b < 10) return { frame: 9, ball: 2, over: true, fullRack: false };
    return { frame: 9, ball: 2, over: false, fullRack: a === 10 ? b === 10 : true };
  }
  return { frame: 9, ball: 3, over: true, fullRack: false };
}

/** Marks for the score sheet: X, /, - and digits. */
export function marks(rolls: number[]): string[][] {
  const frames: string[][] = [];
  let i = 0;
  for (let frame = 0; frame < 10 && i < rolls.length; frame++) {
    const sym = (v: number) => (v === 0 ? '-' : String(v));
    if (frame < 9) {
      if (rolls[i] === 10) {
        frames.push(['', 'X']);
        i += 1;
      } else {
        const a = rolls[i];
        const b = rolls[i + 1];
        frames.push([sym(a), b === undefined ? '' : a + b === 10 ? '/' : sym(b)]);
        i += 2;
      }
    } else {
      const t = rolls.slice(i);
      const out: string[] = [];
      let pinsUp = 10;
      for (const v of t) {
        if (v === 10 && pinsUp === 10) out.push('X');
        else if (v === pinsUp) out.push('/');
        else out.push(sym(v));
        pinsUp = v === pinsUp ? 10 : pinsUp - v;
      }
      frames.push(out);
      i = rolls.length;
    }
  }
  return frames;
}
