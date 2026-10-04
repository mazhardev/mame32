import type { DifficultySetting } from '@/types';
import { incrementProgress, reportProgress } from '@/achievements/AchievementService';
import { baseState } from '../_shared/arcade/kit';
import type { ArcadeSpec, BaseState, Input } from '../_shared/arcade/kit';
import { burst, drawSparks, fillRound, gradientBg, text, updateSparks } from '../_shared/arcade/draw';
import type { Spark } from '../_shared/arcade/draw';

/**
 * Endless Jumper: a little kangaroo clings to one of two walls and climbs.
 * Tap to leap across to the other wall. Spikes stick out of both walls; leap
 * away from a spike before you climb into it, and don't land on one either.
 */
export const W = 360;
export const H = 600;
const WALL = 34;
const SIZE = 26;
export const PLAYER_Y = 430;
const LEAP_TIME = 0.32;

export interface Spike {
  side: 0 | 1;
  /** World height (metres climbed) of the spike's centre. */
  at: number;
  len: number;
}

export interface State extends BaseState {
  side: 0 | 1;
  /** 0..1 progress of a leap across, or -1 when clinging. */
  leap: number;
  climbed: number;
  speed: number;
  baseSpeed: number;
  spikes: Spike[];
  nextSpike: number;
  gems: { side: 0 | 1; at: number }[];
  gemCount: number;
  leaps: number;
  sparks: Spark[];
}

const SPEED: Record<DifficultySetting, number> = { easy: 160, normal: 200, hard: 240 };

export function create(difficulty: DifficultySetting): State {
  return {
    ...baseState(),
    side: 0,
    leap: -1,
    climbed: 0,
    speed: SPEED[difficulty],
    baseSpeed: SPEED[difficulty],
    spikes: [],
    nextSpike: 260,
    gems: [],
    gemCount: 0,
    leaps: 0,
    sparks: [],
  };
}

export function playerX(s: State): number {
  const left = WALL + SIZE / 2;
  const right = W - WALL - SIZE / 2;
  if (s.leap < 0) return s.side === 0 ? left : right;
  const from = s.side === 0 ? left : right;
  const to = s.side === 0 ? right : left;
  return from + (to - from) * s.leap;
}

/** Screen y of a world height, given how far the player has climbed. */
export const screenY = (s: State, at: number) => PLAYER_Y - (at - s.climbed);

export function hitsSpike(s: State, side: 0 | 1): boolean {
  return s.spikes.some((sp) => sp.side === side && Math.abs(sp.at - s.climbed) < sp.len / 2 + SIZE / 2 - 4);
}

export function update(s: State, dt: number, input: Input, random: () => number) {
  if ((input.pressed.has('action') || input.pressed.has('left') || input.pressed.has('right') || input.pointer.pressed) && s.leap < 0) {
    s.leap = 0;
    s.leaps += 1;
    s.events.push('jump');
  }
  s.speed = s.baseSpeed + Math.min(200, s.time * 3);
  s.climbed += s.speed * dt;
  if (s.leap >= 0) {
    s.leap += dt / LEAP_TIME;
    if (s.leap >= 1) {
      s.leap = -1;
      s.side = s.side === 0 ? 1 : 0;
    }
  }
  if (s.leap < 0 && hitsSpike(s, s.side)) {
    s.over = true;
    s.events.push('gameOver');
    burst(s.sparks, playerX(s), PLAYER_Y, '#f97316', 20, 200, random);
    return;
  }
  // Spikes: alternate sides often enough that there is always a safe wall.
  while (s.nextSpike < s.climbed + H) {
    const side: 0 | 1 = random() < 0.5 ? 0 : 1;
    s.spikes.push({ side, at: s.nextSpike, len: 50 + random() * 40 });
    if (random() < 0.35) s.gems.push({ side: side === 0 ? 1 : 0, at: s.nextSpike });
    // Spacing grows with speed so there is always time to react.
    s.nextSpike += (150 + random() * 110) * Math.max(1, s.speed / 200);
  }
  for (const g of s.gems) {
    if (s.leap < 0 && g.side === s.side && Math.abs(g.at - s.climbed) < 22) {
      g.at = -1e9;
      s.gemCount += 1;
      s.events.push('coin');
    }
  }
  s.spikes = s.spikes.filter((sp) => sp.at > s.climbed - 200);
  s.gems = s.gems.filter((g) => g.at > s.climbed - 200);
  s.score = Math.floor(s.climbed / 10) + s.gemCount * 20;
  updateSparks(s.sparks, dt, 400);
}

export function render(ctx: CanvasRenderingContext2D, s: State) {
  gradientBg(ctx, W, H, '#0c4a6e', '#0369a1');
  ctx.fillStyle = '#334155';
  ctx.fillRect(0, 0, WALL, H);
  ctx.fillRect(W - WALL, 0, WALL, H);
  ctx.fillStyle = '#475569';
  const off = s.climbed % 40;
  for (let y = -40 + off; y < H; y += 40) {
    ctx.fillRect(0, y, WALL, 3);
    ctx.fillRect(W - WALL, y, WALL, 3);
  }
  ctx.fillStyle = '#e2e8f0';
  for (const sp of s.spikes) {
    const y = screenY(s, sp.at);
    const base = sp.side === 0 ? WALL : W - WALL;
    const dir = sp.side === 0 ? 1 : -1;
    for (let k = -sp.len / 2; k < sp.len / 2; k += 12) {
      ctx.beginPath();
      ctx.moveTo(base, y + k);
      ctx.lineTo(base + dir * 18, y + k + 6);
      ctx.lineTo(base, y + k + 12);
      ctx.fill();
    }
  }
  for (const g of s.gems) text(ctx, '💎', g.side === 0 ? WALL + 18 : W - WALL - 18, screenY(s, g.at), { size: 20 });
  if (!s.over) {
    const x = playerX(s);
    const arc = s.leap >= 0 ? Math.sin(s.leap * Math.PI) * 40 : 0;
    fillRound(ctx, x - SIZE / 2, PLAYER_Y - SIZE / 2 - arc, SIZE, SIZE, 8, '#f59e0b');
    text(ctx, '🦘', x, PLAYER_Y - arc, { size: 20 });
  }
  drawSparks(ctx, s.sparks);
  text(ctx, `${Math.floor(s.climbed / 10)} m`, W / 2, 34, { size: 24 });
}

export const spec: ArcadeSpec<State> = {
  width: W,
  height: H,
  create,
  update,
  render,
  hud: (s) => [
    { label: 'Height', value: `${Math.floor(s.climbed / 10)} m` },
    { label: 'Gems', value: s.gemCount },
    { label: 'Score', value: s.score },
  ],
  result: (s) => ({
    score: s.score,
    title: 'Spiked!',
    details: [
      { label: 'Height', value: `${Math.floor(s.climbed / 10)} m` },
      { label: 'Gems', value: String(s.gemCount) },
      { label: 'Leaps', value: String(s.leaps) },
    ],
  }),
  onEnd: (s) => {
    void reportProgress('endless-jumper.height-100', Math.floor(s.climbed / 10));
    void reportProgress('endless-jumper.height-300', Math.floor(s.climbed / 10));
    void reportProgress('endless-jumper.gems-10', s.gemCount);
    void incrementProgress('endless-jumper.total', Math.floor(s.climbed / 10));
  },
  touch: { pad: 'none' },
  startHint: 'Tap (or Space) to leap to the other wall. Avoid climbing into or landing on spikes.',
};
