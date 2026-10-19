import { circle, drawSparks, fillRound, text } from '../_shared/arcade/draw';
import { BOSS_INFO } from './bosses';
import { WHEEL_BALL, lavaSpriteAt, wheelBalls } from './enemies';
import { ROWS, TILE, WORLD_NAMES, isSolidGlyph, moverAt } from './levels';
import type { Theme } from './levels';
import { glyphAt } from './player';
import type { Boss, Enemy, Item, Shot, State } from './types';

const VIEW_W = 24 * TILE;
const VIEW_H = ROWS * TILE;

interface Palette {
  top: string;
  bottom: string;
  ground: string;
  groundDark: string;
  cap: string;
  capDark: string;
  brick: string;
  brickLine: string;
  stone: string;
  stoneLight: string;
  stoneDark: string;
  ledge: string;
}

const PAL: Record<Theme, Palette> = {
  meadow: {
    top: '#60c5f5',
    bottom: '#dff4ff',
    ground: '#b7793d',
    groundDark: '#8a5626',
    cap: '#3fbf4f',
    capDark: '#24913a',
    brick: '#d0652b',
    brickLine: '#7f3313',
    stone: '#b9b2a6',
    stoneLight: '#e2ddd3',
    stoneDark: '#7c756a',
    ledge: '#b9722f',
  },
  cave: {
    top: '#231b45',
    bottom: '#0c1024',
    ground: '#5b4f86',
    groundDark: '#3d3463',
    cap: '#8f85c9',
    capDark: '#6c61a8',
    brick: '#4f6aa5',
    brickLine: '#26375f',
    stone: '#7c7aa3',
    stoneLight: '#a9a7cf',
    stoneDark: '#4c4a74',
    ledge: '#8a6a4a',
  },
  sky: {
    top: '#8cb8ff',
    bottom: '#ffe9c7',
    ground: '#c58f58',
    groundDark: '#9c6a3a',
    cap: '#5fd36e',
    capDark: '#36a84d',
    brick: '#e07a45',
    brickLine: '#8c3d17',
    stone: '#d6d0e2',
    stoneLight: '#f4f1fa',
    stoneDark: '#9b94ad',
    ledge: '#fff',
  },
  volcano: {
    top: '#2a0707',
    bottom: '#7a2210',
    ground: '#4a4140',
    groundDark: '#2e2827',
    cap: '#77655f',
    capDark: '#5a4b46',
    brick: '#7f2d22',
    brickLine: '#3d120d',
    stone: '#6f6560',
    stoneLight: '#958a84',
    stoneDark: '#463f3b',
    ledge: '#6b4a32',
  },
  fort: {
    top: '#16131c',
    bottom: '#33293a',
    ground: '#5d5866',
    groundDark: '#3d3945',
    cap: '#7a7585',
    capDark: '#5d5866',
    brick: '#6d3b3b',
    brickLine: '#3a1c1c',
    stone: '#77727f',
    stoneLight: '#9d98a6',
    stoneDark: '#4a4652',
    ledge: '#6b4a32',
  },
};

function hash(c: number, r: number): number {
  const h = Math.sin(c * 127.1 + r * 311.7) * 43758.5453;
  return h - Math.floor(h);
}

/* ----------------------------------------------------------- backdrop */

