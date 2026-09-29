import type { DifficultySetting } from '@/types';
import { incrementProgress, reportProgress } from '@/achievements/AchievementService';
import { baseState, circleHit, rectHit } from '../_shared/arcade/kit';
import type { ArcadeSpec, BaseState, Input } from '../_shared/arcade/kit';
import { burst, circle, drawSparks, fillRound, gradientBg, text, updateSparks } from '../_shared/arcade/draw';
import type { Spark } from '../_shared/arcade/draw';

/**
 * Endless Runner: a free-running hero crosses rooftops of different
 * heights. Jump (and double-jump) across gaps, hop over spikes and grab
 * coins. Falling off the rooftops or touching spikes ends the run.
 */
export const W = 640;
export const H = 360;
const PX = 130;
const PW = 26;
const PH = 40;

export interface Platform {
  x: number;
  y: number;
  w: number;
}

export interface Spike {
  x: number;
  y: number;
  w: number;
}

export interface Coin {
  x: number;
  y: number;
  taken: boolean;
}

export interface State extends BaseState {
  y: number;
  vy: number;
  jumps: number;
  grounded: boolean;
  speed: number;
  accel: number;
  maxSpeed: number;
  distance: number;
  platforms: Platform[];
  spikes: Spike[];
  coins: Coin[];
  coinCount: number;
  sparks: Spark[];
  gapScale: number;
}

const SETTINGS: Record<DifficultySetting, { speed: number; accel: number; max: number; gap: number }> = {
  easy: { speed: 250, accel: 5, max: 450, gap: 0.8 },
  normal: { speed: 290, accel: 7, max: 540, gap: 1 },
  hard: { speed: 330, accel: 10, max: 640, gap: 1.15 },
};

export const GRAVITY = 2000;
export const JUMP = -700;

export function create(difficulty: DifficultySetting): State {
  const c = SETTINGS[difficulty];
  return {
    ...baseState(),
    y: 260,
    vy: 0,
    jumps: 0,
    grounded: true,
    speed: c.speed,
    accel: c.accel,
    maxSpeed: c.max,
    distance: 0,
    platforms: [{ x: -20, y: 260, w: 900 }],
    spikes: [],
    coins: [],
    coinCount: 0,
    sparks: [],
    gapScale: c.gap,
  };
}

/** Adds rooftops ahead of the player until the view is filled. */
export function extend(s: State, random: () => number) {
  let last = s.platforms[s.platforms.length - 1];
  while (last.x + last.w < W + 400) {
    // Gaps grow a little with speed but always stay within double-jump reach.
    const gap = (70 + random() * 90) * s.gapScale * (s.speed / 300);
    const y = Math.max(170, Math.min(300, last.y + (random() - 0.5) * 110));
    const w = 220 + random() * 320;
    const p = { x: last.x + last.w + Math.min(gap, 230), y, w };
    s.platforms.push(p);
    if (w > 300 && random() < 0.55) {
      const sx = p.x + 90 + random() * (w - 200);
      s.spikes.push({ x: sx, y, w: 30 + Math.floor(random() * 2) * 24 });
    }
    const n = 3 + Math.floor(random() * 4);
    const arc = random() < 0.5;
    for (let i = 0; i < n; i++) {
      const cx = p.x + 50 + i * 30;
      if (cx > p.x + w - 20) break;
      s.coins.push({ x: cx, y: y - 40 - (arc ? Math.sin((i / (n - 1 || 1)) * Math.PI) * 50 : 0), taken: false });
    }
    last = p;
  }
}

export function update(s: State, dt: number, input: Input, random: () => number) {
  if (input.pressed.has('action') || input.pressed.has('up') || input.pointer.pressed) {
    if (s.jumps < 2) {
      s.vy = s.jumps === 0 ? JUMP : JUMP * 0.85;
      s.jumps += 1;
      s.grounded = false;
      s.events.push('jump');
    }
  }
  s.speed = Math.min(s.maxSpeed, s.speed + s.accel * dt);
  const dx = s.speed * dt;
  s.distance += dx;
  for (const list of [s.platforms, s.spikes, s.coins]) for (const o of list) o.x -= dx;
  s.platforms = s.platforms.filter((p) => p.x + p.w > -50);
  s.spikes = s.spikes.filter((p) => p.x + p.w > -50);
  s.coins = s.coins.filter((c) => c.x > -20);
  extend(s, random);

  const prevFeet = s.y;
  s.vy += GRAVITY * dt;
  s.y += s.vy * dt;
  s.grounded = false;
  // Land on a rooftop when falling through its top edge.
  for (const p of s.platforms) {
    if (PX + PW > p.x && PX < p.x + p.w && prevFeet <= p.y + 2 && s.y >= p.y && s.vy >= 0) {
      s.y = p.y;
      s.vy = 0;
      s.jumps = 0;
      s.grounded = true;
    }
  }
  const body = { x: PX + 4, y: s.y - PH + 4, w: PW - 8, h: PH - 6 };
  for (const sp of s.spikes) {
    if (rectHit(body, { x: sp.x + 4, y: sp.y - 16, w: sp.w - 8, h: 16 })) crash(s, random);
  }
  for (const c of s.coins) {
    if (!c.taken && circleHit(PX + PW / 2, s.y - PH / 2, 22, c.x, c.y, 9)) {
      c.taken = true;
      s.coinCount += 1;
      s.events.push('coin');
      burst(s.sparks, c.x, c.y, '#fde047', 6, 90, random);
    }
  }
  if (s.y > H + 60) crash(s, random);
  updateSparks(s.sparks, dt, 300);
  s.score = Math.floor(s.distance / 20) + s.coinCount * 10;
}

