import type { DifficultySetting } from '@/types';
import { createRng } from '@/utils/random';
import { incrementProgress, reportProgress } from '@/achievements/AchievementService';
import { baseState, rectHit } from '../_shared/arcade/kit';
import type { ArcadeSpec, BaseState, Input } from '../_shared/arcade/kit';
import { burst, drawSparks, gradientBg, text, updateSparks } from '../_shared/arcade/draw';
import type { Spark } from '../_shared/arcade/draw';

/**
 * Rhythm Runner: a cube dashes along a course built on a steady beat.
 * Tap to jump over spikes, onto blocks and up staircases; jump pads launch
 * you high. One touch of a spike or a block's side and it's back to the
 * start. Each difficulty is one fixed course — reach 100% to beat it.
 */
export const W = 640;
export const H = 320;
export const UNIT = 40;
export const GROUND = H - 60;
const CUBE = 30;
const PX = 140;
export const JUMP = -720;
export const GRAVITY = 2700;

export type Kind = 'spike' | 'block' | 'pad';

export interface Obstacle {
  kind: Kind;
  /** In units along the course. */
  x: number;
  w: number;
  /** Height in units (blocks), or the level the object sits on. */
  h: number;
  base: number;
}

type Pattern = [Kind, number, number, number, number][]; // kind, x, w, h, base

const PATTERNS: Record<string, Pattern> = {
  spike: [['spike', 0, 1, 1, 0]],
  double: [['spike', 0, 1, 1, 0], ['spike', 1, 1, 1, 0]],
  triple: [['spike', 0, 1, 1, 0], ['spike', 1, 1, 1, 0], ['spike', 2, 1, 1, 0]],
  block: [['block', 0, 3, 1, 0]],
  step: [['block', 0, 3, 1, 0], ['block', 3, 3, 2, 0]],
  blockSpike: [['block', 0, 4, 1, 0], ['spike', 2, 1, 1, 1]],
  spikeRun: [['spike', 0, 1, 1, 0], ['block', 3, 3, 1, 0], ['spike', 7, 1, 1, 0]],
  pad: [['pad', 0, 1, 0, 0], ['block', 2, 1, 3, 0], ['spike', 3, 1, 1, 0], ['spike', 4, 1, 1, 0]],
  pillars: [['block', 0, 1, 1, 0], ['block', 3, 1, 2, 0], ['block', 6, 1, 1, 0]],
};

const LEVELS: Record<DifficultySetting, { speed: number; bpm: number; length: number; pool: string[] }> = {
  easy: { speed: 300, bpm: 112, length: 300, pool: ['spike', 'spike', 'double', 'block', 'block', 'step', 'pillars'] },
  normal: { speed: 340, bpm: 127, length: 380, pool: ['spike', 'double', 'triple', 'block', 'step', 'blockSpike', 'spikeRun', 'pillars', 'pad'] },
  hard: { speed: 390, bpm: 145, length: 460, pool: ['double', 'triple', 'triple', 'step', 'blockSpike', 'spikeRun', 'pad', 'pillars'] },
};

/** Lays patterns out on the beat grid; the same difficulty always builds the same course. */
export function buildCourse(difficulty: DifficultySetting): Obstacle[] {
  const lv = LEVELS[difficulty];
  const rng = createRng(`rhythm-${difficulty}`);
  const beatUnits = Math.max(3, Math.round(((60 / lv.bpm) * lv.speed) / UNIT));
  const out: Obstacle[] = [];
  let x = beatUnits * 4;
  while (x < lv.length - 12) {
    const p = PATTERNS[lv.pool[Math.floor(rng.next() * lv.pool.length)]];
    for (const [kind, dx, w, h, base] of p) out.push({ kind, x: x + dx, w, h, base });
    const span = Math.max(...p.map(([, dx, w]) => dx + w));
    // Resume on the next beat, leaving at least one beat of breathing room.
    x = Math.ceil((x + span + beatUnits) / beatUnits) * beatUnits;
  }
  return out;
}

export interface State extends BaseState {
  course: Obstacle[];
  length: number;
  speed: number;
  distance: number;
  y: number;
  vy: number;
  grounded: boolean;
  spin: number;
  sparks: Spark[];
  beat: number;
  beatT: number;
  won: boolean;
  jumps: number;
}

export function create(difficulty: DifficultySetting): State {
  const lv = LEVELS[difficulty];
  return {
    ...baseState(),
    course: buildCourse(difficulty),
    length: lv.length * UNIT,
    speed: lv.speed,
    distance: 0,
    y: GROUND,
    vy: 0,
    grounded: true,
    spin: 0,
    sparks: [],
    beat: 60 / lv.bpm,
    beatT: 0,
    won: false,
    jumps: 0,
  };
}

/** World rectangle of an obstacle (x in pixels along the course). */
export function obstacleRect(o: Obstacle) {
  const top = GROUND - (o.base + o.h) * UNIT;
  return { x: o.x * UNIT, y: o.kind === 'pad' ? GROUND - 8 : top, w: o.w * UNIT, h: o.kind === 'pad' ? 8 : o.h * UNIT };
}

export function progress(s: State): number {
  return Math.min(100, Math.floor((s.distance / s.length) * 100));
}