function backdrop(ctx: CanvasRenderingContext2D, theme: Theme, cam: number, t: number) {
  const p = PAL[theme];
  const g = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  g.addColorStop(0, p.top);
  g.addColorStop(1, p.bottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  const wrap = (x: number, span: number) => ((x % span) + span) % span;

  if (theme === 'meadow' || theme === 'sky') {
    if (theme === 'meadow') {
      circle(ctx, 320, 42, 18, 'rgba(255,244,190,0.9)');
      circle(ctx, 320, 42, 26, 'rgba(255,244,190,0.25)');
    }
    // Clouds.
    for (let i = 0; i < 6; i++) {
      const x = wrap(i * 150 - cam * (0.08 + (i % 3) * 0.04), VIEW_W + 160) - 80;
      const y = 26 + ((i * 53) % 70);
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      for (const [dx, dy, r] of [[0, 0, 12], [14, -6, 15], [30, 0, 12], [15, 4, 12]]) {
        ctx.beginPath();
        ctx.arc(x + dx, y + dy, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    if (theme === 'meadow') {
      // Rolling hills in two layers.
      for (const [k, color, base, rad] of [[0.2, '#9be3b0', 205, 70], [0.45, '#6fd18d', 225, 52]] as const) {
        ctx.fillStyle = color;
        for (let i = -1; i < 6; i++) {
          const x = wrap(i * 150 - cam * k, VIEW_W + 300) - 150;
          ctx.beginPath();
          ctx.arc(x, base, rad, Math.PI, 0);
          ctx.fill();
        }
      }
    } else {
      // Distant floating islands.
      ctx.fillStyle = 'rgba(120,140,190,0.35)';
      for (let i = 0; i < 5; i++) {
        const x = wrap(i * 190 - cam * 0.15, VIEW_W + 200) - 100;
        const y = 120 + ((i * 37) % 60);
        ctx.beginPath();
        ctx.moveTo(x - 34, y);
        ctx.lineTo(x + 34, y);
        ctx.lineTo(x + 10, y + 26);
        ctx.lineTo(x - 8, y + 30);
        ctx.closePath();
        ctx.fill();
        ctx.fillRect(x - 34, y - 6, 68, 6);
      }
    }
  } else if (theme === 'cave') {
    ctx.fillStyle = 'rgba(70,58,120,0.55)';
    for (let i = 0; i < 14; i++) {
      const x = wrap(i * 47 - cam * 0.25, VIEW_W + 60) - 30;
      const len = 24 + ((i * 29) % 46);
      ctx.beginPath();
      ctx.moveTo(x - 10, 30);
      ctx.lineTo(x + 10, 30);
      ctx.lineTo(x, 30 + len);
      ctx.closePath();
      ctx.fill();
    }
    for (let i = 0; i < 26; i++) {
      const x = wrap(i * 61 - cam * 0.4, VIEW_W + 40) - 20;
      const y = 50 + ((i * 83) % 150);
      const a = 0.35 + 0.35 * Math.sin(t * 2 + i);
      circle(ctx, x, y, 1.6, `rgba(140,240,255,${a})`);
    }
  } else if (theme === 'volcano') {
    ctx.fillStyle = '#3a0d0a';
    for (let i = 0; i < 4; i++) {
      const x = wrap(i * 230 - cam * 0.15, VIEW_W + 260) - 130;
      ctx.beginPath();
      ctx.moveTo(x - 110, VIEW_H);
      ctx.lineTo(x - 22, 96);
      ctx.lineTo(x + 22, 96);
      ctx.lineTo(x + 110, VIEW_H);
      ctx.closePath();
      ctx.fill();
      circle(ctx, x, 94, 16, 'rgba(255,120,40,0.25)');
    }
    for (let i = 0; i < 22; i++) {
      const x = wrap(i * 53 - cam * 0.5, VIEW_W);
      const y = VIEW_H - ((t * (20 + (i % 5) * 8) + i * 40) % VIEW_H);
      circle(ctx, x, y, 1.4, 'rgba(255,170,60,0.7)');
    }
  } else {
    // Fortress: dim stone wall with lava-lit windows.
    ctx.fillStyle = 'rgba(255,255,255,0.04)';
    const off = -cam * 0.5;
    for (let r = 0; r < 16; r++) {
      for (let c = -1; c < 14; c++) {
        const x = wrap(c * 32 + (r % 2) * 16 + off, VIEW_W + 32) - 32;
        ctx.fillRect(x + 1, r * 16 + 1, 30, 14);
      }
    }
    for (let i = 0; i < 4; i++) {
      const x = wrap(i * 140 - cam * 0.5, VIEW_W + 140) - 70;
      fillRound(ctx, x, 70, 22, 36, 10, 'rgba(255,110,40,0.22)');
    }
  }
}

/* -------------------------------------------------------------- tiles */

function drawTile(ctx: CanvasRenderingContext2D, s: State, g: string, c: number, r: number, x: number, y: number) {
  const theme = s.level.theme;
  const p = PAL[theme];
  const above = glyphAt(s.grid, s.level.cols, c, r - 1);
  const below = glyphAt(s.grid, s.level.cols, c, r + 1);
  const t = s.levelTime;
  switch (g) {
    case '#': {
      ctx.fillStyle = p.ground;
      ctx.fillRect(x, y, TILE, TILE);
      if (theme === 'fort') {
        ctx.fillStyle = p.groundDark;
        ctx.fillRect(x, y + 7, TILE, 1);
        ctx.fillRect(x, y + 15, TILE, 1);
        ctx.fillRect(x + ((r % 2) * 8 + 3) % 16, y, 1, 7);
        ctx.fillRect(x + ((r % 2) * 8 + 11) % 16, y + 8, 1, 7);
      } else {
        ctx.fillStyle = p.groundDark;
        const h1 = hash(c, r);
        ctx.fillRect(x + 2 + h1 * 9, y + 4 + hash(r, c) * 8, 3, 2);
        ctx.fillRect(x + 9 - h1 * 6, y + 10, 2, 2);
      }
      if (!isSolidGlyph(above)) {
        ctx.fillStyle = p.cap;
        ctx.fillRect(x, y, TILE, 5);
        ctx.fillStyle = p.capDark;
        ctx.fillRect(x, y + 5, TILE, 1);
        if (theme === 'meadow' || theme === 'sky') {
          ctx.fillStyle = p.cap;
          for (let k = 0; k < 3; k++) {
            const bx = x + 2 + k * 5 + hash(c, k) * 2;
            ctx.beginPath();
            ctx.moveTo(bx, y);
            ctx.lineTo(bx + 1.5, y - 3 - hash(k, c) * 2);
            ctx.lineTo(bx + 3, y);
            ctx.fill();
          }
          if (theme === 'meadow' && hash(c, 99) > 0.82) {
            circle(ctx, x + 8, y - 3, 2, hash(c, 7) > 0.5 ? '#fde047' : '#f9a8d4');
          }
        } else if (theme === 'volcano') {
          ctx.fillStyle = `rgba(255,120,40,${0.25 + 0.2 * Math.sin(t * 2 + c)})`;
          ctx.fillRect(x + hash(c, 3) * 10, y + 2, 4, 1);
        }
      }
      if (theme === 'sky' && below === '.' && r < ROWS - 1) {
        ctx.fillStyle = p.groundDark;
        ctx.beginPath();
        ctx.moveTo(x, y + TILE);
        ctx.lineTo(x + TILE, y + TILE);
        ctx.lineTo(x + 8 + hash(c, 5) * 4, y + TILE + 5 + hash(c, 6) * 4);
        ctx.fill();
      }
      return;
    }
    case 'X':
    case 'W': {
      ctx.fillStyle = p.stone;
      ctx.fillRect(x, y, TILE, TILE);
      ctx.fillStyle = p.stoneLight;
      ctx.fillRect(x, y, TILE, 2);
      ctx.fillRect(x, y, 2, TILE);
      ctx.fillStyle = p.stoneDark;
      ctx.fillRect(x, y + TILE - 2, TILE, 2);
      ctx.fillRect(x + TILE - 2, y, 2, TILE);
      if (g === 'W') circle(ctx, x + 8, y + 8, 3, p.stoneDark);
      return;
    }
    case 'T': {
      ctx.fillStyle = '#8b5a2b';
      ctx.fillRect(x + 1, y, TILE - 2, TILE);
      ctx.fillStyle = '#6b4220';
      ctx.fillRect(x + 4, y, 2, TILE);
      ctx.fillRect(x + 10, y + 3, 2, TILE - 3);
      if (above !== 'T') {
        ctx.fillStyle = '#d9a86c';
        ctx.fillRect(x, y, TILE, 4);
        ctx.fillStyle = '#a8743d';
        ctx.fillRect(x + 4, y + 1, 8, 1);
      }
      return;
    }
    case 'B':
    case 'Q': {
      ctx.fillStyle = p.brick;
      ctx.fillRect(x, y, TILE, TILE);
      ctx.fillStyle = p.brickLine;
      ctx.fillRect(x, y + 7, TILE, 1);
      ctx.fillRect(x, y + 15, TILE, 1);
      ctx.fillRect(x + 7, y, 1, 7);
      ctx.fillRect(x + 3, y + 8, 1, 7);
      ctx.fillRect(x + 12, y + 8, 1, 7);
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      ctx.fillRect(x, y, TILE, 1);
      return;
    }
    case '?':
    case 'P':
    case 'U':
    case '*': {
      const shine = 0.5 + 0.5 * Math.sin(t * 4 + c * 0.7);
      fillRound(ctx, x, y, TILE, TILE, 3, '#b7791f');
      fillRound(ctx, x + 1, y + 1, TILE - 2, TILE - 2, 3, `rgb(${240 + shine * 15},${180 + shine * 25},40)`);
      star(ctx, x + 8, y + 8, 5, 2.2, '#fffbe6');
      for (const [dx, dy] of [[3, 3], [13, 3], [3, 13], [13, 13]]) circle(ctx, x + dx, y + dy, 0.9, '#8a5a12');
      return;
    }
    case 'u': {
      fillRound(ctx, x, y, TILE, TILE, 3, '#6b4b32');
      fillRound(ctx, x + 1, y + 1, TILE - 2, TILE - 2, 3, '#8d6748');
      for (const [dx, dy] of [[3, 3], [13, 3], [3, 13], [13, 13]]) circle(ctx, x + dx, y + dy, 0.9, '#4b3322');
      return;
    }
    case '=': {
      if (theme === 'sky') {
        ctx.fillStyle = '#ffffff';
        for (const dx of [3, 8, 13]) circle(ctx, x + dx, y + 5, 5, '#ffffff');
        ctx.fillStyle = 'rgba(160,190,230,0.6)';
        ctx.fillRect(x, y + 8, TILE, 2);
      } else {
        ctx.fillStyle = p.ledge;
        ctx.fillRect(x, y, TILE, 6);
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.fillRect(x, y + 5, TILE, 1);
        ctx.fillRect(x + 15, y, 1, 6);
        circle(ctx, x + 3, y + 3, 0.8, '#3b2a1a');
        circle(ctx, x + 12, y + 3, 0.8, '#3b2a1a');
      }
      return;
    }
    case '^': {
      ctx.fillStyle = p.stoneDark;
      ctx.fillRect(x, y + 11, TILE, 5);
      ctx.fillStyle = '#d4d4d8';
      for (let k = 0; k < 3; k++) {
        ctx.beginPath();
        ctx.moveTo(x + k * 5.33, y + 12);
        ctx.lineTo(x + k * 5.33 + 2.67, y + 1);
        ctx.lineTo(x + (k + 1) * 5.33, y + 12);
        ctx.fill();
      }
      return;
    }
    case '~': {
      const surface = above !== '~';
      ctx.fillStyle = '#c2410c';
      ctx.fillRect(x, y, TILE, TILE);
      if (surface) {
        ctx.fillStyle = '#fb923c';
        ctx.beginPath();
        ctx.moveTo(x, y + 4);
        for (let k = 0; k <= 4; k++) ctx.lineTo(x + k * 4, y + 3 + Math.sin(t * 4 + (c * 4 + k) * 0.9) * 2);
        ctx.lineTo(x + TILE, y + TILE);
        ctx.lineTo(x, y + TILE);
        ctx.fill();
        ctx.fillStyle = '#fde68a';
        ctx.fillRect(x + ((t * 20 + c * 7) % 14), y + 3, 2, 1);
      }
      return;
    }
    case 'C': {
      fillRound(ctx, x, y, TILE, TILE, 2, '#27272a');
      circle(ctx, x + 8, y + 8, 5, '#3f3f46');
      circle(ctx, x + 8, y + 8, 2.5, '#09090b');
      ctx.fillStyle = '#52525b';
      ctx.fillRect(x, y + 2, TILE, 2);
      return;
    }
    case 'J': {
      ctx.fillStyle = '#52525b';
      ctx.fillRect(x + 2, y + 13, 12, 3);
      ctx.strokeStyle = '#a1a1aa';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x + 4, y + 13);
      for (let k = 0; k < 4; k++) ctx.lineTo(x + (k % 2 ? 4 : 12), y + 11 - k * 2.2);
      ctx.stroke();
      fillRound(ctx, x + 1, y + 1, 14, 4, 2, '#ef4444');
      return;
    }
    case 'o': {
      const w = 4 + Math.abs(Math.sin(t * 3 + c * 0.6)) * 3;
      ctx.fillStyle = '#22d3ee';
      ctx.beginPath();
      ctx.moveTo(x + 8, y + 3);
      ctx.lineTo(x + 8 + w, y + 8);
      ctx.lineTo(x + 8, y + 13);
      ctx.lineTo(x + 8 - w, y + 8);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#e0fbff';
      ctx.fillRect(x + 7, y + 5, 2, 3);
      return;
    }
    case 'K':
    case 'k': {
      ctx.fillStyle = '#e5e7eb';
      ctx.fillRect(x + 7, y - TILE, 2, TILE * 2);
      const up = g === 'k';
      ctx.fillStyle = up ? '#22c55e' : '#ef4444';
      ctx.beginPath();
      const fy = up ? y - TILE : y - 2;
      ctx.moveTo(x + 9, fy);
      ctx.lineTo(x + 19, fy + 4);
      ctx.lineTo(x + 9, fy + 8);
      ctx.fill();
      return;
    }
  }
}

function star(ctx: CanvasRenderingContext2D, x: number, y: number, outer: number, inner: number, color: string, rot = -Math.PI / 2) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? inner : outer;
    const a = rot + (i * Math.PI) / 5;
    ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
  }
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

function drawGoal(ctx: CanvasRenderingContext2D, s: State) {
  const gx = s.level.goalX;
  if (gx === null) return;
  const top = 3 * TILE;
  const base = 13 * TILE;
  ctx.fillStyle = '#e5e7eb';
  ctx.fillRect(gx - 1.5, top, 3, base - top);
  circle(ctx, gx, top - 2, 4, '#facc15');
  // Lantern banner.
  const lit = s.phase === 'goal' || s.phase === 'tally';
  const by = lit ? Math.min(base - 24, top + 8 + s.phaseTime * 120) : top + 8;
  ctx.fillStyle = lit ? '#fde047' : '#f97316';
  ctx.beginPath();
  ctx.moveTo(gx + 1.5, by);
  ctx.lineTo(gx + 17, by + 7);
  ctx.lineTo(gx + 1.5, by + 14);
  ctx.fill();
  star(ctx, gx + 7, by + 7, 3.5, 1.5, '#fff');
  fillRound(ctx, gx - 5, base - 6, 10, 6, 2, '#a8a29e');
  // The hut at the end of the level.
  const hx = gx + 5 * TILE;
  fillRound(ctx, hx, base - 34, 46, 34, 3, '#f5e6c8');
  ctx.fillStyle = '#b45309';
  ctx.beginPath();
  ctx.moveTo(hx - 6, base - 32);
  ctx.lineTo(hx + 23, base - 54);
  ctx.lineTo(hx + 52, base - 32);
  ctx.fill();
  fillRound(ctx, hx + 17, base - 20, 12, 20, 5, '#7c2d12');
  fillRound(ctx, hx + 4, base - 26, 9, 8, 2, lit ? '#fde68a' : '#93c5fd');
}

/* ------------------------------------------------------------ actors */

export function drawPip(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  facing: number,
  opts: { big: boolean; spark: boolean; t: number; moving: boolean; air: boolean; star: boolean; dead?: boolean },
) {
  const cx = x + w / 2;
  const body = '#8a5a30';
  const dark = '#6b4220';
  ctx.save();
  if (opts.dead) {
    ctx.translate(cx, y + h / 2);
    ctx.rotate(Math.PI);
    ctx.translate(-cx, -(y + h / 2));
  }
  // Legs.
  const step = opts.moving && !opts.air ? Math.sin(opts.t * 18) * 3 : 0;
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  const legTop = y + h * 0.78;
  ctx.beginPath();
  if (opts.air) {
    ctx.moveTo(cx - 2, legTop);
    ctx.lineTo(cx - 4 - facing * 2, y + h - 1);
    ctx.moveTo(cx + 2, legTop);
    ctx.lineTo(cx - facing * 2, y + h - 1);
  } else {
    ctx.moveTo(cx - 2, legTop);
    ctx.lineTo(cx - 2 + step, y + h);
    ctx.moveTo(cx + 2, legTop);
    ctx.lineTo(cx + 2 - step, y + h);
  }
  ctx.stroke();
  // Body.
  const by = y + h * 0.56;
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.ellipse(cx - facing * 1, by, w * 0.62, h * 0.36, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = dark;
  ctx.lineWidth = 1;
  for (let k = 0; k < 3; k++) {
    ctx.beginPath();
    ctx.arc(cx - facing * (2 + k * 2), by + 1 + k, 3, Math.PI * 0.1, Math.PI * 0.8);
    ctx.stroke();
  }
  // Head.
  const hx = cx + facing * w * 0.36;
  const hy = y + h * (opts.big ? 0.25 : 0.3);
  const hr = w * 0.33;
  circle(ctx, hx, hy, hr, body);
  // Beak: long and slender, the kiwi's pride.
  ctx.strokeStyle = '#f2dfb8';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(hx + facing * hr * 0.7, hy + 1);
  ctx.quadraticCurveTo(hx + facing * (hr + 5), hy + 2, hx + facing * (hr + 9), hy + 5);
  ctx.stroke();
  circle(ctx, hx + facing * 1.5, hy - 1.5, 1.8, '#fff');
  circle(ctx, hx + facing * 2, hy - 1.5, 1, '#111');
  // Scarf with fluttering tails.
  const scarf = opts.spark ? '#f97316' : '#2f6fe4';
  ctx.fillStyle = scarf;
  ctx.fillRect(hx - facing * hr - 3, hy + hr - 2, hr * 2 + 3, 3);
  const flap = Math.sin(opts.t * 14) * 2;
  ctx.beginPath();
  const sx = hx - facing * (hr + 1);
  ctx.moveTo(sx, hy + hr - 2);
  ctx.lineTo(sx - facing * 7, hy + hr - 3 + flap);
  ctx.lineTo(sx - facing * 6, hy + hr + 2 + flap);
  ctx.closePath();
  ctx.fill();
  if (opts.big) {
    // A berry sprout on top of the head.
    ctx.fillStyle = '#22c55e';
    ctx.beginPath();
    ctx.ellipse(hx - facing * 1, hy - hr - 2, 2, 4, facing * 0.5, 0, Math.PI * 2);
    ctx.fill();
  }
  if (opts.spark) circle(ctx, hx - facing * hr, hy + hr, 5, 'rgba(251,146,60,0.25)');
  ctx.restore();
  if (opts.star) {
    ctx.strokeStyle = `hsl(${(opts.t * 500) % 360} 95% 65%)`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(cx, y + h / 2, w * 0.85, h * 0.62, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawEnemy(ctx: CanvasRenderingContext2D, e: Enemy, t: number) {
  const cx = e.x + e.w / 2;
  const by = e.y + e.h;
  const f = e.dir < 0 ? -1 : 1;
  ctx.save();
  if (e.state === 'dead') {
    ctx.translate(cx, e.y + e.h / 2);
    ctx.rotate(Math.PI);
    ctx.translate(-cx, -(e.y + e.h / 2));
  }
  switch (e.kind) {
    case 'beetle': {
      if (e.state === 'flat') {
        ctx.fillStyle = '#991b1b';
        ctx.beginPath();
        ctx.ellipse(cx, by - 2, 8, 2.5, 0, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      const leg = Math.sin(t * 14 + e.x) * 1.5;
      ctx.strokeStyle = '#1c1917';
      ctx.lineWidth = 1.2;
      for (const k of [-4, 0, 4]) {
        ctx.beginPath();
        ctx.moveTo(cx + k, by - 3);
        ctx.lineTo(cx + k + leg, by);
        ctx.stroke();
      }
      ctx.fillStyle = '#c0262d';
      ctx.beginPath();
      ctx.ellipse(cx - f, by - 6, 7, 6, 0, Math.PI, 0);
      ctx.fill();
      ctx.fillRect(cx - 8 - f, by - 6, 14, 3);
      ctx.fillStyle = '#1c1917';
      ctx.fillRect(cx - f - 0.5, by - 12, 1, 9);
      circle(ctx, cx - 4 - f, by - 8, 1.2, '#1c1917');
      circle(ctx, cx + 2 - f, by - 7, 1.2, '#1c1917');
      circle(ctx, cx + f * 7, by - 5, 3.2, '#1c1917');
      circle(ctx, cx + f * 8, by - 6, 0.9, '#fff');
      break;
    }
    case 'snail': {
      const inShell = e.state === 'shell' || e.state === 'slide';
      if (!inShell) {
        ctx.fillStyle = '#bef264';
        fillRound(ctx, cx - 7, by - 5, 14, 5, 2.5, '#bef264');
        ctx.strokeStyle = '#a3e635';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(cx + f * 5, by - 4);
        ctx.lineTo(cx + f * 7, by - 11);
        ctx.stroke();
        circle(ctx, cx + f * 7, by - 11, 1.5, '#1c1917');
      }
      const spin = e.state === 'slide' ? t * 20 : 0;
      ctx.save();
      ctx.translate(cx - (inShell ? 0 : f * 2), by - 7);
      ctx.rotate(spin);
      circle(ctx, 0, 0, 6.5, '#a855f7');
      ctx.strokeStyle = '#6b21a8';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let a = 0; a < Math.PI * 4; a += 0.3) ctx.lineTo(Math.cos(a) * a * 0.5, Math.sin(a) * a * 0.5);
      ctx.stroke();
      ctx.restore();
      break;
    }
    case 'hedgehog': {
      ctx.fillStyle = '#d6d3d1';
      for (let k = -2; k <= 2; k++) {
        ctx.beginPath();
        ctx.moveTo(cx - f + k * 3 - 2, by - 6);
        ctx.lineTo(cx - f + k * 3 - f * 2, by - 13 + Math.abs(k));
        ctx.lineTo(cx - f + k * 3 + 2, by - 6);
        ctx.fill();
      }
      ctx.fillStyle = '#92633a';
      ctx.beginPath();
      ctx.ellipse(cx, by - 5, 7, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      circle(ctx, cx + f * 7, by - 4, 1.6, '#f9a8d4');
      circle(ctx, cx + f * 4, by - 6, 1, '#1c1917');
      const step = Math.sin(t * 14 + e.x) * 1.5;
      ctx.fillStyle = '#5c3d22';
      ctx.fillRect(cx - 4 + step, by - 1.5, 2, 1.5);
      ctx.fillRect(cx + 2 - step, by - 1.5, 2, 1.5);
      break;
    }
    case 'frog': {
      const stretch = e.onGround ? 0 : 2;
      ctx.fillStyle = '#22c55e';
      ctx.beginPath();
      ctx.ellipse(cx, by - 5 - stretch, 7, 5 + stretch, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#bbf7d0';
      ctx.beginPath();
      ctx.ellipse(cx + f * 2, by - 3 - stretch, 4, 2.5, 0, 0, Math.PI * 2);
      ctx.fill();
      for (const k of [-3, 3]) {
        circle(ctx, cx + k, by - 10 - stretch * 2, 2.8, '#22c55e');
        circle(ctx, cx + k, by - 10.5 - stretch * 2, 2, '#fff');
        circle(ctx, cx + k + f * 0.6, by - 10.5 - stretch * 2, 1, '#111');
      }
      break;
    }
    case 'bee': {
      const flap = Math.sin(t * 40) > 0;
      ctx.fillStyle = 'rgba(224,242,254,0.85)';
      ctx.beginPath();
      ctx.ellipse(cx - f * 1, e.y + 2, 4, flap ? 4 : 2, -0.4 * f, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.ellipse(cx, e.y + 7, 7, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#1c1917';
      ctx.fillRect(cx - 2, e.y + 2.5, 2, 9);
      ctx.fillRect(cx - 6 + (f < 0 ? 9 : 0), e.y + 4, 2, 6);
      circle(ctx, cx + f * 5, e.y + 6, 1, '#1c1917');
      ctx.beginPath();
      ctx.moveTo(cx - f * 7, e.y + 6);
      ctx.lineTo(cx - f * 10, e.y + 7);
      ctx.lineTo(cx - f * 7, e.y + 8);
      ctx.fill();
      break;
    }
    case 'bat': {
      const hanging = e.state === 'hang';
      const flap = hanging ? 0 : Math.sin(t * 22) * 4;
      ctx.fillStyle = '#6d28d9';
      ctx.beginPath();
      ctx.moveTo(cx, e.y + 5);
      ctx.lineTo(cx - (hanging ? 4 : 9), e.y + 2 + flap);
      ctx.lineTo(cx - 5, e.y + 8);
      ctx.lineTo(cx + 5, e.y + 8);
      ctx.lineTo(cx + (hanging ? 4 : 9), e.y + 2 + flap);
      ctx.closePath();
      ctx.fill();
      circle(ctx, cx, e.y + 5, 4, '#7c3aed');
      circle(ctx, cx - 1.5, e.y + 5, 0.9, '#fde047');
      circle(ctx, cx + 1.5, e.y + 5, 0.9, '#fde047');
      break;
    }
  }
  ctx.restore();
}

function drawItem(ctx: CanvasRenderingContext2D, it: Item, t: number) {
  const cx = it.x + it.w / 2;
  const cy = it.y + it.h / 2;
  switch (it.kind) {
    case 'berry':
      circle(ctx, cx, cy + 1, 5.5, '#ef4444');
      circle(ctx, cx - 2, cy - 1, 1.6, '#fecaca');
      ctx.fillStyle = '#22c55e';
      ctx.beginPath();
      ctx.ellipse(cx + 2, cy - 5, 3, 1.5, -0.5, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'pepper':
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.ellipse(cx, cy + 1, 3.5, 6, 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#16a34a';
      ctx.fillRect(cx + 1, cy - 7, 2, 3);
      circle(ctx, cx - 1, cy - 1, 1.2, '#fecaca');
      circle(ctx, cx + 3, cy - 8 - Math.abs(Math.sin(t * 8)) * 2, 2, 'rgba(251,191,36,0.8)');
      break;
    case 'feather': {
      const g = ctxGradient(ctx, cx - 6, cy, cx + 6, cy);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(cx, cy, 3.5, 7, 0.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(cx - 4, cy + 6);
      ctx.lineTo(cx + 3, cy - 5);
      ctx.stroke();
      break;
    }
    case 'life':
      heart(ctx, cx, cy, 6, '#22c55e');
      text(ctx, '1', cx, cy, { size: 7, color: '#fff' });
      break;
  }
}

function ctxGradient(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  ['#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#a855f7'].forEach((c, i) => g.addColorStop(i / 4, c));
  return g;
}

function heart(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, color: string) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y + s * 0.9);
  ctx.bezierCurveTo(x - s * 1.4, y - s * 0.1, x - s * 0.6, y - s * 1.1, x, y - s * 0.35);
  ctx.bezierCurveTo(x + s * 0.6, y - s * 1.1, x + s * 1.4, y - s * 0.1, x, y + s * 0.9);
  ctx.fill();
}

function drawShot(ctx: CanvasRenderingContext2D, sh: Shot, t: number) {
  const cx = sh.x + sh.w / 2;
  const cy = sh.y + sh.h / 2;
  switch (sh.kind) {
    case 'spark':
      circle(ctx, cx, cy, 6, 'rgba(251,146,60,0.3)');
      circle(ctx, cx, cy, 3.5, '#fb923c');
      circle(ctx, cx, cy, 1.8, '#fef08a');
      break;
    case 'acorn':
      ctx.fillStyle = '#a16207';
      ctx.beginPath();
      ctx.ellipse(cx, cy + 1, 4.5, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      fillRound(ctx, cx - 5, cy - 4, 10, 4, 2, '#713f12');
      ctx.fillStyle = '#422006';
      ctx.fillRect(cx - 0.5, cy - 6, 1, 2);
      break;
    case 'shard':
      ctx.fillStyle = '#67e8f9';
      ctx.beginPath();
      ctx.moveTo(cx, cy - 5);
      ctx.lineTo(cx + 3, cy);
      ctx.lineTo(cx, cy + 5);
      ctx.lineTo(cx - 3, cy);
      ctx.fill();
      break;
    case 'feather':
      ctx.fillStyle = '#cbd5e1';
      ctx.beginPath();
      ctx.ellipse(cx, cy, 2.5, 5, Math.sin(t * 5) * 0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#475569';
      ctx.fillRect(cx - 0.5, cy - 4, 1, 8);
      break;
    case 'rock':
      circle(ctx, cx, cy, 6, '#57534e');
      circle(ctx, cx - 2, cy - 2, 2, '#78716c');
      break;
    case 'lava':
      circle(ctx, cx, cy, 7, 'rgba(249,115,22,0.35)');
      circle(ctx, cx, cy, 5, '#ea580c');
      circle(ctx, cx - 1, cy - 1, 2.2, '#fde68a');
      break;
  }
}

function drawBoss(ctx: CanvasRenderingContext2D, b: Boss, t: number) {
  const cx = b.x + b.w / 2;
  const by = b.y + b.h;
  const f = b.dir < 0 ? -1 : 1;
  if (b.hurt > 0 && Math.floor(t * 20) % 2 === 0) ctx.globalAlpha = 0.45;
  if (b.dying > 0) ctx.globalAlpha = Math.max(0, 1 - b.dying / 1.6);
  switch (b.kind) {
    case 'boar': {
      const shake = b.state === 'paw' ? Math.sin(t * 50) * 1.5 : 0;
      const x0 = cx + shake;
      ctx.fillStyle = '#7c4a2a';
      ctx.beginPath();
      ctx.ellipse(x0, by - 13, 18, 12, 0, 0, Math.PI * 2);
      ctx.fill();
      // Bramble mane.
      ctx.fillStyle = '#3f6212';
      for (let k = -3; k <= 3; k++) {
        ctx.beginPath();
        ctx.moveTo(x0 + k * 4 - 3, by - 22);
        ctx.lineTo(x0 + k * 4 - f * 2, by - 31 + Math.abs(k));
        ctx.lineTo(x0 + k * 4 + 3, by - 22);
        ctx.fill();
      }
      circle(ctx, x0 + f * 16, by - 12, 8, '#8b5634');
      fillRound(ctx, x0 + f * 20 - 4, by - 13, 8, 6, 3, '#f0a8a0');
      ctx.strokeStyle = '#fafaf9';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x0 + f * 18, by - 8);
      ctx.quadraticCurveTo(x0 + f * 25, by - 9, x0 + f * 24, by - 15);
      ctx.stroke();
      circle(ctx, x0 + f * 15, by - 16, 1.8, b.state === 'stun' ? '#fff' : '#ef4444');
      ctx.fillStyle = '#4a2c18';
      for (const k of [-10, -4, 6, 12]) ctx.fillRect(x0 + k, by - 4, 3, 4);
      if (b.state === 'stun') for (let k = 0; k < 3; k++) star(ctx, x0 + f * 14 + Math.cos(t * 6 + k * 2) * 9, by - 30 + Math.sin(t * 6 + k * 2) * 3, 3, 1.3, '#fde047');
      break;
    }
    case 'mole': {
      if (b.state === 'under') {
        ctx.fillStyle = '#6b4a2b';
        ctx.beginPath();
        ctx.ellipse(cx, by, 16, 7, 0, Math.PI, 0);
        ctx.fill();
        ctx.fillStyle = '#8b6a45';
        for (let k = 0; k < 4; k++) circle(ctx, cx - 10 + k * 7, by - 5 - Math.abs(Math.sin(t * 10 + k)) * 3, 1.6, '#8b6a45');
        break;
      }
      const sink = b.state === 'dig' ? Math.min(1, 1 - b.timer / 0.6) * 18 : 0;
      ctx.save();
      ctx.beginPath();
      ctx.rect(b.x - 20, b.y - 30, b.w + 40, b.h + 30);
      ctx.clip();
      const y0 = by - 13 + sink;
      ctx.fillStyle = '#6b5a50';
      ctx.beginPath();
      ctx.ellipse(cx, y0, 15, 13, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#a5f3fc';
      ctx.beginPath();
      ctx.moveTo(cx - 3, y0 - 12);
      ctx.lineTo(cx, y0 - 24);
      ctx.lineTo(cx + 3, y0 - 12);
      ctx.fill();
      circle(ctx, cx + f * 12, y0 - 2, 3.5, '#f9a8d4');
      circle(ctx, cx + f * 6, y0 - 5, 1.4, '#111');
      ctx.fillStyle = '#f5f5f4';
      for (const k of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(cx + k * 13, y0 + 4);
        ctx.lineTo(cx + k * 19, y0 + 9);
        ctx.lineTo(cx + k * 13, y0 + 10);
        ctx.fill();
      }
      ctx.restore();
      break;
    }
    case 'owl': {
      const wings = b.state === 'dive' || b.state === 'glide' ? 1 : 0.5 + 0.5 * Math.sin(t * 10);
      ctx.fillStyle = '#475569';
      for (const k of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(cx + k * 8, by - 18);
        ctx.lineTo(cx + k * (14 + wings * 10), by - 22 + wings * 6);
        ctx.lineTo(cx + k * 10, by - 6);
        ctx.fill();
      }
      ctx.fillStyle = '#64748b';
      ctx.beginPath();
      ctx.ellipse(cx, by - 13, 13, 13, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#cbd5e1';
      ctx.beginPath();
      ctx.ellipse(cx, by - 8, 8, 7, 0, 0, Math.PI * 2);
      ctx.fill();
      for (const k of [-1, 1]) {
        ctx.fillStyle = '#475569';
        ctx.beginPath();
        ctx.moveTo(cx + k * 6, by - 24);
        ctx.lineTo(cx + k * 11, by - 31);
        ctx.lineTo(cx + k * 11, by - 21);
        ctx.fill();
        circle(ctx, cx + k * 5, by - 17, 4.5, '#facc15');
        circle(ctx, cx + k * 5 + f, by - 17, 2, '#111');
      }
      ctx.fillStyle = '#f97316';
      ctx.beginPath();
      ctx.moveTo(cx - 2, by - 14);
      ctx.lineTo(cx + 2, by - 14);
      ctx.lineTo(cx, by - 10);
      ctx.fill();
      break;
    }
    case 'golem': {
      fillRound(ctx, b.x + 4, b.y + 6, b.w - 8, b.h - 10, 7, '#3f3a3a');
      fillRound(ctx, b.x + 10, b.y, b.w - 20, 16, 5, '#4a4444');
      // Glowing cracks.
      const glow = `rgba(255,${120 + Math.sin(t * 6) * 40},40,0.95)`;
      ctx.strokeStyle = glow;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(cx - 8, b.y + 14);
      ctx.lineTo(cx - 3, b.y + 22);
      ctx.lineTo(cx - 9, b.y + 30);
      ctx.moveTo(cx + 6, b.y + 18);
      ctx.lineTo(cx + 10, b.y + 27);
      ctx.stroke();
      circle(ctx, cx - 5 + f * 2, b.y + 8, 2, glow);
      circle(ctx, cx + 5 + f * 2, b.y + 8, 2, glow);
      fillRound(ctx, b.x - 2, b.y + 14, 8, 18, 3, '#4a4444');
      fillRound(ctx, b.x + b.w - 6, b.y + 14, 8, 18, 3, '#4a4444');
      fillRound(ctx, b.x + 6, by - 6, 11, 6, 2, '#2f2b2b');
      fillRound(ctx, b.x + b.w - 17, by - 6, 11, 6, 2, '#2f2b2b');
      break;
    }
  }
  ctx.globalAlpha = 1;
}

/* ------------------------------------------------------------- frame */

export function render(ctx: CanvasRenderingContext2D, s: State) {
  const lvl = s.level;
  const t = s.levelTime;
  backdrop(ctx, lvl.theme, s.camera, t + s.phaseTime);
  const sx = s.shake > 0 ? (Math.random() - 0.5) * 6 : 0;
  const sy = s.shake > 0 ? (Math.random() - 0.5) * 4 : 0;
  ctx.save();
  ctx.translate(-Math.round(s.camera) + sx, sy);

  const c0 = Math.max(0, Math.floor(s.camera / TILE) - 1);
  const c1 = Math.min(lvl.cols - 1, Math.floor((s.camera + VIEW_W) / TILE) + 1);
  for (let r = 0; r < ROWS; r++) {
    for (let c = c0; c <= c1; c++) {
      const g = s.grid[r * lvl.cols + c];
      if (g === '.' || g === 'F') continue;
      const bump = s.bumps.find((b) => b.c === c && b.r === r);
      const lift = bump ? Math.sin((bump.t / 0.18) * Math.PI) * 5 : 0;
      drawTile(ctx, s, g, c, r, c * TILE, r * TILE - lift);
    }
  }
  drawGoal(ctx, s);

  // Moving platforms.
  for (const m of lvl.movers) {
    const pos = moverAt(m, t);
    if (pos.x + m.w < s.camera - 20 || pos.x > s.camera + VIEW_W + 20) continue;
    if (lvl.theme === 'sky') {
      for (let k = 0; k < 4; k++) circle(ctx, pos.x + 6 + k * 12, pos.y + 5, 6, '#ffffff');
      ctx.fillStyle = 'rgba(160,190,230,0.7)';
      ctx.fillRect(pos.x, pos.y + 8, m.w, 3);
    } else {
      fillRound(ctx, pos.x, pos.y, m.w, 7, 2, '#a3734a');
      ctx.fillStyle = '#7a5130';
      ctx.fillRect(pos.x + 2, pos.y + 5, m.w - 4, 2);
      ctx.strokeStyle = 'rgba(0,0,0,0.35)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(pos.x + m.w / 2, pos.y);
      ctx.lineTo(pos.x + m.w / 2, pos.y - 400);
      ctx.stroke();
    }
  }

  // Fire wheels and lava sprites.
  for (const b of wheelBalls(lvl, t)) {
    if (b.x < s.camera - 40 || b.x > s.camera + VIEW_W + 40) continue;
    circle(ctx, b.x, b.y, WHEEL_BALL + 2.5, 'rgba(249,115,22,0.3)');
    circle(ctx, b.x, b.y, WHEEL_BALL, '#f97316');
    circle(ctx, b.x, b.y, WHEEL_BALL - 2.5, '#fde68a');
  }
  for (let i = 0; i < lvl.lavaSprites.length; i++) {
    const l = lavaSpriteAt(lvl, i, t);
    if (!l) continue;
    circle(ctx, l.x, l.y, 7, 'rgba(249,115,22,0.35)');
    circle(ctx, l.x, l.y, 5.5, '#ea580c');
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.moveTo(l.x - 4, l.y + (l.rising ? 3 : -3));
    ctx.lineTo(l.x, l.y + (l.rising ? 11 : -11));
    ctx.lineTo(l.x + 4, l.y + (l.rising ? 3 : -3));
    ctx.fill();
    circle(ctx, l.x - 2, l.y - 1, 1.1, '#fff');
    circle(ctx, l.x + 2, l.y - 1, 1.1, '#fff');
  }

  for (const it of s.items) drawItem(ctx, it, t);
  for (const e of s.enemies) {
    if (e.x + e.w < s.camera - 20 || e.x > s.camera + VIEW_W + 20) continue;
    drawEnemy(ctx, e, t);
  }
  if (s.boss) drawBoss(ctx, s.boss, t);
  if (s.orb) {
    circle(ctx, s.orb.x, s.orb.y, 13, 'rgba(253,224,71,0.25)');
    star(ctx, s.orb.x, s.orb.y, 9, 4, '#facc15', t * 2);
    star(ctx, s.orb.x, s.orb.y, 4, 2, '#fffbeb', t * 2);
  }

  // Pip (flickering while invulnerable).
  const p = s.player;
  const flicker = s.invuln > 0 && Math.floor(s.invuln * 16) % 2 === 0;
  if (!flicker && !(s.phase === 'tally' && lvl.goalX !== null)) {
    drawPip(ctx, p.x, p.y, p.w, p.h, p.facing, {
      big: p.big,
      spark: s.power === 'spark',
      t: s.levelTime + s.phaseTime,
      moving: Math.abs(p.vx) > 10,
      air: !p.onGround && s.phase !== 'goal',
      star: s.star > 0,
      dead: s.phase === 'dying',
    });
  }
  for (const sh of s.sparks) drawShot(ctx, sh, t);
  for (const sh of s.hostile) drawShot(ctx, sh, t);
  for (const d of s.debris) {
    if (d.kind === 'gem') {
      ctx.fillStyle = '#22d3ee';
      const w = 4 * Math.abs(Math.cos(d.spin));
      ctx.beginPath();
      ctx.moveTo(d.x, d.y - 6);
      ctx.lineTo(d.x + w + 1, d.y);
      ctx.lineTo(d.x, d.y + 6);
      ctx.lineTo(d.x - w - 1, d.y);
      ctx.fill();
    } else {
      ctx.save();
      ctx.translate(d.x, d.y);
      ctx.rotate(d.spin);
      ctx.fillStyle = PAL[lvl.theme].brick;
      ctx.fillRect(-3, -3, 6, 6);
      ctx.restore();
    }
  }
  drawSparks(ctx, s.particles);
  for (const pp of s.popups) {
    ctx.globalAlpha = Math.min(1, pp.life * 2);
    text(ctx, pp.text, pp.x, pp.y, { size: 8, color: pp.color });
  }
  ctx.globalAlpha = 1;
  ctx.restore();

  overlays(ctx, s);
}

function overlays(ctx: CanvasRenderingContext2D, s: State) {
  const b = s.boss;
  if (b && s.arenaLocked && b.dying === 0) {
    const w = 140;
    const x = (VIEW_W - w) / 2;
    text(ctx, BOSS_INFO[b.kind].name, VIEW_W / 2, 12, { size: 9, color: '#fff' });
    fillRound(ctx, x, 19, w, 7, 3, 'rgba(0,0,0,0.5)');
    fillRound(ctx, x + 1, 20, (w - 2) * (b.hp / b.maxHp), 5, 2.5, '#ef4444');
  }
  if (s.phase === 'play' && s.timeLeft < 50 && s.timeLeft > 46) {
    text(ctx, 'Hurry up!', VIEW_W / 2, 50, { size: 16, color: '#fde047' });
  }
  if (s.banner) {
    ctx.globalAlpha = Math.min(1, s.banner.time * 2);
    fillRound(ctx, VIEW_W / 2 - 110, 54, 220, 44, 10, 'rgba(15,23,42,0.72)');
    text(ctx, s.banner.text, VIEW_W / 2, 70, { size: 15, color: '#fde68a' });
    text(ctx, s.banner.sub, VIEW_W / 2, 87, { size: 9, color: '#e2e8f0', weight: 600 });
    ctx.globalAlpha = 1;
  }
  if (s.phase === 'intro') {
    const a = Math.min(1, (1.6 - s.phaseTime) * 3);
    ctx.globalAlpha = Math.max(0, a);
    ctx.fillStyle = 'rgba(10,12,24,0.82)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    text(ctx, `WORLD ${s.level.code}`, VIEW_W / 2, 92, { size: 22, color: '#fde68a' });
    text(ctx, s.level.name, VIEW_W / 2, 118, { size: 12, color: '#e2e8f0', weight: 600 });
    text(ctx, WORLD_NAMES[s.level.world], VIEW_W / 2, 136, { size: 9, color: '#94a3b8', weight: 600 });
    drawPip(ctx, VIEW_W / 2 - 34, 152, 12, 14, 1, { big: false, spark: false, t: 0, moving: false, air: false, star: false });
    text(ctx, `× ${s.lives}`, VIEW_W / 2 + 4, 160, { size: 12, color: '#fff' });
    ctx.globalAlpha = 1;
  }
  if (s.phase === 'tally') {
    fillRound(ctx, VIEW_W / 2 - 100, 70, 200, 70, 12, 'rgba(15,23,42,0.75)');
    text(ctx, s.level.goalX === null ? 'Guardian defeated!' : 'Course clear!', VIEW_W / 2, 90, { size: 15, color: '#fde68a' });
    text(ctx, `Time bonus  ${Math.ceil(s.timeLeft)}`, VIEW_W / 2, 112, { size: 10, color: '#e2e8f0', weight: 600 });
    if (s.level.goalX !== null) text(ctx, `Pole bonus  ${s.poleBonus}`, VIEW_W / 2, 127, { size: 10, color: '#e2e8f0', weight: 600 });
  }
}

