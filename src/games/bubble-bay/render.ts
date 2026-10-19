import { circle, drawSparks, fillRound, text } from '../_shared/arcade/draw';
import { transitionProgress } from '../_shared/arena/flow';
import { COLS, H, ROWS, T, W, glyph } from '../_shared/arena/stage';
import type { Stage } from '../_shared/arena/stage';
import { BOSS_INFO, bossBubbleRadius } from './bosses';
import { AREAS, BLOCKS, areaOf } from './stages';
import type { Boss, Bubble, Critter, CritterKind, Ink, State } from './types';

/* ------------------------------------------------------------ backdrop */

const SEAS = [
  { top: '#1fb3df', bottom: '#0b4a73', haze: 'rgba(255,255,255,0.07)' },
  { top: '#12998a', bottom: '#04302c', haze: 'rgba(220,255,240,0.06)' },
  { top: '#1d3c8c', bottom: '#030716', haze: 'rgba(200,220,255,0.035)' },
];

function coralFan(ctx: CanvasRenderingContext2D, x: number, y: number, h: number) {
  ctx.beginPath();
  for (let k = -2; k <= 2; k++) {
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + k * 5, y - h * 0.6, x + k * 9, y - h + Math.abs(k) * 4);
  }
  ctx.stroke();
}

function backdrop(ctx: CanvasRenderingContext2D, area: number, t: number) {
  const sea = SEAS[area];
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, sea.top);
  g.addColorStop(1, sea.bottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  // Light slanting down from the surface.
  ctx.fillStyle = sea.haze;
  for (let i = 0; i < 5; i++) {
    const x = 16 + i * 68 + Math.sin(t * 0.4 + i * 1.7) * 12;
    ctx.beginPath();
    ctx.moveTo(x - 8, 0);
    ctx.lineTo(x + 10, 0);
    ctx.lineTo(x + 46, H);
    ctx.lineTo(x + 6, H);
    ctx.fill();
  }
  if (area === 0) {
    // Sand banks and coral fans.
    ctx.fillStyle = 'rgba(253,230,138,0.13)';
    for (const [x, w] of [
      [50, 120],
      [190, 150],
      [300, 90],
    ]) {
      ctx.beginPath();
      ctx.ellipse(x, H - 14, w / 2, 24, 0, Math.PI, 0);
      ctx.fill();
    }
    ctx.strokeStyle = 'rgba(251,113,133,0.2)';
    ctx.lineWidth = 2;
    for (const x of [40, 118, 232, 292]) coralFan(ctx, x, H - 18, 30);
  } else if (area === 1) {
    // Swaying kelp.
    ctx.strokeStyle = 'rgba(74,222,128,0.17)';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    for (let i = 0; i < 9; i++) {
      const x = 18 + i * 37;
      const h = 120 + ((i * 53) % 80);
      ctx.beginPath();
      ctx.moveTo(x, H - 16);
      for (let y = 0; y <= h; y += 12) ctx.lineTo(x + Math.sin(t * 1.2 + i + y * 0.05) * y * 0.06, H - 16 - y);
      ctx.stroke();
    }
    ctx.lineCap = 'butt';
  } else {
    // Rock spires and glowing specks.
    ctx.fillStyle = 'rgba(148,163,184,0.08)';
    for (let i = 0; i < 6; i++) {
      const x = 26 + i * 56;
      const h = 70 + ((i * 47) % 70);
      ctx.beginPath();
      ctx.moveTo(x - 18, H - 16);
      ctx.lineTo(x - 4, H - 16 - h);
      ctx.lineTo(x + 6, H - 24 - h);
      ctx.lineTo(x + 18, H - 16);
      ctx.fill();
    }
    for (let i = 0; i < 18; i++) {
      const a = 0.25 + 0.25 * Math.sin(t * 2 + i * 1.3);
      circle(ctx, (i * 67.3) % W, 30 + ((i * 41.9) % (H - 60)), 1.2, `rgba(103,232,249,${a.toFixed(2)})`);
    }
  }
  // Tiny bubbles drifting up in the distance.
  ctx.strokeStyle = 'rgba(255,255,255,0.22)';
  ctx.lineWidth = 0.8;
  for (let i = 0; i < 14; i++) {
    const y = H - ((t * (14 + (i % 4) * 5) + i * 53) % (H + 20));
    const x = ((i * 71.7) % (W - 40)) + 20 + Math.sin(t * 1.5 + i) * 4;
    ctx.beginPath();
    ctx.arc(x, y, 1 + (i % 3) * 0.7, 0, Math.PI * 2);
    ctx.stroke();
  }
}

/* --------------------------------------------------------------- tiles */