export function update(s: State, dt: number, input: Input, random: () => number) {
  updateSparks(s.sparks, dt, 500);
  s.beatT += dt;
  if (s.beatT >= s.beat) {
    s.beatT -= s.beat;
    s.events.push('tick');
  }
  const wantsJump = input.held.has('action') || input.held.has('up') || input.pointer.down || input.pressed.has('action') || input.pointer.pressed;
  if (wantsJump && s.grounded) {
    s.vy = JUMP;
    s.grounded = false;
    s.jumps += 1;
    s.events.push('jump');
  }
  const prevY = s.y;
  s.distance += s.speed * dt;
  s.vy += GRAVITY * dt;
  s.y += s.vy * dt;
  s.grounded = false;
  if (s.y >= GROUND) {
    s.y = GROUND;
    s.vy = 0;
    s.grounded = true;
  }
  s.spin = s.grounded ? Math.round(s.spin / (Math.PI / 2)) * (Math.PI / 2) : s.spin + 7 * dt;

  const cube = { x: s.distance + PX, y: s.y - CUBE, w: CUBE, h: CUBE };
  for (const o of s.course) {
    const r = obstacleRect(o);
    if (r.x > cube.x + 80 || r.x + r.w < cube.x - 10) continue;
    if (o.kind === 'spike') {
      // Spikes are triangles: use a narrower box in their middle.
      if (rectHit({ x: cube.x + 4, y: cube.y + 4, w: CUBE - 8, h: CUBE - 6 }, { x: r.x + r.w * 0.3, y: r.y + r.h * 0.35, w: r.w * 0.4, h: r.h * 0.65 })) {
        die(s, cube, random);
        return;
      }
    } else if (o.kind === 'pad') {
      if (s.grounded && rectHit(cube, r)) {
        s.vy = JUMP * 1.45;
        s.grounded = false;
        s.events.push('powerup');
      }
    } else if (rectHit(cube, r)) {
      // Landing on top is fine, and clipping a top edge by a few pixels
      // lifts the cube onto it; hitting a block's face is a crash.
      if (prevY <= r.y + 6 && s.vy >= 0) {
        s.y = r.y;
        s.vy = 0;
        s.grounded = true;
      } else if (s.y - r.y <= 14) {
        s.y = r.y;
        if (s.vy >= 0) {
          s.vy = 0;
          s.grounded = true;
        }
      } else {
        die(s, cube, random);
        return;
      }
    }
  }
  s.score = progress(s);
  if (s.distance >= s.length) {
    s.won = true;
    s.over = true;
    s.score = 100;
    s.events.push('levelComplete');
  }
}

function die(s: State, cube: { x: number; y: number }, random: () => number) {
  s.over = true;
  s.events.push('explosion');
  burst(s.sparks, PX + CUBE / 2, cube.y + CUBE / 2, '#22d3ee', 26, 240, random);
}

export function render(ctx: CanvasRenderingContext2D, s: State) {
  const pulse = 1 - s.beatT / s.beat;
  gradientBg(ctx, W, H, '#1e1b4b', '#4338ca');
  ctx.fillStyle = `rgba(255,255,255,${0.04 + pulse * 0.05})`;
  for (let x = -((s.distance * 0.3) % 80); x < W; x += 80) ctx.fillRect(x, 0, 40, GROUND);
  ctx.fillStyle = '#1e1b4b';
  ctx.fillRect(0, GROUND, W, H - GROUND);
  ctx.fillStyle = `rgba(165,180,252,${0.6 + pulse * 0.4})`;
  ctx.fillRect(0, GROUND, W, 3);
  const off = s.distance;
  for (const o of s.course) {
    const r = obstacleRect(o);
    const x = r.x - off;
    if (x > W || x + r.w < 0) continue;
    if (o.kind === 'spike') {
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.moveTo(x + 4, r.y + r.h);
      ctx.lineTo(x + r.w / 2, r.y + 4);
      ctx.lineTo(x + r.w - 4, r.y + r.h);
      ctx.fill();
    } else if (o.kind === 'pad') {
      ctx.fillStyle = '#facc15';
      ctx.fillRect(x + 4, r.y, r.w - 8, r.h);
    } else {
      ctx.fillStyle = '#312e81';
      ctx.fillRect(x, r.y, r.w, r.h);
      ctx.strokeStyle = '#a5b4fc';
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 1, r.y + 1, r.w - 2, r.h - 2);
    }
  }
  if (!s.over || s.won) {
    ctx.save();
    ctx.translate(PX + CUBE / 2, s.y - CUBE / 2);
    ctx.rotate(s.spin);
    ctx.fillStyle = '#22d3ee';
    ctx.fillRect(-CUBE / 2, -CUBE / 2, CUBE, CUBE);
    ctx.fillStyle = '#0e7490';
    ctx.fillRect(-8, -8, 16, 16);
    ctx.restore();
  }
  drawSparks(ctx, s.sparks);
  ctx.fillStyle = 'rgba(255,255,255,0.2)';
  ctx.fillRect(W / 2 - 150, 16, 300, 8);
  ctx.fillStyle = '#4ade80';
  ctx.fillRect(W / 2 - 150, 16, 3 * progress(s), 8);
  text(ctx, `${progress(s)}%`, W / 2 + 175, 20, { size: 14 });
}

export const spec: ArcadeSpec<State> = {
  width: W,
  height: H,
  create,
  update,
  render,
  hud: (s) => [
    { label: 'Progress', value: `${progress(s)}%` },
    { label: 'Jumps', value: s.jumps },
  ],
  result: (s) => ({
    score: s.score,
    won: s.won,
    lost: !s.won,
    title: s.won ? 'Course complete!' : `Crashed at ${progress(s)}%`,
    details: [{ label: 'Jumps', value: String(s.jumps) }],
  }),
  onEnd: (s, difficulty) => {
    void reportProgress('rhythm-runner.half', progress(s) >= 50 ? 1 : 0);
    if (s.won) {
      void reportProgress('rhythm-runner.complete', 1);
      if (difficulty === 'hard') void reportProgress('rhythm-runner.hard', 1);
    }
    void incrementProgress('rhythm-runner.attempts');
  },
  touch: { pad: 'none' },
  startHint: 'Tap, click or hold Space to jump. Feel the beat — obstacles land on it.',
};
