import type { DifficultySetting } from '@/types';
import { reportProgress, incrementProgress } from '@/achievements/AchievementService';
import { baseState } from '../_shared/arcade/kit';
import type { ArcadeSpec, BaseState, Input } from '../_shared/arcade/kit';
import { circle, fillRound, gradientBg, text } from '../_shared/arcade/draw';

/**
 * Whack-a-Mole: moles pop out of nine holes for a moment. Whack them before
 * they duck back down. Golden moles are worth more; hitting a mole in a
 * helmet (the "don't hit" kind) costs points and breaks your combo.
 */
export const W = 420;
export const H = 460;
export const ROUND = 45;

type Kind = 'normal' | 'gold' | 'helmet';

export interface Mole {
  hole: number;
  kind: Kind;
  /** Seconds left above ground. */
  up: number;
  total: number;
  hit: boolean;
  /** Pop animation 0..1. */
  rise: number;
}

export interface State extends BaseState {
  moles: Mole[];
  spawn: number;
  stay: number;
  interval: number;
  combo: number;
  bestCombo: number;
  hits: number;
  misses: number;
  flash: { x: number; y: number; text: string; t: number; color: string }[];
}

const SETTINGS: Record<DifficultySetting, { stay: number; interval: number }> = {
  easy: { stay: 1.25, interval: 0.85 },
  normal: { stay: 0.95, interval: 0.7 },
  hard: { stay: 0.72, interval: 0.55 },
};

export function holeCentre(i: number): [number, number] {
  const col = i % 3;
  const row = Math.floor(i / 3);
  return [80 + col * 130, 150 + row * 110];
}

export function create(difficulty: DifficultySetting): State {
  const s = SETTINGS[difficulty];
  return { ...baseState(), moles: [], spawn: 0.4, stay: s.stay, interval: s.interval, combo: 0, bestCombo: 0, hits: 0, misses: 0, flash: [] };
}

/** Keys 1–9 match the holes like a phone keypad: 1 is top-left. */
export function keyToHole(key: string): number {
  const n = Number(key);
  return n >= 1 && n <= 9 ? n - 1 : -1;
}

export function holeAt(x: number, y: number): number {
  for (let i = 0; i < 9; i++) {
    const [cx, cy] = holeCentre(i);
    if (Math.abs(x - cx) < 58 && y > cy - 70 && y < cy + 30) return i;
  }
  return -1;
}

export function whack(s: State, hole: number) {
  if (hole < 0) return;
  const mole = s.moles.find((m) => m.hole === hole && !m.hit && m.up > 0);
  const [x, y] = holeCentre(hole);
  if (!mole) {
    s.misses += 1;
    s.combo = 0;
    return;
  }
  mole.hit = true;
  mole.up = Math.min(mole.up, 0.25);
  if (mole.kind === 'helmet') {
    s.score = Math.max(0, s.score - 20);
    s.combo = 0;
    s.events.push('failure');
    s.flash.push({ x, y: y - 60, text: '−20', t: 0.8, color: '#f87171' });
    return;
  }
  s.combo += 1;
  s.bestCombo = Math.max(s.bestCombo, s.combo);
  s.hits += 1;
  const base = mole.kind === 'gold' ? 30 : 10;
  const points = base * Math.min(4, 1 + Math.floor(s.combo / 5));
  s.score += points;
  s.events.push(mole.kind === 'gold' ? 'coin' : 'hit');
  s.flash.push({ x, y: y - 60, text: `+${points}`, t: 0.8, color: mole.kind === 'gold' ? '#fde047' : '#fff' });
}

export function update(s: State, dt: number, input: Input, random: () => number) {
  if (input.pointer.pressed) whack(s, holeAt(input.pointer.x, input.pointer.y));
  input.keys.forEach((k) => whack(s, keyToHole(k)));

  // Moles come faster as the round goes on.
  const pace = 1 - Math.min(0.35, s.time / ROUND / 2);
  s.spawn -= dt;
  if (s.spawn <= 0) {
    s.spawn = s.interval * pace * (0.7 + random() * 0.6);
    const free = [...Array(9).keys()].filter((h) => !s.moles.some((m) => m.hole === h));
    if (free.length) {
      const hole = free[Math.floor(random() * free.length)];
      const r = random();
      const kind: Kind = r < 0.1 ? 'gold' : r < 0.25 ? 'helmet' : 'normal';
      const total = s.stay * pace * (kind === 'gold' ? 0.75 : 1);
      s.moles.push({ hole, kind, up: total, total, hit: false, rise: 0 });
    }
  }
  for (const m of s.moles) {
    m.up -= dt;
    m.rise = Math.min(1, m.rise + dt * 8);
    // A good mole that got away breaks the combo.
    if (m.up <= 0 && !m.hit && m.kind !== 'helmet') {
      s.combo = 0;
      m.hit = true;
    }
  }
  s.moles = s.moles.filter((m) => m.up > -0.2);
  for (const f of s.flash) {
    f.t -= dt;
    f.y -= 40 * dt;
  }
  s.flash = s.flash.filter((f) => f.t > 0);
  if (s.time >= ROUND) {
    s.over = true;
    s.events.push('levelComplete');
  }
}

