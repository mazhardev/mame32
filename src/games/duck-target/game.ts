import type { DifficultySetting } from '@/types';
import { incrementProgress, reportProgress } from '@/achievements/AchievementService';
import { baseState, clamp } from '../_shared/arcade/kit';
import type { ArcadeSpec, BaseState, Input } from '../_shared/arcade/kit';
import { burst, circle, drawSparks, gradientBg, text, updateSparks } from '../_shared/arcade/draw';
import type { Spark } from '../_shared/arcade/draw';

/**
 * Duck Target: a marsh shooting gallery with cartoon ducks. Each round
 * releases two ducks that flap around and then escape off the top. You have
 * three shots per round. Ten rounds; let more than half the ducks escape in
 * total and the game ends early.
 */
export const W = 480;
export const H = 400;
const REEDS = H - 90;
export const ROUNDS = 10;

export interface Duck {
  x: number;
  y: number;
  vx: number;
  vy: number;
  state: 'flying' | 'falling' | 'escaping' | 'gone';
  timer: number;
  flap: number;
  golden: boolean;
}

export interface State extends BaseState {
  ducks: Duck[];
  round: number;
  shotsLeft: number;
  hits: number;
  escaped: number;
  shots: number;
  pause: number;
  aimX: number;
  aimY: number;
  flash: number;
  speed: number;
  perfectRounds: number;
  roundHits: number;
  sparks: Spark[];
}

const SPEED: Record<DifficultySetting, number> = { easy: 100, normal: 140, hard: 185 };

function release(s: State, random: () => number) {
  s.ducks = [0, 1].map(() => {
    const a = -Math.PI / 2 + (random() - 0.5) * 1.6;
    const sp = s.speed * (1 + s.round * 0.05) * (0.85 + random() * 0.3);
    return { x: 80 + random() * (W - 160), y: REEDS, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, state: 'flying', timer: 4 + random() * 2, flap: random() * 6, golden: random() < 0.12 };
  });
  s.shotsLeft = 3;
  s.roundHits = 0;
}

export function create(difficulty: DifficultySetting, random: () => number = Math.random): State {
  const s: State = {
    ...baseState(),
    ducks: [],
    round: 1,
    shotsLeft: 3,
    hits: 0,
    escaped: 0,
    shots: 0,
    pause: 0,
    aimX: W / 2,
    aimY: H / 2,
    flash: 0,
    speed: SPEED[difficulty],
    perfectRounds: 0,
    roundHits: 0,
    sparks: [],
  };
  release(s, random);
  return s;
}

/** Fires at (x, y). Returns the duck that was hit, if any. */
export function fire(s: State, x: number, y: number, random: () => number = Math.random): Duck | null {
  if (s.shotsLeft <= 0 || s.pause > 0) return null;
  s.shotsLeft -= 1;
  s.shots += 1;
  s.flash = 0.06;
  s.events.push('shoot');
  const duck = s.ducks.find((d) => d.state === 'flying' && Math.abs(d.x - x) < 26 && Math.abs(d.y - y) < 20);
  if (duck) {
    duck.state = 'falling';
    duck.vx = 0;
    duck.vy = -60;
    s.hits += 1;
    s.roundHits += 1;
    s.score += (duck.golden ? 1500 : 500) + (s.round - 1) * 50;
    s.events.push(duck.golden ? 'coin' : 'hit');
    burst(s.sparks, duck.x, duck.y, duck.golden ? '#fde047' : '#f5f5f4', 10, 120, random);
  }
  // Out of shots: the remaining ducks fly away.
  if (s.shotsLeft === 0) for (const d of s.ducks) if (d.state === 'flying') d.state = 'escaping';
  return duck ?? null;
}

export function update(s: State, dt: number, input: Input, random: () => number) {
  if (input.pointer.active) {
    s.aimX = input.pointer.x;
    s.aimY = input.pointer.y;
  }
  const move = 260 * dt;
  if (input.held.has('left')) s.aimX -= move;
  if (input.held.has('right')) s.aimX += move;
  if (input.held.has('up')) s.aimY -= move;
  if (input.held.has('down')) s.aimY += move;
  s.aimX = clamp(s.aimX, 0, W);
  s.aimY = clamp(s.aimY, 0, H);
  s.flash = Math.max(0, s.flash - dt);
  if (input.pointer.pressed) fire(s, input.pointer.x, input.pointer.y, random);
  else if (input.pressed.has('action')) fire(s, s.aimX, s.aimY, random);

  for (const d of s.ducks) {
    d.flap += dt * 12;
    if (d.state === 'flying') {
      d.timer -= dt;
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      // Bounce off the edges and the reeds, change course now and then.
      if (d.x < 20 || d.x > W - 20) d.vx *= -1;
      if (d.y < 20 || d.y > REEDS - 10) d.vy *= -1;
      d.x = clamp(d.x, 20, W - 20);
      d.y = clamp(d.y, 20, REEDS - 10);
      if (random() < dt * 0.8) {
        const a = Math.atan2(d.vy, d.vx) + (random() - 0.5) * 1.6;
        const sp = Math.hypot(d.vx, d.vy);
        d.vx = Math.cos(a) * sp;
        d.vy = Math.sin(a) * sp;
      }
      if (d.timer <= 0) d.state = 'escaping';
    } else if (d.state === 'escaping') {
      d.vx = 0;
      d.vy = -260;
      d.y += d.vy * dt;
      if (d.y < -30) {
        d.state = 'gone';
        s.escaped += 1;
        s.events.push('failure');
      }
    } else if (d.state === 'falling') {
      d.vy += 600 * dt;
      d.y += d.vy * dt;
      if (d.y > REEDS + 10) d.state = 'gone';
    }
  }
  if (s.pause > 0) {
    s.pause -= dt;
    if (s.pause <= 0) {
      if (s.round >= ROUNDS || s.escaped > ROUNDS) {
        s.over = true;
        s.events.push(s.escaped > ROUNDS ? 'gameOver' : 'levelComplete');
        return;
      }
      s.round += 1;
      release(s, random);
    }
  } else if (s.ducks.every((d) => d.state === 'gone')) {
    if (s.roundHits === 2) {
      s.perfectRounds += 1;
      s.score += 1000;
      s.events.push('levelComplete');
    }
    s.pause = 1.4;
  }
  updateSparks(s.sparks, dt, 200);
}

