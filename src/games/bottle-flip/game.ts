import type { DifficultySetting } from '@/types';
import { incrementProgress, reportProgress } from '@/achievements/AchievementService';
import { baseState } from '../_shared/arcade/kit';
import type { ArcadeSpec, BaseState, Input } from '../_shared/arcade/kit';
import { fillRound, gradientBg, text } from '../_shared/arcade/draw';

/**
 * Bottle Flip: hold to charge, release to toss. The power sets both the flight
 * time and the spin. The bottle lands upright when it has turned a whole
 * number of times — within a tolerance — when it comes down. Three failed
 * flips and the round is over.
 */
export const W = 380;
export const H = 520;
export const TABLE_Y = 420;
const BOTTLE_H = 70;
const BOTTLE_W = 26;
const GRAVITY = 1700;
const CHARGE_TIME = 1.5;

type Phase = 'aim' | 'charging' | 'flying' | 'landed';

export interface State extends BaseState {
  phase: Phase;
  power: number;
  /** Charge direction: the meter bounces between 0 and 1. */
  chargeDir: 1 | -1;
  y: number;
  vy: number;
  angle: number;
  spin: number;
  tolerance: number;
  lives: number;
  flips: number;
  streak: number;
  bestStreak: number;
  doubles: number;
  result: { ok: boolean; text: string } | null;
  pause: number;
}

const TOLERANCE: Record<DifficultySetting, number> = { easy: 0.62, normal: 0.45, hard: 0.32 };

export function create(difficulty: DifficultySetting): State {
  return {
    ...baseState(),
    phase: 'aim',
    power: 0,
    chargeDir: 1,
    y: TABLE_Y,
    vy: 0,
    angle: 0,
    spin: 0,
    tolerance: TOLERANCE[difficulty],
    lives: 3,
    flips: 0,
    streak: 0,
    bestStreak: 0,
    doubles: 0,
    result: null,
    pause: 0,
  };
}

/**
 * Toss physics. Flight time grows with power, and so does spin, but not in
 * proportion — so each whole number of turns has its own narrow power band.
 */
export function toss(s: State) {
  s.vy = -(420 + s.power * 520);
  s.spin = 5 + s.power * 9;
  s.phase = 'flying';
  s.events.push('whoosh');
}

/** How far (radians) the bottle is from upright, and how many turns it made. */
export function landing(angle: number): { off: number; turns: number } {
  const turns = Math.round(angle / (Math.PI * 2));
  return { off: Math.abs(angle - turns * Math.PI * 2), turns };
}

export function update(s: State, dt: number, input: Input) {
  const down = input.held.has('action') || input.pointer.down;
  if (s.phase === 'landed') {
    s.pause -= dt;
    if (s.pause <= 0 && !s.over) {
      s.phase = 'aim';
      s.result = null;
      s.angle = 0;
      s.y = TABLE_Y;
    }
    return;
  }
  if (s.phase === 'aim' && (input.pressed.has('action') || input.pointer.pressed || down)) {
    s.phase = 'charging';
    s.power = 0;
    s.chargeDir = 1;
  }
  if (s.phase === 'charging') {
    s.power += (s.chargeDir * dt) / CHARGE_TIME;
    if (s.power >= 1) {
      s.power = 1;
      s.chargeDir = -1;
    } else if (s.power <= 0) {
      s.power = 0;
      s.chargeDir = 1;
    }
    if (!down) toss(s);
    return;
  }
  if (s.phase === 'flying') {
    s.vy += GRAVITY * dt;
    s.y += s.vy * dt;
    s.angle += s.spin * dt;
    if (s.y >= TABLE_Y && s.vy > 0) {
      s.y = TABLE_Y;
      const { off, turns } = landing(s.angle);
      const ok = turns >= 1 && off <= s.tolerance;
      s.phase = 'landed';
      s.pause = 1.1;
      if (ok) {
        s.flips += 1;
        s.streak += 1;
        s.bestStreak = Math.max(s.bestStreak, s.streak);
        if (turns >= 2) s.doubles += 1;
        const pts = turns * 10 * Math.min(5, s.streak);
        s.score += pts;
        s.angle = turns * Math.PI * 2;
        s.result = { ok: true, text: `${turns === 1 ? 'Flip' : `${turns}× flip`}! +${pts}` };
        s.events.push(turns >= 2 ? 'levelComplete' : 'success');
      } else {
        s.lives -= 1;
        s.streak = 0;
        s.angle = s.angle % (Math.PI * 2) > Math.PI ? Math.PI * 1.5 : Math.PI / 2;
        s.result = { ok: false, text: 'It fell over!' };
        s.events.push('failure');
        if (s.lives <= 0) {
          s.over = true;
          s.events.push('gameOver');
        }
      }
    }
  }
}