function drawMole(ctx: CanvasRenderingContext2D, m: Mole, x: number, y: number) {
  const visible = m.up > 0 ? m.rise : Math.max(0, 1 + m.up * 5);
  const h = 62 * visible;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x - 60, y - 90, 120, 90);
  ctx.clip();
  const top = y - h;
  const body = m.kind === 'gold' ? '#f59e0b' : '#8b5a2b';
  fillRound(ctx, x - 30, top, 60, 80, 28, body);
  circle(ctx, x, top + 38, 14, m.kind === 'gold' ? '#fde68a' : '#d6a77a');
  circle(ctx, x - 12, top + 22, 5, '#111827');
  circle(ctx, x + 12, top + 22, 5, '#111827');
  circle(ctx, x, top + 32, 6, '#f472b6');
  if (m.hit && m.kind !== 'helmet') {
    ctx.strokeStyle = '#111827';
    ctx.lineWidth = 3;
    for (const dx of [-12, 12]) {
      ctx.beginPath();
      ctx.moveTo(x + dx - 5, top + 17);
      ctx.lineTo(x + dx + 5, top + 27);
      ctx.moveTo(x + dx + 5, top + 17);
      ctx.lineTo(x + dx - 5, top + 27);
      ctx.stroke();
    }
  }
  if (m.kind === 'helmet') {
    ctx.fillStyle = '#6b7280';
    ctx.beginPath();
    ctx.arc(x, top + 14, 30, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(x - 32, top + 12, 64, 6);
  }
  ctx.restore();
}

export function render(ctx: CanvasRenderingContext2D, s: State) {
  gradientBg(ctx, W, H, '#86efac', '#4ade80');
  for (let i = 0; i < 40; i++) {
    ctx.fillStyle = 'rgba(21,128,61,0.35)';
    ctx.fillRect((i * 83) % W, (i * 47) % H, 3, 8);
  }
  text(ctx, `${Math.max(0, Math.ceil(ROUND - s.time))}s`, W - 40, 36, { size: 22, color: '#14532d' });
  if (s.combo >= 5) text(ctx, `Combo ×${Math.min(4, 1 + Math.floor(s.combo / 5))}`, 70, 36, { size: 18, color: '#14532d' });
  for (let i = 0; i < 9; i++) {
    const [x, y] = holeCentre(i);
    ctx.fillStyle = '#3f2a14';
    ctx.beginPath();
    ctx.ellipse(x, y, 52, 18, 0, 0, Math.PI * 2);
    ctx.fill();
    const m = s.moles.find((mm) => mm.hole === i);
    if (m) drawMole(ctx, m, x, y);
    ctx.fillStyle = '#65a30d';
    ctx.beginPath();
    ctx.ellipse(x, y + 6, 58, 14, 0, 0, Math.PI);
    ctx.fill();
    text(ctx, String(i + 1), x + 46, y + 18, { size: 11, color: 'rgba(20,83,45,0.6)' });
  }
  for (const f of s.flash) {
    ctx.globalAlpha = Math.min(1, f.t * 2);
    text(ctx, f.text, f.x, f.y, { size: 22, color: f.color });
  }
  ctx.globalAlpha = 1;
}

export const spec: ArcadeSpec<State> = {
  width: W,
  height: H,
  create,
  update,
  render,
  customKeys: ['1', '2', '3', '4', '5', '6', '7', '8', '9'],
  hud: (s) => [
    { label: 'Score', value: s.score },
    { label: 'Time', value: `${Math.max(0, Math.ceil(ROUND - s.time))}s` },
    { label: 'Combo', value: s.combo },
  ],
  result: (s) => ({
    score: s.score,
    title: "Time's up!",
    details: [
      { label: 'Moles whacked', value: String(s.hits) },
      { label: 'Best combo', value: String(s.bestCombo) },
    ],
  }),
  onEnd: (s) => {
    void reportProgress('whack-a-mole.score-300', s.score);
    void reportProgress('whack-a-mole.score-600', s.score);
    void reportProgress('whack-a-mole.combo', s.bestCombo);
    void incrementProgress('whack-a-mole.total', s.hits);
  },
  touch: { pad: 'none' },
  startHint: 'Tap or click the moles — or use keys 1 to 9. Never hit a mole in a helmet!',
};