function drawTiles(ctx: CanvasRenderingContext2D, stage: Stage, palette: [string, string, string]) {
  const [main, light, dark] = palette;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const g = stage.tiles[r * COLS + c];
      const x = c * T;
      const y = r * T;
      if (g === '#') {
        // Chunky coral rock.
        fillRound(ctx, x, y, T, T, 3, dark);
        fillRound(ctx, x + 1, y + 1, T - 2, T - 3, 3, main);
        const k = (c * 7 + r * 3) % 4;
        circle(ctx, x + 4 + k, y + 5, 1.8, light);
        circle(ctx, x + 11 - k, y + 10, 1.2, light);
        if (r > 0 && glyph(stage, c, r - 1) !== '#') {
          ctx.fillStyle = light;
          ctx.fillRect(x + 1, y, T - 2, 2);
        }
      } else if (g === '=') {
        fillRound(ctx, x, y + 1, T, 9, 3, dark);
        fillRound(ctx, x, y, T, 7, 3, main);
        ctx.fillStyle = light;
        ctx.fillRect(x + 2, y + 1, T - 4, 1.5);
        // Weed hanging under the odd ledge.
        if ((c * 5 + r) % 3 === 0) {
          ctx.strokeStyle = 'rgba(74,222,128,0.55)';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(x + 8, y + 9);
          ctx.quadraticCurveTo(x + 5, y + 12, x + 8, y + 15);
          ctx.stroke();
        }
      }
    }
  }
}

/* ---------------------------------------------------------------- Ollie */