export function render(ctx: CanvasRenderingContext2D, s: State) {
  gradientBg(ctx, W, H, '#fde68a', '#fef3c7');
  ctx.fillStyle = '#92400e';
  ctx.fillRect(0, TABLE_Y, W, 16);
  ctx.fillStyle = '#78350f';
  ctx.fillRect(30, TABLE_Y + 16, 16, H - TABLE_Y);
  ctx.fillRect(W - 46, TABLE_Y + 16, 16, H - TABLE_Y);
  ctx.save();
  // Rotate about the bottle's centre; it rests on its base on the table.
  const fallen = s.phase === 'landed' && s.result && !s.result.ok;
  const cy = fallen ? s.y - BOTTLE_W / 2 : s.y - BOTTLE_H / 2;
  ctx.translate(W / 2, cy);
  ctx.rotate(s.angle);
  fillRound(ctx, -BOTTLE_W / 2, -BOTTLE_H / 2 + 18, BOTTLE_W, BOTTLE_H - 18, 8, 'rgba(56,189,248,0.85)');
  ctx.fillStyle = 'rgba(14,116,144,0.9)';
  ctx.fillRect(-BOTTLE_W / 2 + 2, 6, BOTTLE_W - 4, BOTTLE_H / 2 - 8);
  fillRound(ctx, -7, -BOTTLE_H / 2, 14, 22, 4, 'rgba(56,189,248,0.85)');
  fillRound(ctx, -8, -BOTTLE_H / 2 - 4, 16, 8, 3, '#2563eb');
  ctx.restore();
  if (s.phase === 'charging' || s.phase === 'aim') {
    fillRound(ctx, W - 40, 120, 18, 220, 9, 'rgba(0,0,0,0.15)');
    const h = 220 * s.power;
    fillRound(ctx, W - 40, 340 - h, 18, h, 9, s.power > 0.8 ? '#ef4444' : s.power > 0.45 ? '#f59e0b' : '#22c55e');
    text(ctx, 'Power', W - 31, 356, { size: 12, color: '#78350f' });
  }
  if (s.result) text(ctx, s.result.text, W / 2, 150, { size: 26, color: s.result.ok ? '#15803d' : '#b91c1c' });
  text(ctx, String(s.score), W / 2, 44, { size: 32, color: '#78350f' });
  text(ctx, '❤'.repeat(Math.max(0, s.lives)), 48, 44, { size: 20, color: '#dc2626' });
}

export const spec: ArcadeSpec<State> = {
  width: W,
  height: H,
  create,
  update,
  render,
  hud: (s) => [
    { label: 'Score', value: s.score },
    { label: 'Streak', value: s.streak },
    { label: 'Lives', value: s.lives },
  ],
  result: (s) => ({
    score: s.score,
    title: 'Out of bottles',
    details: [
      { label: 'Successful flips', value: String(s.flips) },
      { label: 'Best streak', value: String(s.bestStreak) },
      { label: 'Double flips', value: String(s.doubles) },
    ],
  }),
  onEnd: (s) => {
    void reportProgress('bottle-flip.first', s.flips);
    void reportProgress('bottle-flip.streak-5', s.bestStreak);
    void reportProgress('bottle-flip.double', s.doubles);
    void incrementProgress('bottle-flip.total', s.flips);
  },
  touch: { pad: 'none' },
  pointerStarts: true,
  startHint: 'Hold to charge the power meter, release to flip. Land it upright!',
};