function drawDuck(ctx: CanvasRenderingContext2D, d: Duck) {
  const dir = d.vx >= 0 ? 1 : -1;
  ctx.save();
  ctx.translate(d.x, d.y);
  ctx.scale(dir, d.state === 'falling' ? -1 : 1);
  const body = d.golden ? '#facc15' : '#78350f';
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.ellipse(0, 0, 18, 10, 0, 0, Math.PI * 2);
  ctx.fill();
  circle(ctx, 14, -8, 8, d.golden ? '#fde047' : '#166534');
  ctx.fillStyle = '#f59e0b';
  ctx.beginPath();
  ctx.moveTo(20, -8);
  ctx.lineTo(28, -6);
  ctx.lineTo(20, -4);
  ctx.fill();
  circle(ctx, 16, -10, 1.6, '#000');
  // Flapping wing.
  ctx.fillStyle = d.golden ? '#fef08a' : '#a16207';
  ctx.beginPath();
  ctx.ellipse(-2, -4 - Math.sin(d.flap) * 6, 10, 4 + Math.abs(Math.sin(d.flap)) * 6, -0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function render(ctx: CanvasRenderingContext2D, s: State) {
  gradientBg(ctx, W, H, '#7dd3fc', '#e0f2fe');
  for (const d of s.ducks) if (d.state !== 'gone') drawDuck(ctx, d);
  ctx.fillStyle = '#4d7c0f';
  ctx.fillRect(0, REEDS, W, H - REEDS);
  ctx.fillStyle = '#65a30d';
  for (let x = 0; x < W; x += 14) {
    ctx.beginPath();
    ctx.moveTo(x, REEDS + 4);
    ctx.lineTo(x + 6, REEDS - 26 - ((x * 7) % 18));
    ctx.lineTo(x + 10, REEDS + 4);
    ctx.fill();
  }
  drawSparks(ctx, s.sparks);
  if (s.flash > 0) {
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fillRect(0, 0, W, H);
  }
  ctx.strokeStyle = '#dc2626';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(s.aimX, s.aimY, 16, 0, Math.PI * 2);
  ctx.moveTo(s.aimX - 22, s.aimY);
  ctx.lineTo(s.aimX + 22, s.aimY);
  ctx.moveTo(s.aimX, s.aimY - 22);
  ctx.lineTo(s.aimX, s.aimY + 22);
  ctx.stroke();
  text(ctx, `Round ${s.round}/${ROUNDS}`, 12, H - 60, { size: 15, align: 'left', color: '#f7fee7' });
  text(ctx, `Shots ${'●'.repeat(s.shotsLeft)}${'○'.repeat(3 - s.shotsLeft)}`, 12, H - 36, { size: 15, align: 'left', color: '#f7fee7' });
  text(ctx, `Escaped ${s.escaped}`, W - 12, H - 36, { size: 15, align: 'right', color: '#f7fee7' });
  if (s.pause > 0 && s.roundHits === 2) text(ctx, 'Perfect round! +1000', W / 2, H / 2, { size: 24, color: '#1e3a8a' });
}

export const spec: ArcadeSpec<State> = {
  width: W,
  height: H,
  create,
  update,
  render,
  hud: (s) => [
    { label: 'Score', value: s.score },
    { label: 'Round', value: `${s.round}/${ROUNDS}` },
    { label: 'Hits', value: s.hits },
  ],
  result: (s) => ({
    score: s.score,
    title: s.escaped > ROUNDS ? 'Too many got away!' : 'Season over',
    details: [
      { label: 'Ducks hit', value: `${s.hits} / ${ROUNDS * 2}` },
      { label: 'Accuracy', value: s.shots ? `${Math.round((s.hits / s.shots) * 100)}%` : '–' },
      { label: 'Perfect rounds', value: String(s.perfectRounds) },
    ],
  }),
  onEnd: (s) => {
    void reportProgress('duck-target.hits-15', s.hits);
    void reportProgress('duck-target.perfect', s.perfectRounds);
    void reportProgress('duck-target.all', s.hits >= ROUNDS * 2 ? 1 : 0);
    void incrementProgress('duck-target.total', s.hits);
  },
  touch: { pad: 'none' },
  startHint: 'Click or tap the ducks. Three shots per round — keyboard: arrows aim, Space fires.',
};