export function drawOtter(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  facing: number,
  t: number,
  o: { moving?: boolean; blow?: boolean; dead?: boolean; shield?: boolean } = {},
) {
  const f = facing < 0 ? -1 : 1;
  const cx = x + 7;
  const by = y + 14;
  ctx.save();
  if (o.dead) {
    ctx.translate(cx, by - 7);
    ctx.rotate(Math.PI);
    ctx.translate(-cx, -(by - 7));
  }
  const step = o.moving ? Math.sin(t * 16) * 1.6 : 0;
  // Tail.
  ctx.fillStyle = '#6b4226';
  ctx.beginPath();
  ctx.ellipse(cx - f * 7, by - 3.5, 4.6, 2, -f * 0.5, 0, Math.PI * 2);
  ctx.fill();
  // Feet.
  fillRound(ctx, cx - 5 + step, by - 2.5, 4.5, 2.5, 1.2, '#4a2c17');
  fillRound(ctx, cx + 0.5 - step, by - 2.5, 4.5, 2.5, 1.2, '#4a2c17');
  // Body, cream belly and paws held together.
  ctx.fillStyle = '#8b5e3c';
  ctx.beginPath();
  ctx.ellipse(cx, by - 6.5, 6, 5.8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#f1dfbf';
  ctx.beginPath();
  ctx.ellipse(cx + f * 1.4, by - 6, 3.6, 4.2, 0, 0, Math.PI * 2);
  ctx.fill();
  circle(ctx, cx + f * 3.2, by - 7.5, 1.7, '#6b4226');
  // Head with round ears.
  const hx = cx + f * 1.6;
  const hy = by - 12.5;
  circle(ctx, hx - f * 3.4, hy - 4, 1.8, '#6b4226');
  circle(ctx, hx + f * 2, hy - 4.6, 1.8, '#6b4226');
  circle(ctx, hx, hy, 5.2, '#8b5e3c');
  // Muzzle — the cheeks puff out while blowing a bubble.
  const puff = o.blow ? 1 : 0;
  ctx.fillStyle = '#f1dfbf';
  ctx.beginPath();
  ctx.ellipse(hx + f * 3, hy + 1.2, 3 + puff, 2.4 + puff * 0.6, 0, 0, Math.PI * 2);
  ctx.fill();
  circle(ctx, hx + f * 5.6, hy, 1.15, '#1c1917');
  if (puff) circle(ctx, hx + f * 6.2, hy + 2.4, 1, '#3f1d0b');
  // Eye.
  if (o.dead) {
    ctx.strokeStyle = '#1c1917';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(hx + f * 0.8, hy - 2.6);
    ctx.lineTo(hx + f * 2.6, hy - 0.8);
    ctx.moveTo(hx + f * 2.6, hy - 2.6);
    ctx.lineTo(hx + f * 0.8, hy - 0.8);
    ctx.stroke();
  } else {
    circle(ctx, hx + f * 1.6, hy - 1.6, 1.15, '#1c1917');
    circle(ctx, hx + f * 1.9, hy - 2, 0.4, '#ffffff');
  }
  // Whiskers.
  ctx.strokeStyle = 'rgba(255,255,255,0.7)';
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(hx + f * 4.5, hy + 1);
  ctx.lineTo(hx + f * 8.5, hy + 0.2);
  ctx.moveTo(hx + f * 4.5, hy + 1.8);
  ctx.lineTo(hx + f * 8.5, hy + 2.6);
  ctx.stroke();
  ctx.restore();
  if (o.shield) {
    ctx.strokeStyle = `rgba(253,224,71,${(0.6 + 0.3 * Math.sin(t * 12)).toFixed(2)})`;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(cx, y + 7, 12, 0, Math.PI * 2);
    ctx.stroke();
  }
}

/* -------------------------------------------------------------- critters */

const CRITTER_COLORS: Record<CritterKind, [string, string]> = {
  crab: ['#f97316', '#c2410c'],
  puffer: ['#facc15', '#a16207'],
  jelly: ['#f0abfc', '#c026d3'],
  squid: ['#a78bfa', '#6d28d9'],
  eel: ['#4ade80', '#15803d'],
};

/** Draws a critter standing on (cx, by): its feet, or the bottom of its box. */
function drawCritterBody(ctx: CanvasRenderingContext2D, kind: CritterKind, cx: number, by: number, dir: number, t: number, seed: number, angry: boolean, grounded: boolean) {
  const [base, dark] = CRITTER_COLORS[kind];
  const main = angry ? '#ef4444' : base;
  const d = dir < 0 ? -1 : 1;
  switch (kind) {
    case 'crab': {
      const step = Math.sin(t * 16 + seed) * 1.2;
      ctx.strokeStyle = dark;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      for (const k of [-1, 1]) {
        for (let l = 0; l < 3; l++) {
          ctx.moveTo(cx + k * (2 + l * 2), by - 4);
          ctx.lineTo(cx + k * (5 + l * 2), by - (l === 1 ? 1 + step : 1 - step));
        }
      }
      ctx.stroke();
      ctx.fillStyle = main;
      ctx.beginPath();
      ctx.ellipse(cx, by - 5.5, 6.8, 4.2, 0, 0, Math.PI * 2);
      ctx.fill();
      for (const k of [-1, 1]) {
        circle(ctx, cx + k * 7.5, by - 9, 2.8, main);
        ctx.fillStyle = dark;
        ctx.beginPath();
        ctx.moveTo(cx + k * 7.5, by - 9);
        ctx.lineTo(cx + k * 10.5, by - 10.8);
        ctx.lineTo(cx + k * 10.5, by - 8.3);
        ctx.fill();
      }
      ctx.strokeStyle = dark;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx - 2, by - 8);
      ctx.lineTo(cx - 2.5, by - 12);
      ctx.moveTo(cx + 2, by - 8);
      ctx.lineTo(cx + 2.5, by - 12);
      ctx.stroke();
      for (const k of [-1, 1]) {
        circle(ctx, cx + k * 2.5, by - 12.5, 1.8, '#fff');
        circle(ctx, cx + k * 2.5 + d * 0.6, by - 12.5, 0.9, '#111');
      }
      break;
    }
    case 'puffer': {
      const pr = 5.8 + (grounded ? 0 : 0.8) + Math.sin(t * 6 + seed) * 0.3;
      const cy = by - 7;
      ctx.fillStyle = dark;
      for (let k = 0; k < 10; k++) {
        const a = (k / 10) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a - 0.17) * pr, cy + Math.sin(a - 0.17) * pr);
        ctx.lineTo(cx + Math.cos(a) * (pr + 2.6), cy + Math.sin(a) * (pr + 2.6));
        ctx.lineTo(cx + Math.cos(a + 0.17) * pr, cy + Math.sin(a + 0.17) * pr);
        ctx.fill();
      }
      ctx.fillStyle = main;
      ctx.beginPath();
      ctx.moveTo(cx - d * pr, cy);
      ctx.lineTo(cx - d * (pr + 5), cy - 3.5);
      ctx.lineTo(cx - d * (pr + 5), cy + 3.5);
      ctx.fill();
      circle(ctx, cx, cy, pr, main);
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      ctx.beginPath();
      ctx.ellipse(cx, cy + 2.2, pr * 0.7, pr * 0.42, 0, 0, Math.PI * 2);
      ctx.fill();
      circle(ctx, cx + d * 2.4, cy - 1.6, 2, '#fff');
      circle(ctx, cx + d * 2.9, cy - 1.6, 1, '#111');
      circle(ctx, cx + d * pr, cy + 1, 1.2, '#fb923c');
      break;
    }
    case 'jelly': {
      const pulse = Math.sin(t * 5 + seed) * 0.8;
      ctx.save();
      ctx.globalAlpha *= 0.88;
      ctx.strokeStyle = main;
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      for (let k = -3; k <= 3; k += 2) {
        ctx.moveTo(cx + k * 1.4, by - 8);
        for (let yy = 2; yy <= 8; yy += 2) ctx.lineTo(cx + k * 1.4 + Math.sin(t * 6 + k + yy * 0.6 + seed) * 1.2, by - 8 + yy);
      }
      ctx.stroke();
      ctx.fillStyle = main;
      ctx.beginPath();
      ctx.ellipse(cx, by - 8, 6.5 + pulse * 0.5, 5.5 - pulse * 0.3, 0, Math.PI, 0);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      ctx.beginPath();
      ctx.ellipse(cx - 2, by - 11, 2, 1.2, -0.4, 0, Math.PI * 2);
      ctx.fill();
      circle(ctx, cx - 2 + d * 0.5, by - 9.2, 0.9, '#3b0764');
      circle(ctx, cx + 2 + d * 0.5, by - 9.2, 0.9, '#3b0764');
      break;
    }
    case 'squid': {
      const cy = by - 8;
      ctx.strokeStyle = dark;
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      for (let k = -3; k <= 3; k += 2) {
        ctx.moveTo(cx + k, cy + 3);
        ctx.quadraticCurveTo(cx + k * 1.6 + Math.sin(t * 8 + k + seed), cy + 6, cx + k * 1.8, by);
      }
      ctx.stroke();
      ctx.fillStyle = main;
      ctx.beginPath();
      ctx.moveTo(cx, cy - 9.5);
      ctx.lineTo(cx + 4.8, cy - 4);
      ctx.lineTo(cx - 4.8, cy - 4);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(cx, cy - 1, 4.6, 5.4, 0, 0, Math.PI * 2);
      ctx.fill();
      for (const k of [-1, 1]) {
        circle(ctx, cx + k * 1.8 + d * 0.6, cy + 0.5, 1.7, '#fff');
        circle(ctx, cx + k * 1.8 + d * 1.1, cy + 0.6, 0.85, '#111');
      }
      break;
    }
    case 'eel': {
      const cy = by - 6;
      ctx.strokeStyle = main;
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      for (let k = 0; k <= 6; k++) {
        const xx = cx - d * (k * 2.2 - 4);
        const yy = cy + Math.sin(t * 10 + k * 0.9 + seed) * k * 0.45;
        if (k === 0) ctx.moveTo(xx, yy);
        else ctx.lineTo(xx, yy);
      }
      ctx.stroke();
      ctx.lineCap = 'butt';
      circle(ctx, cx + d * 4.5, cy - 0.5, 3.4, main);
      circle(ctx, cx + d * 5.5, cy - 1.5, 1.2, '#fff');
      circle(ctx, cx + d * 5.9, cy - 1.5, 0.6, '#111');
      ctx.strokeStyle = dark;
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(cx + d * 5.2, cy + 1);
      ctx.lineTo(cx + d * 7.6, cy + 0.4);
      ctx.stroke();
      break;
    }
  }
}

