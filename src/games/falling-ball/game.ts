import type { DifficultySetting } from '@/types';
import { incrementProgress, reportProgress } from '@/achievements/AchievementService';
import { baseState, clamp } from '../_shared/arcade/kit';
import type { ArcadeSpec, BaseState, Input } from '../_shared/arcade/kit';
import { circle, fillRound, gradientBg, text } from '../_shared/arcade/draw';

/**
 * Falling Ball: rows of floor with a gap scroll upwards. Steer the ball into
 * the gaps and keep falling. If the rising floors push the ball off the top of
 * the screen, or it touches a spiked row, the run ends.
 */
export const W = 360;
export const H = 560;
export const R = 11;
const ROW_H = 14;
const GRAVITY = 1400;
const MOVE = 260;

export interface Row {
  y: number;
  gapX: number;
  gapW: number;
  spiked: boolean;
  passed: boolean;
}

export interface State extends BaseState {
  x: number;
  y: number;
  vy: number;
  rows: Row[];
  rise: number;
  baseRise: number;
  gap: number;
  spacing: number;
  passed: number;
  spikeChance: number;
}

const SETTINGS: Record<DifficultySetting, { rise: number; gap: number; spike: number }> = {
  easy: { rise: 70, gap: 86, spike: 0 },
  normal: { rise: 90, gap: 74, spike: 0.12 },
  hard: { rise: 110, gap: 64, spike: 0.22 },
};

export function create(difficulty: DifficultySetting, random: () => number = Math.random): State {
  const cfg = SETTINGS[difficulty];
  const s: State = {
    ...baseState(),
    x: W / 2,
    y: 60,
    vy: 0,
    rows: [],
    rise: cfg.rise,
    baseRise: cfg.rise,
    gap: cfg.gap,
    spacing: 110,
    passed: 0,
    spikeChance: cfg.spike,
  };
  for (let y = 200; y < H + 200; y += s.spacing) s.rows.push(makeRow(s, y, random, false));
  return s;
}

function makeRow(s: State, y: number, random: () => number, allowSpike = true): Row {
  const gapW = s.gap;
  return { y, gapX: 12 + random() * (W - gapW - 24), gapW, spiked: allowSpike && random() < s.spikeChance, passed: false };
}

/** Whether the ball, resting at x, would fall through this row's gap. */
export function inGap(row: Row, x: number): boolean {
  return x - R * 0.6 > row.gapX && x + R * 0.6 < row.gapX + row.gapW;
}

export function update(s: State, dt: number, input: Input, random: () => number) {
  let dir = 0;
  if (input.held.has('left')) dir -= 1;
  if (input.held.has('right')) dir += 1;
  if (input.pointer.down) dir = input.pointer.x < W / 2 ? -1 : 1;
  s.x = clamp(s.x + dir * MOVE * dt, R, W - R);

  s.rise = s.baseRise + Math.min(120, s.time * 2.2);
  const lift = s.rise * dt;
  for (const row of s.rows) row.y -= lift;

  s.vy = Math.min(s.vy + GRAVITY * dt, 700);
  let ny = s.y + s.vy * dt;
  for (const row of s.rows) {
    const top = row.y;
    // Landing on a floor: the ball's bottom crosses the row top this step.
    // The row moved up by `lift` this step, so compare against where it was.
    if (s.y + R <= top + lift + 0.5 && ny + R >= top && !inGap(row, s.x)) {
      if (row.spiked) {
        s.over = true;
        s.events.push('gameOver');
        return;
      }
      ny = top - R;
      s.vy = 0;
    }
    if (!row.passed && s.y - R > top + ROW_H) {
      row.passed = true;
      s.passed += 1;
      s.score += 1;
      s.events.push('blip');
    }
  }
  s.y = Math.min(ny, H - R);
  if (s.y - R < 0) {
    s.over = true;
    s.events.push('gameOver');
    return;
  }
  s.rows = s.rows.filter((r) => r.y > -ROW_H);
  const last = s.rows[s.rows.length - 1];
  if (!last || last.y < H + 40) s.rows.push(makeRow(s, (last?.y ?? H) + s.spacing, random));
}

export function render(ctx: CanvasRenderingContext2D, s: State) {
  gradientBg(ctx, W, H, '#1e1b4b', '#312e81');
  ctx.fillStyle = 'rgba(248,113,113,0.85)';
  for (let x = 0; x < W; x += 16) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + 8, 12);
    ctx.lineTo(x + 16, 0);
    ctx.fill();
  }
  for (const row of s.rows) {
    const color = row.spiked ? '#ef4444' : '#a5b4fc';
    if (row.gapX > 0) fillRound(ctx, 0, row.y, row.gapX, ROW_H, 4, color);
    fillRound(ctx, row.gapX + row.gapW, row.y, W - row.gapX - row.gapW, ROW_H, 4, color);
  }
  circle(ctx, s.x, s.y, R, '#fbbf24');
  circle(ctx, s.x - 3, s.y - 4, 3.5, 'rgba(255,255,255,0.75)');
  text(ctx, String(s.score), W / 2, 34, { size: 26 });
}

export const spec: ArcadeSpec<State> = {
  width: W,
  height: H,
  create,
  update,
  render,
  hud: (s) => [
    { label: 'Floors', value: s.passed },
    { label: 'Speed', value: `${Math.round(s.rise)}` },
  ],
  result: (s) => ({ score: s.score, title: 'Squashed!', details: [{ label: 'Floors passed', value: String(s.passed) }] }),
  onEnd: (s) => {
    void reportProgress('falling-ball.floors-25', s.passed);
    void reportProgress('falling-ball.floors-75', s.passed);
    void incrementProgress('falling-ball.total', s.passed);
  },
  touch: { pad: 'horizontal' },
  startHint: 'Steer with ← → (or hold either side of the screen) and drop through the gaps.',
};