function crash(s: State, random: () => number) {
  if (s.over) return;
  s.over = true;
  s.events.push('hit');
  burst(s.sparks, PX, s.y - 20, '#f87171', 14, 200, random);
}

export function render(ctx: CanvasRenderingContext2D, s: State) {
  gradientBg(ctx, W, H, '#312e81', '#f472b6');
  circle(ctx, 520, 90, 40, 'rgba(254,240,138,0.85)');
  // Far skyline.
  for (let i = 0; i < 9; i++) {
    const x = ((i * 90 - s.distance * 0.2) % (W + 90) + W + 90) % (W + 90) - 45;
    const h = 60 + ((i * 37) % 70);
    ctx.fillStyle = 'rgba(30,27,75,0.55)';
    ctx.fillRect(x, H - 110 - h, 60, h + 110);
  }
  for (const p of s.platforms) {
    ctx.fillStyle = '#1e1b4b';
    ctx.fillRect(p.x, p.y, p.w, H - p.y);
    ctx.fillStyle = '#4c1d95';
    ctx.fillRect(p.x, p.y, p.w, 8);
    ctx.fillStyle = 'rgba(253,224,71,0.6)';
    for (let wx = p.x + 20; wx < p.x + p.w - 20; wx += 34)
      for (let wy = p.y + 26; wy < H; wy += 30) if ((Math.floor(wx) + Math.floor(wy)) % 3) ctx.fillRect(wx, wy, 12, 14);
  }
  ctx.fillStyle = '#e5e7eb';
  for (const sp of s.spikes) {
    for (let x = sp.x; x < sp.x + sp.w - 1; x += 12) {
      ctx.beginPath();
      ctx.moveTo(x, sp.y);
      ctx.lineTo(x + 6, sp.y - 16);
      ctx.lineTo(x + 12, sp.y);
      ctx.fill();
    }
  }
  for (const c of s.coins) if (!c.taken) {
    circle(ctx, c.x, c.y, 8, '#facc15');
    circle(ctx, c.x - 2, c.y - 2, 3, '#fef9c3');
  }
  // Runner.
  if (!s.over || Math.floor(s.time * 10) % 2) {
    const top = s.y - PH;
    fillRound(ctx, PX, top + 12, PW, PH - 18, 8, '#22d3ee');
    circle(ctx, PX + PW / 2, top + 8, 10, '#fde68a');
    ctx.fillStyle = '#0e7490';
    ctx.fillRect(PX + 2, top + 2, PW - 4, 5);
    const stride = s.grounded ? Math.sin(s.distance / 14) * 7 : 4;
    ctx.fillStyle = '#1e3a8a';
    ctx.fillRect(PX + 5 + stride, s.y - 8, 7, 8);
    ctx.fillRect(PX + PW - 12 - stride, s.y - 8, 7, 8);
  }
  drawSparks(ctx, s.sparks);
  text(ctx, `${s.score}`, W - 16, 24, { size: 20, align: 'right' });
  text(ctx, `🪙 ${s.coinCount}`, 16, 24, { size: 16, align: 'left' });
}

export const spec: ArcadeSpec<State> = {
  width: W,
  height: H,
  create,
  update,
  render,
  hud: (s) => [
    { label: 'Score', value: s.score },
    { label: 'Coins', value: s.coinCount },
    { label: 'Distance', value: `${Math.round(s.distance / 50)} m` },
  ],
  result: (s) => ({
    score: s.score,
    title: 'Run over!',
    details: [
      { label: 'Distance', value: `${Math.round(s.distance / 50)} m` },
      { label: 'Coins', value: String(s.coinCount) },
    ],
  }),
  onEnd: (s) => {
    void reportProgress('endless-runner.distance', Math.round(s.distance / 50));
    void reportProgress('endless-runner.coins', s.coinCount);
    void reportProgress('endless-runner.score', s.score);
    void incrementProgress('endless-runner.total-coins', s.coinCount);
  },
  touch: { pad: 'none', buttons: [{ action: 'action', label: 'Jump' }] },
  startHint: 'Space / ↑ / tap to jump — press again in mid-air to double-jump.',
};
