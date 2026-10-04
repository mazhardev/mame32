import type { DifficultySetting } from '@/types';
import { incrementProgress, reportProgress } from '@/achievements/AchievementService';
import { baseState } from '../_shared/arcade/kit';
import type { ArcadeSpec, BaseState, Input } from '../_shared/arcade/kit';
import { fillRound, gradientBg, text } from '../_shared/arcade/draw';

/**
 * Perfect Timing: a needle sweeps back and forth along a bar. Stop it inside
 * the target zone. Each hit shrinks the zone, moves it and speeds the needle
 * up. Stopping dead centre is a "perfect" worth double. Three misses and out.
 */
export const W = 420;
export const H = 320;
const BAR_X = 30;
const BAR_W = W - 60;

export interface State extends BaseState {
  /** Needle position 0..1 along the bar. */
  pos: number;
  dir: 1 | -1;
  speed: number;
  zoneCenter: number;
  zoneWidth: number;
  minZone: number;
  lives: number;
  hits: number;
  perfects: number;
  streak: number;
  bestStreak: number;
  /** Brief feedback after each stop. */
  flash: { text: string; color: string; t: number } | null;
  /** Freeze after a stop so the result is visible. */
  hold: number;
}

const SETTINGS: Record<DifficultySetting, { speed: number; zone: number; minZone: number }> = {
  easy: { speed: 0.55, zone: 0.24, minZone: 0.07 },
  normal: { speed: 0.75, zone: 0.2, minZone: 0.05 },
  hard: { speed: 0.95, zone: 0.16, minZone: 0.035 },
};

export function create(difficulty: DifficultySetting): State {
  const c = SETTINGS[difficulty];
  return {
    ...baseState(),
    pos: 0,
    dir: 1,
    speed: c.speed,
    zoneCenter: 0.6,
    zoneWidth: c.zone,
    minZone: c.minZone,
    lives: 3,
    hits: 0,
    perfects: 0,
    streak: 0,
    bestStreak: 0,
    flash: null,
    hold: 0,
  };
}

/** Grades a stop: 'perfect' within a fifth of the zone's half-width of the centre. */
export function grade(pos: number, center: number, width: number): 'perfect' | 'hit' | 'miss' {
  const d = Math.abs(pos - center);
  if (d <= width * 0.1) return 'perfect';
  if (d <= width / 2) return 'hit';
  return 'miss';
}

export function stop(s: State, random: () => number) {
  const g = grade(s.pos, s.zoneCenter, s.zoneWidth);
  if (g === 'miss') {
    s.lives -= 1;
    s.streak = 0;
    s.flash = { text: 'Miss', color: '#f87171', t: 0.7 };
    s.events.push('failure');
    if (s.lives <= 0) {
      s.over = true;
      s.events.push('gameOver');
    }
  } else {
    s.hits += 1;
    s.streak += 1;
    s.bestStreak = Math.max(s.bestStreak, s.streak);
    const pts = (g === 'perfect' ? 20 : 10) * (1 + Math.floor(s.streak / 5));
    s.score += pts;
    if (g === 'perfect') s.perfects += 1;
    s.flash = { text: g === 'perfect' ? `Perfect! +${pts}` : `+${pts}`, color: g === 'perfect' ? '#fde047' : '#86efac', t: 0.7 };
    s.events.push(g === 'perfect' ? 'coin' : 'success');
    s.zoneWidth = Math.max(s.minZone, s.zoneWidth * 0.92);
    s.speed = Math.min(2.4, s.speed * 1.06);
  }
  const half = s.zoneWidth / 2;
  s.zoneCenter = half + random() * (1 - 2 * half);
  s.hold = 0.35;
}

export function update(s: State, dt: number, input: Input, random: () => number) {
  if (s.flash) {
    s.flash.t -= dt;
    if (s.flash.t <= 0) s.flash = null;
  }
  if (s.hold > 0) {
    s.hold -= dt;
    return;
  }
  if (input.pressed.has('action') || input.pointer.pressed) {
    stop(s, random);
    return;
  }
  s.pos += s.dir * s.speed * dt;
  if (s.pos >= 1) {
    s.pos = 2 - s.pos;
    s.dir = -1;
  } else if (s.pos <= 0) {
    s.pos = -s.pos;
    s.dir = 1;
  }
}

export function render(ctx: CanvasRenderingContext2D, s: State) {
  gradientBg(ctx, W, H, '#0f172a', '#1e293b');
  const y = 150;
  fillRound(ctx, BAR_X, y, BAR_W, 40, 20, '#334155');
  const zx = BAR_X + (s.zoneCenter - s.zoneWidth / 2) * BAR_W;
  fillRound(ctx, zx, y, s.zoneWidth * BAR_W, 40, 8, '#22c55e');
  fillRound(ctx, BAR_X + (s.zoneCenter - s.zoneWidth * 0.1) * BAR_W, y, s.zoneWidth * 0.2 * BAR_W, 40, 4, '#fde047');
  const nx = BAR_X + s.pos * BAR_W;
  fillRound(ctx, nx - 3, y - 18, 6, 76, 3, '#f8fafc');
  for (let i = 0; i < 3; i++) text(ctx, i < s.lives ? '❤' : '♡', W / 2 - 30 + i * 30, 60, { size: 24, color: '#f87171' });
  text(ctx, String(s.score), W / 2, 110, { size: 28 });
  if (s.flash) text(ctx, s.flash.text, W / 2, 245, { size: 26, color: s.flash.color });
  if (s.streak >= 5) text(ctx, `Streak ${s.streak} · ×${1 + Math.floor(s.streak / 5)}`, W / 2, 285, { size: 15, color: '#cbd5e1' });
}

export const spec: ArcadeSpec<State> = {
  width: W,
  height: H,
  create,
  update,
  render,
  hud: (s) => [
    { label: 'Score', value: s.score },
    { label: 'Lives', value: s.lives },
    { label: 'Streak', value: s.streak },
  ],
  result: (s) => ({
    score: s.score,
    title: 'Out of lives',
    details: [
      { label: 'Hits', value: String(s.hits) },
      { label: 'Perfects', value: String(s.perfects) },
      { label: 'Best streak', value: String(s.bestStreak) },
    ],
  }),
  onEnd: (s) => {
    void reportProgress('perfect-timing.streak-10', s.bestStreak);
    void reportProgress('perfect-timing.score-300', s.score);
    void reportProgress('perfect-timing.perfect-5', s.perfects);
    void incrementProgress('perfect-timing.total', s.perfects);
  },
  touch: { pad: 'none' },
  startHint: 'Tap (or Space) to stop the needle inside the green zone. Yellow centre = perfect.',
};