function drawCritter(ctx: CanvasRenderingContext2D, c: Critter, t: number, hurry: boolean) {
  if (c.state === 'trapped') return; // drawn inside its bubble
  const cx = c.x + c.w / 2;
  const by = c.y + c.h;
  if (c.state === 'spawn') {
    ctx.save();
    ctx.globalAlpha = Math.max(0.15, 1 - c.timer);
    drawCritterBody(ctx, c.kind, cx, by, c.dir, t, c.seed, false, true);
    ctx.restore();
    return;
  }
  if (c.state === 'out') {
    ctx.save();
    ctx.translate(cx, c.y + c.h / 2);
    ctx.rotate(c.spin * 2);
    ctx.translate(-cx, -(c.y + c.h / 2));
    drawCritterBody(ctx, c.kind, cx, by, c.dir, t, c.seed, false, true);
    ctx.restore();
    return;
  }
  drawCritterBody(ctx, c.kind, cx, by, c.dir, t, c.seed, c.angry || hurry, c.onGround);
}

/* --------------------------------------------------------------- bubbles */

function bubbleShape(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, fill: string, edge: string, width = 1.1) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = edge;
  ctx.lineWidth = width;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.75)';
  ctx.lineWidth = Math.max(1.2, r * 0.12);
  ctx.beginPath();
  ctx.arc(x, y, r * 0.68, Math.PI * 1.08, Math.PI * 1.42);
  ctx.stroke();
  circle(ctx, x - r * 0.12, y - r * 0.7, Math.max(1, r * 0.1), 'rgba(255,255,255,0.85)');
}

function drawBubble(ctx: CanvasRenderingContext2D, b: Bubble, t: number) {
  const warn = !!b.critter && b.life < 2.5;
  const r = b.r + (warn ? Math.sin(t * 30) * 0.7 : 0) + (b.state === 'pop' ? 1.5 : 0);
  if (b.critter) {
    const c = b.critter;
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.scale(0.8, 0.8);
    ctx.rotate(Math.sin(t * 3 + b.wob) * 0.25);
    drawCritterBody(ctx, c.kind, 0, 7, c.dir, t * 0.5, c.seed, warn && Math.floor(t * 8) % 2 === 0, true);
    ctx.restore();
  }
  const edge = warn ? (Math.floor(t * 10) % 2 ? '#fda4af' : '#ffffff') : 'rgba(255,255,255,0.9)';
  bubbleShape(ctx, b.x, b.y, r, b.critter ? 'rgba(186,230,253,0.3)' : 'rgba(186,230,253,0.16)', edge, b.state === 'shoot' ? 1.4 : 1.1);
}

/* ------------------------------------------------------------------ boss */

function drawKingCrab(ctx: CanvasRenderingContext2D, b: Boss, t: number) {
  const cx = b.x + b.w / 2;
  const by = b.y + b.h;
  const d = b.vx < 0 ? -1 : 1;
  ctx.strokeStyle = '#991b1b';
  ctx.lineWidth = 2.4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  for (const k of [-1, 1]) {
    for (let l = 0; l < 3; l++) {
      const lx = cx + k * (7 + l * 5);
      ctx.moveTo(lx, by - 10);
      ctx.lineTo(lx + k * 5, by - 5 + Math.sin(t * 10 + l + k) * 2);
      ctx.lineTo(lx + k * 7, by);
    }
  }
  ctx.stroke();
  // Arms up to the claws.
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (const k of [-1, 1]) {
    ctx.moveTo(cx + k * 12, by - 14);
    ctx.lineTo(cx + k * 18, b.y + 12);
  }
  ctx.stroke();
  ctx.lineCap = 'butt';
  ctx.fillStyle = '#dc2626';
  ctx.beginPath();
  ctx.ellipse(cx, by - 13, 17, 10, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#f87171';
  ctx.beginPath();
  ctx.ellipse(cx - 4, by - 16, 9, 3.6, -0.2, 0, Math.PI * 2);
  ctx.fill();
  const snap = Math.sin(t * 6) * 0.3;
  for (const k of [-1, 1]) {
    ctx.save();
    ctx.translate(cx + k * 18, b.y + 8);
    ctx.rotate(k * snap);
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.ellipse(0, 0, 6, 7.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#7f1d1d';
    ctx.beginPath();
    ctx.moveTo(0, -1);
    ctx.lineTo(k * 2.5, -8);
    ctx.lineTo(-k * 2, -8);
    ctx.fill();
    ctx.restore();
  }
  // Eyes on stalks either side of a little crown.
  ctx.strokeStyle = '#991b1b';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(cx - 6, by - 20);
  ctx.lineTo(cx - 9, by - 27);
  ctx.moveTo(cx + 6, by - 20);
  ctx.lineTo(cx + 9, by - 27);
  ctx.stroke();
  for (const k of [-1, 1]) {
    circle(ctx, cx + k * 9, by - 28, 3, '#fff');
    circle(ctx, cx + k * 9 + d, by - 28, 1.5, '#111');
  }
  ctx.fillStyle = '#facc15';
  ctx.beginPath();
  ctx.moveTo(cx - 5, by - 21);
  ctx.lineTo(cx - 5, by - 27);
  ctx.lineTo(cx - 2.5, by - 24.5);
  ctx.lineTo(cx, by - 29);
  ctx.lineTo(cx + 2.5, by - 24.5);
  ctx.lineTo(cx + 5, by - 27);
  ctx.lineTo(cx + 5, by - 21);
  ctx.fill();
}

function drawRay(ctx: CanvasRenderingContext2D, b: Boss, t: number) {
  const cx = b.x + b.w / 2;
  const cy = b.y + b.h / 2;
  const d = b.vx < 0 ? -1 : 1;
  const flap = Math.sin(t * 5) * 4;
  // Tail with a sparking tip.
  ctx.strokeStyle = '#1e3a8a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx - d * 12, cy);
  ctx.quadraticCurveTo(cx - d * 24, cy + 6 + flap * 0.5, cx - d * 30, cy - 3);
  ctx.stroke();
  circle(ctx, cx - d * 30, cy - 3, 2.4, Math.floor(t * 12) % 2 ? '#fde047' : '#fef9c3');
  // Wings.
  ctx.fillStyle = '#1d4ed8';
  ctx.beginPath();
  ctx.moveTo(cx + d * 20, cy);
  ctx.quadraticCurveTo(cx + d * 6, cy - 6, cx - d * 2, cy - 15 - flap);
  ctx.quadraticCurveTo(cx - d * 6, cy - 6, cx - d * 14, cy);
  ctx.quadraticCurveTo(cx - d * 6, cy + 6, cx - d * 2, cy + 15 + flap);
  ctx.quadraticCurveTo(cx + d * 6, cy + 6, cx + d * 20, cy);
  ctx.fill();
  ctx.fillStyle = '#60a5fa';
  ctx.beginPath();
  ctx.ellipse(cx + d * 3, cy, 9, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  // Lightning stripe.
  ctx.strokeStyle = '#facc15';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(cx - d * 8, cy - 2);
  ctx.lineTo(cx - d * 3, cy + 2);
  ctx.lineTo(cx + d * 1, cy - 2);
  ctx.lineTo(cx + d * 6, cy + 2);
  ctx.lineTo(cx + d * 10, cy - 2);
  ctx.stroke();
  // Head fins and eyes.
  ctx.fillStyle = '#1e40af';
  for (const k of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(cx + d * 16, cy + k * 2);
    ctx.lineTo(cx + d * 23, cy + k * 5);
    ctx.lineTo(cx + d * 17, cy + k * 5.5);
    ctx.fill();
  }
  circle(ctx, cx + d * 13, cy - 3.5, 2.2, '#fff');
  circle(ctx, cx + d * 13.6, cy - 3.5, 1.1, '#111');
  circle(ctx, cx + d * 13, cy + 3.5, 2.2, '#fff');
  circle(ctx, cx + d * 13.6, cy + 3.5, 1.1, '#111');
}

function drawKraken(ctx: CanvasRenderingContext2D, b: Boss, t: number) {
  const cx = b.x + b.w / 2;
  const top = b.y;
  ctx.strokeStyle = '#7e22ce';
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  for (let k = 0; k < 6; k++) {
    const x0 = cx - 15 + k * 6;
    ctx.beginPath();
    ctx.moveTo(x0, top + 28);
    ctx.quadraticCurveTo(x0 + Math.sin(t * 3 + k) * 8, top + 38, x0 + (k - 2.5) * 4 + Math.sin(t * 3 + k + 1) * 6, top + 48);
    ctx.stroke();
  }
  ctx.lineCap = 'butt';
  ctx.fillStyle = '#9333ea';
  ctx.beginPath();
  ctx.ellipse(cx, top + 18, 22, 18, 0, 0, Math.PI * 2);
  ctx.fill();
  for (const [dx, dy, r] of [
    [-10, 8, 2.5],
    [7, 5, 3],
    [14, 14, 2],
    [-15, 18, 2],
  ]) {
    circle(ctx, cx + dx, top + dy, r, '#c084fc');
  }
  for (const k of [-1, 1]) {
    circle(ctx, cx + k * 8, top + 21, 5, '#fde047');
    ctx.fillStyle = '#111';
    ctx.fillRect(cx + k * 8 - 1, top + 17, 2, 8);
    ctx.strokeStyle = '#3b0764';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(cx + k * 3, top + 14);
    ctx.lineTo(cx + k * 13, top + 13);
    ctx.stroke();
  }
}

function drawBoss(ctx: CanvasRenderingContext2D, b: Boss, t: number) {
  const cx = b.x + b.w / 2;
  const cy = b.y + b.h / 2;
  ctx.save();
  if (b.state === 'popped') {
    ctx.translate(cx, cy);
    ctx.rotate(b.t * 6);
    ctx.translate(-cx, -cy);
  }
  if (b.hurt > 0 && Math.floor(t * 30) % 2 === 0) ctx.globalAlpha = 0.55;
  if (b.kind === 'crab') drawKingCrab(ctx, b, t);
  else if (b.kind === 'ray') drawRay(ctx, b, t);
  else drawKraken(ctx, b, t);
  ctx.restore();
  if (b.state === 'trapped') {
    const r = bossBubbleRadius(b) + Math.sin(t * 4) * 1.2;
    bubbleShape(ctx, cx, cy, r, 'rgba(186,230,253,0.24)', 'rgba(255,255,255,0.95)', 2);
    // Dizzy stars.
    for (let k = 0; k < 3; k++) {
      const a = t * 3 + (k * Math.PI * 2) / 3;
      text(ctx, '✦', cx + Math.cos(a) * 14, b.y - 2 + Math.sin(a) * 4, { size: 8, color: '#fde047' });
    }
  }
}

function drawBeam(ctx: CanvasRenderingContext2D, b: Boss, t: number) {
  const beam = b.beam;
  if (!beam) return;
  if (beam.warn > 0) {
    ctx.fillStyle = `rgba(253,224,71,${(0.12 + 0.12 * Math.sin(t * 30)).toFixed(2)})`;
    ctx.fillRect(T, beam.y - 9, W - 2 * T, 18);
    return;
  }
  ctx.fillStyle = 'rgba(254,249,195,0.3)';
  ctx.fillRect(T, beam.y - 10, W - 2 * T, 20);
  ctx.strokeStyle = '#fef9c3';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(T, beam.y);
  for (let x = T + 12; x <= W - T; x += 12) ctx.lineTo(x, beam.y + (Math.sin(x + t * 80) > 0 ? 5 : -5));
  ctx.stroke();
}

/* ---------------------------------------------------------------- items */

function wrappedCandy(ctx: CanvasRenderingContext2D, x: number, y: number, color: string) {
  ctx.fillStyle = color;
  for (const k of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(x + k * 3, y);
    ctx.lineTo(x + k * 7, y - 3);
    ctx.lineTo(x + k * 7, y + 3);
    ctx.fill();
  }
  circle(ctx, x, y, 3.8, color);
  circle(ctx, x - 1.2, y - 1.2, 1.1, 'rgba(255,255,255,0.7)');
}

export function drawTreasure(ctx: CanvasRenderingContext2D, kind: string, x: number, y: number) {
  switch (kind) {
    case 'clam':
      ctx.fillStyle = '#f9a8d4';
      ctx.beginPath();
      ctx.ellipse(x, y + 1, 6, 3.6, 0, 0, Math.PI);
      ctx.fill();
      ctx.fillStyle = '#f472b6';
      ctx.beginPath();
      ctx.ellipse(x, y - 1, 6, 4.5, 0, Math.PI, 0);
      ctx.fill();
      circle(ctx, x, y + 1, 2.2, '#ffffff');
      break;
    case 'starfish': {
      ctx.fillStyle = '#fb923c';
      ctx.beginPath();
      for (let k = 0; k < 10; k++) {
        const a = -Math.PI / 2 + (k * Math.PI) / 5;
        const r = k % 2 ? 2.6 : 6.5;
        if (k === 0) ctx.moveTo(x + Math.cos(a) * r, y + 1 + Math.sin(a) * r);
        else ctx.lineTo(x + Math.cos(a) * r, y + 1 + Math.sin(a) * r);
      }
      ctx.closePath();
      ctx.fill();
      circle(ctx, x, y + 1, 1.2, '#fed7aa');
      break;
    }
    case 'pearl':
      circle(ctx, x, y + 1, 4.8, '#cbd5e1');
      circle(ctx, x, y + 0.6, 4.3, '#f8fafc');
      circle(ctx, x - 1.4, y - 1, 1.3, '#ffffff');
      break;
    case 'conch':
      ctx.fillStyle = '#fecdd3';
      ctx.beginPath();
      ctx.moveTo(x - 6, y + 4);
      ctx.quadraticCurveTo(x - 4, y - 5, x + 5, y - 5);
      ctx.quadraticCurveTo(x + 6, y + 2, x - 6, y + 4);
      ctx.fill();
      ctx.strokeStyle = '#fb7185';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x - 2, y - 3);
      ctx.lineTo(x, y + 3);
      ctx.moveTo(x + 2, y - 4);
      ctx.lineTo(x + 3, y + 2);
      ctx.stroke();
      break;
    case 'crown':
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.moveTo(x - 6, y + 4);
      ctx.lineTo(x - 6, y - 3);
      ctx.lineTo(x - 3, y);
      ctx.lineTo(x, y - 5);
      ctx.lineTo(x + 3, y);
      ctx.lineTo(x + 6, y - 3);
      ctx.lineTo(x + 6, y + 4);
      ctx.fill();
      circle(ctx, x, y + 1.5, 1.4, '#ef4444');
      circle(ctx, x - 3.5, y + 2, 1, '#3b82f6');
      circle(ctx, x + 3.5, y + 2, 1, '#3b82f6');
      break;
    case 'chest':
      fillRound(ctx, x - 6, y - 2, 12, 8, 1.5, '#92400e');
      fillRound(ctx, x - 6, y - 5, 12, 4, 2, '#b45309');
      ctx.fillStyle = '#facc15';
      ctx.fillRect(x - 6, y - 1.5, 12, 1.4);
      ctx.fillRect(x - 1, y - 2, 2, 3.5);
      break;
    case 'power-range':
      wrappedCandy(ctx, x, y + 1, '#f472b6');
      break;
    case 'power-rapid':
      wrappedCandy(ctx, x, y + 1, '#60a5fa');
      break;
    case 'power-speed':
      ctx.fillStyle = '#22c55e';
      ctx.beginPath();
      ctx.moveTo(x - 2, y - 5);
      ctx.quadraticCurveTo(x + 7, y - 2, x + 6, y + 5);
      ctx.lineTo(x - 5, y + 5);
      ctx.quadraticCurveTo(x - 6, y, x - 2, y - 5);
      ctx.fill();
      ctx.strokeStyle = '#15803d';
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.moveTo(x - 2, y - 1);
      ctx.lineTo(x - 1, y + 5);
      ctx.moveTo(x + 2, y - 1);
      ctx.lineTo(x + 2.5, y + 5);
      ctx.stroke();
      break;
    case 'power-shield':
      bubbleShape(ctx, x, y + 1, 5.5, 'rgba(253,224,71,0.3)', '#facc15', 1.6);
      break;
  }
}

function drawInk(ctx: CanvasRenderingContext2D, k: Ink, t: number) {
  const x = k.x + k.w / 2;
  const y = k.y + k.h / 2;
  if (k.kind === 'shell') {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(t * 10);
    ctx.fillStyle = '#fb923c';
    ctx.beginPath();
    ctx.arc(0, 1, 5.5, Math.PI, 0);
    ctx.lineTo(0, 4);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#c2410c';
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    for (const a of [-2.4, -1.57, -0.7]) {
      ctx.moveTo(0, 3);
      ctx.lineTo(Math.cos(a) * 5.5, 1 + Math.sin(a) * 5.5);
    }
    ctx.stroke();
    ctx.restore();
    return;
  }
  circle(ctx, x - Math.sign(k.vx) * 4, y + 1, 2, 'rgba(76,29,149,0.45)');
  circle(ctx, x, y, 5, '#3b0764');
  circle(ctx, x - 1, y - 1, 2.6, '#6d28d9');
}

/* ---------------------------------------------------------------- frame */

export function render(ctx: CanvasRenderingContext2D, s: State) {
  const area = areaOf(s.stageIndex);
  const t = s.time;
  backdrop(ctx, area, t);
  const sx = s.shake > 0 ? (Math.random() - 0.5) * 5 : 0;
  ctx.save();
  ctx.translate(sx, 0);

  if (s.phase === 'transition' && s.prev) {
    // Diving deeper: the old level rises away and the next comes up from
    // below, while Ollie rides a bubble to his starting spot.
    const p = transitionProgress(s);
    const e = p * p * (3 - 2 * p);
    ctx.save();
    ctx.translate(0, -e * H);
    drawTiles(ctx, s.prev, BLOCKS[(s.stageIndex + BLOCKS.length - 1) % BLOCKS.length]);
    ctx.restore();
    ctx.save();
    ctx.translate(0, (1 - e) * H);
    drawTiles(ctx, s.stage, BLOCKS[s.stageIndex % BLOCKS.length]);
    ctx.restore();
    const from = s.carry ?? { x: s.hero.x, y: s.hero.y };
    const x = from.x + (s.hero.x - from.x) * e;
    const y = from.y + (s.hero.y - from.y) * e;
    drawOtter(ctx, x, y, s.hero.facing, t, {});
    bubbleShape(ctx, x + 7, y + 6, 13, 'rgba(186,230,253,0.2)', 'rgba(255,255,255,0.9)', 1.3);
    ctx.restore();
    return;
  }

  drawTiles(ctx, s.stage, BLOCKS[s.stageIndex % BLOCKS.length]);
  if (s.boss) drawBeam(ctx, s.boss, t);

  for (const l of s.loot) {
    if (l.life < 2 && Math.floor(l.life * 8) % 2 === 0) continue;
    drawTreasure(ctx, l.kind, l.x + 6, l.y + 6);
  }
  if (s.boss) drawBoss(ctx, s.boss, t);
  for (const c of s.critters) drawCritter(ctx, c, t, s.hurry > 0);
  for (const b of s.bubbles) if (b.state !== 'gone') drawBubble(ctx, b, t);
  for (const k of s.inks) drawInk(ctx, k, t);

  const hero = s.hero;
  const blink = s.invuln > 0 && s.dying === 0 && Math.floor(s.invuln * 12) % 2 === 0;
  if (!blink) {
    drawOtter(ctx, hero.x, hero.y, hero.facing, t, {
      moving: Math.abs(hero.vx) > 1 && hero.onGround,
      blow: s.blow > 0,
      dead: s.dying > 0,
      shield: s.powers.shield > 0,
    });
  }

  if (s.chaser) {
    // The hurry-up urchin.
    const c = s.chaser;
    ctx.strokeStyle = '#581c87';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    for (let k = 0; k < 14; k++) {
      const a = (k / 14) * Math.PI * 2 + c.t * 0.8;
      ctx.moveTo(c.x + Math.cos(a) * 5, c.y + Math.sin(a) * 5);
      ctx.lineTo(c.x + Math.cos(a) * 12, c.y + Math.sin(a) * 12);
    }
    ctx.stroke();
    circle(ctx, c.x, c.y, 7.5, '#3b0764');
    circle(ctx, c.x - 2.6, c.y - 1, 1.8, '#f87171');
    circle(ctx, c.x + 2.6, c.y - 1, 1.8, '#f87171');
  }

  drawSparks(ctx, s.particles);
  for (const p of s.popups) {
    ctx.globalAlpha = Math.min(1, p.life * 2);
    text(ctx, p.text, p.x, p.y, { size: 8, color: p.color });
  }
  ctx.globalAlpha = 1;
  ctx.restore();
  overlays(ctx, s);
}

function overlays(ctx: CanvasRenderingContext2D, s: State) {
  const active: string[] = [];
  if (s.powers.range) active.push('range');
  if (s.powers.rapid) active.push('rapid');
  if (s.powers.speed) active.push('speed');
  if (s.powers.shield > 0) active.push('shield');
  active.forEach((p, i) => drawTreasure(ctx, `power-${p}`, 26 + i * 16, 7));

  const b = s.boss;
  if (b && b.state === 'move' && s.phase === 'play') {
    text(ctx, BOSS_INFO[b.kind].name, W / 2, 6, { size: 8 });
    fillRound(ctx, W / 2 - 60, 11, 120, 5, 2.5, 'rgba(0,0,0,0.5)');
    fillRound(ctx, W / 2 - 59, 12, 118 * (b.hp / b.maxHp), 3, 1.5, '#f43f5e');
  }
  if (s.phase === 'play' && s.hurry === 1 && s.stageTime - Math.floor(s.stageTime) < 0.6) {
    text(ctx, 'HURRY UP!', W / 2, 40, { size: 16, color: '#fde047' });
  }
  if (s.phase === 'intro') {
    const a = Math.min(1, (1.5 - s.phaseTime) * 3);
    ctx.globalAlpha = Math.max(0, a);
    fillRound(ctx, W / 2 - 92, H / 2 - 34, 184, 64, 12, 'rgba(8,47,73,0.78)');
    text(ctx, b ? 'BOSS' : `LEVEL ${s.stageIndex + 1}`, W / 2, H / 2 - 14, { size: 18, color: '#e0f2fe' });
    text(ctx, b ? BOSS_INFO[b.kind].name : AREAS[areaOf(s.stageIndex)], W / 2, H / 2 + 8, { size: 10, color: '#bae6fd', weight: 600 });
    ctx.globalAlpha = 1;
  }
  if (s.phase === 'clear') text(ctx, 'LEVEL CLEAR!', W / 2, H / 2 - 30, { size: 18, color: '#fde68a' });
}
