import { circle, drawSparks, fillRound, text } from '../_shared/arcade/draw';
import { PER_WORLD, ROWS, T, TILE, VIEW_H, VIEW_W, WORLD_NAMES } from './levels';
import type { Theme } from './levels';
import { BOSS_NAMES } from './game';
import type { Boss, Enemy, Item, Player, State } from './game';

/** All Pip Quest art is drawn here with plain canvas shapes. */

interface Palette {
  skyTop: string;
  skyBottom: string;
  far: string;
  near: string;
  top: string;
  dirt: string;
  dirtDark: string;
  ledge: string;
}

const PAL: Record<Theme, Palette> = {
  meadow: { skyTop: '#7dd3fc', skyBottom: '#e0f2fe', far: '#a7d7a0', near: '#6fbf6a', top: '#4ade80', dirt: '#a16207', dirtDark: '#713f12', ledge: '#b45309' },
  cave: { skyTop: '#1e1b4b', skyBottom: '#312e81', far: '#3b3577', near: '#4c4596', top: '#a78bfa', dirt: '#4c1d95', dirtDark: '#2e1065', ledge: '#7c3aed' },
  sky: { skyTop: '#60a5fa', skyBottom: '#fdf4ff', far: '#ffffff', near: '#f5f3ff', top: '#ffffff', dirt: '#e0e7ff', dirtDark: '#c7d2fe', ledge: '#e9d5ff' },
  snow: { skyTop: '#93c5fd', skyBottom: '#f0f9ff', far: '#cbd5e1', near: '#94a3b8', top: '#f8fafc', dirt: '#60a5fa', dirtDark: '#2563eb', ledge: '#bae6fd' },
  castle: { skyTop: '#0f172a', skyBottom: '#1e293b', far: '#273449', near: '#334155', top: '#94a3b8', dirt: '#475569', dirtDark: '#334155', ledge: '#64748b' },
  volcano: { skyTop: '#450a0a', skyBottom: '#9a3412', far: '#57190f', near: '#3b0f0a', top: '#78716c', dirt: '#292524', dirtDark: '#1c1917', ledge: '#57534e' },
};

/* ------------------------------------------------------------- background */

function background(ctx: CanvasRenderingContext2D, s: State) {
  const theme = s.lv.plan.theme;
  const pal = PAL[theme];
  const g = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  g.addColorStop(0, pal.skyTop);
  g.addColorStop(1, pal.skyBottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  const cam = s.cam;

  if (theme === 'meadow' || theme === 'snow' || theme === 'sky') {
    // Clouds.
    for (let i = 0; i < 8; i++) {
      const x = ((i * 173 - cam * 0.15) % 700) + (i * 173 - cam * 0.15 < 0 ? 700 : 0) - 110;
      const y = 26 + ((i * 53) % 70);
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      circle(ctx, x, y, 14, ctx.fillStyle as string);
      circle(ctx, x + 16, y - 6, 17, ctx.fillStyle as string);
      circle(ctx, x + 34, y, 13, ctx.fillStyle as string);
      ctx.fillRect(x, y, 34, 12);
    }
  }
  if (theme === 'meadow' || theme === 'snow') {
    // Rolling hills (meadow) or pine-covered mountains (snow).
    for (const [speed, color, base, amp] of [
      [0.25, pal.far, 170, 40],
      [0.5, pal.near, 205, 26],
    ] as const) {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(0, VIEW_H);
      for (let x = 0; x <= VIEW_W; x += 8) {
        const wx = x + cam * speed;
        const y = theme === 'snow' ? base - Math.abs(((wx / 90) % 2) - 1) * amp * 1.6 : base - Math.sin(wx / 70) * amp * 0.6 - Math.sin(wx / 31) * amp * 0.2;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(VIEW_W, VIEW_H);
      ctx.fill();
    }
    if (theme === 'snow') {
      for (let i = 0; i < 12; i++) {
        const x = ((i * 61 - cam * 0.5) % 560 + 560) % 560 - 40;
        pine(ctx, x, 214, '#1e3a5f');
      }
    }
  } else if (theme === 'sky') {
    for (let i = 0; i < 6; i++) {
      const x = ((i * 137 - cam * 0.35) % 620 + 620) % 620 - 70;
      fillRound(ctx, x, 190 + (i % 3) * 18, 90, 26, 13, 'rgba(255,255,255,0.6)');
    }
  } else if (theme === 'cave') {
    for (let i = 0; i < 14; i++) {
      const x = ((i * 89 - cam * 0.3) % 600 + 600) % 600 - 50;
      const h = 30 + ((i * 37) % 50);
      ctx.fillStyle = pal.far;
      ctx.beginPath();
      ctx.moveTo(x, 32);
      ctx.lineTo(x + 14, 32 + h);
      ctx.lineTo(x + 28, 32);
      ctx.fill();
      if (i % 3 === 0) crystal(ctx, x + 10, 150 + (i % 4) * 20, '#c4b5fd');
    }
  } else if (theme === 'castle') {
    ctx.strokeStyle = 'rgba(148,163,184,0.12)';
    ctx.lineWidth = 1;
    const off = -(cam * 0.4) % 32;
    for (let y = 0; y < VIEW_H; y += 16) {
      for (let x = off - 32 + ((y / 16) % 2) * 16; x < VIEW_W; x += 32) ctx.strokeRect(x, y, 32, 16);
    }
    for (let i = 0; i < 5; i++) {
      const x = ((i * 120 - cam * 0.4) % 600 + 600) % 600 - 60;
      torch(ctx, x, 90, s.time);
    }
  } else {
    // Volcano: a distant smoking mountain and drifting embers.
    ctx.fillStyle = pal.far;
    const vx = 300 - ((cam * 0.1) % 800);
    ctx.beginPath();
    ctx.moveTo(vx - 180, VIEW_H);
    ctx.lineTo(vx - 30, 90);
    ctx.lineTo(vx + 30, 90);
    ctx.lineTo(vx + 180, VIEW_H);
    ctx.fill();
    circle(ctx, vx, 80, 16, 'rgba(120,113,108,0.5)');
    circle(ctx, vx + 12, 60, 20, 'rgba(120,113,108,0.4)');
    for (let i = 0; i < 24; i++) {
      const x = ((i * 47 - cam * 0.2) % 520 + 520) % 520 - 20;
      const y = VIEW_H - ((s.time * (20 + (i % 5) * 8) + i * 31) % VIEW_H);
      ctx.fillStyle = i % 2 ? '#fb923c' : '#fde047';
      ctx.fillRect(x, y, 2, 2);
    }
  }
}

function pine(ctx: CanvasRenderingContext2D, x: number, y: number, color: string) {
  ctx.fillStyle = color;
  for (let k = 0; k < 3; k++) {
    ctx.beginPath();
    ctx.moveTo(x, y - 46 + k * 12);
    ctx.lineTo(x - 12 - k * 3, y - 22 + k * 12);
    ctx.lineTo(x + 12 + k * 3, y - 22 + k * 12);
    ctx.fill();
  }
  ctx.fillStyle = '#f8fafc';
  ctx.beginPath();
  ctx.moveTo(x, y - 46);
  ctx.lineTo(x - 5, y - 37);
  ctx.lineTo(x + 5, y - 37);
  ctx.fill();
}

function crystal(ctx: CanvasRenderingContext2D, x: number, y: number, color: string) {
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.5;
  ctx.beginPath();
  ctx.moveTo(x, y - 16);
  ctx.lineTo(x + 6, y);
  ctx.lineTo(x, y + 6);
  ctx.lineTo(x - 6, y);
  ctx.fill();
  ctx.globalAlpha = 1;
}

function torch(ctx: CanvasRenderingContext2D, x: number, y: number, t: number) {
  ctx.fillStyle = '#57534e';
  ctx.fillRect(x - 2, y, 4, 12);
  const f = Math.sin(t * 12 + x) * 2;
  circle(ctx, x, y - 3, 6 + f * 0.5, 'rgba(251,146,60,0.35)');
  circle(ctx, x, y - 2, 3.5, '#fde047');
}

/* ------------------------------------------------------------------- tiles */

function drawTile(ctx: CanvasRenderingContext2D, s: State, v: number, c: number, r: number, x: number, y: number) {
  const theme = s.lv.plan.theme;
  const pal = PAL[theme];
  const above = r > 0 ? s.tiles[(r - 1) * s.lv.cols + c] : TILE.empty;
  switch (v) {
    case TILE.ground: {
      if (theme === 'sky') {
        fillRound(ctx, x, y, T, T, above === TILE.ground ? 0 : 6, '#ffffff');
        ctx.fillStyle = '#e0e7ff';
        ctx.fillRect(x, y + 11, T, 5);
        return;
      }
      ctx.fillStyle = pal.dirt;
      ctx.fillRect(x, y, T, T);
      ctx.fillStyle = pal.dirtDark;
      ctx.fillRect(x + ((c * 7) % 11), y + ((r * 5) % 11) + 2, 3, 3);
      if (theme === 'volcano' && (c + r) % 3 === 0) {
        ctx.fillStyle = '#ea580c';
        ctx.fillRect(x + 4, y + 9, 6, 1);
      }
      if (above !== TILE.ground && above !== TILE.lava) {
        ctx.fillStyle = pal.top;
        ctx.fillRect(x, y, T, 5);
        if (theme === 'meadow') {
          ctx.fillRect(x + 2, y + 5, 3, 2);
          ctx.fillRect(x + 10, y + 5, 3, 2);
        } else if (theme === 'snow') {
          ctx.fillStyle = '#bae6fd';
          ctx.fillRect(x, y + 5, T, 1);
        }
      }
      return;
    }
    case TILE.brick: {
      ctx.fillStyle = theme === 'cave' ? '#6d28d9' : theme === 'snow' ? '#3b82f6' : '#c2410c';
      ctx.fillRect(x, y, T, T);
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fillRect(x, y + 7, T, 1);
      ctx.fillRect(x, y + 15, T, 1);
      ctx.fillRect(x + 7, y, 1, 7);
      ctx.fillRect(x + 3, y + 8, 1, 7);
      ctx.fillRect(x + 12, y + 8, 1, 7);
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      ctx.fillRect(x, y, T, 1);
      return;
    }
    case TILE.qcoin:
    case TILE.qpower:
    case TILE.qstar:
    case TILE.q1up: {
      // A lucky block: amber with a glinting gem.
      fillRound(ctx, x, y, T, T, 3, '#f59e0b');
      ctx.fillStyle = '#fcd34d';
      ctx.fillRect(x + 1, y + 1, T - 2, 2);
      ctx.fillStyle = '#b45309';
      ctx.fillRect(x + 1, y + T - 2, T - 2, 1);
      const glow = 0.6 + Math.sin(s.time * 5 + c) * 0.4;
      ctx.fillStyle = `rgba(255,255,255,${0.55 + glow * 0.45})`;
      ctx.beginPath();
      ctx.moveTo(x + 8, y + 3);
      ctx.lineTo(x + 13, y + 8);
      ctx.lineTo(x + 8, y + 13);
      ctx.lineTo(x + 3, y + 8);
      ctx.fill();
      ctx.fillStyle = '#d97706';
      ctx.fillRect(x + 7, y + 7, 2, 2);
      return;
    }
    case TILE.used:
      fillRound(ctx, x, y, T, T, 3, '#92400e');
      ctx.fillStyle = '#78350f';
      ctx.fillRect(x + 3, y + 3, 2, 2);
      ctx.fillRect(x + 11, y + 3, 2, 2);
      ctx.fillRect(x + 3, y + 11, 2, 2);
      ctx.fillRect(x + 11, y + 11, 2, 2);
      return;
    case TILE.stone:
      ctx.fillStyle = theme === 'volcano' ? '#57534e' : theme === 'cave' ? '#5b21b6' : '#64748b';
      ctx.fillRect(x, y, T, T);
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      ctx.fillRect(x, y, T, 2);
      ctx.fillRect(x, y, 2, T);
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.fillRect(x, y + T - 2, T, 2);
      ctx.fillRect(x + T - 2, y, 2, T);
      return;
    case TILE.stump: {
      const top = above !== TILE.stump;
      ctx.fillStyle = '#92400e';
      ctx.fillRect(x + 1, y, T - 2, T);
      ctx.fillStyle = '#78350f';
      ctx.fillRect(x + 4, y, 2, T);
      ctx.fillRect(x + 10, y, 1, T);
      if (top) {
        fillRound(ctx, x - 1, y, T + 2, 5, 2, '#d6a467');
        ctx.strokeStyle = '#a16207';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(x + 8, y + 2.5, 4, 1.5, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      return;
    }
    case TILE.ledge:
      if (theme === 'sky' || theme === 'snow') fillRound(ctx, x, y, T, 7, 3, theme === 'sky' ? '#f5f3ff' : '#e0f2fe');
      else {
        ctx.fillStyle = pal.ledge;
        ctx.fillRect(x, y, T, 6);
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.fillRect(x, y + 5, T, 1);
        ctx.fillRect(x + 7, y, 1, 6);
      }
      return;
    case TILE.spikes:
      ctx.fillStyle = pal.dirt;
      ctx.fillRect(x, y + 10, T, 6);
      ctx.fillStyle = '#e2e8f0';
      for (let k = 0; k < 4; k++) {
        ctx.beginPath();
        ctx.moveTo(x + k * 4, y + 11);
        ctx.lineTo(x + k * 4 + 2, y + 2);
        ctx.lineTo(x + k * 4 + 4, y + 11);
        ctx.fill();
      }
      return;
    case TILE.lava: {
      const surface = above !== TILE.lava;
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(x, y, T, T);
      if (surface) {
        const wave = Math.sin(s.time * 4 + c) * 1.5;
        ctx.fillStyle = '#f97316';
        ctx.fillRect(x, y + 3 + wave, T, 4);
        ctx.fillStyle = '#fde047';
        ctx.fillRect(x + ((c * 5 + Math.floor(s.time * 6)) % 12), y + 4 + wave, 3, 2);
      }
      return;
    }
  }
}

/* ---------------------------------------------------------------- creatures */

/** Pip: a little fox in a scarf. Big and fire forms are taller; fire Pip has a red scarf. */
function drawPip(ctx: CanvasRenderingContext2D, p: Player, t: number) {
  if (p.invuln > 0 && Math.floor(t * 20) % 2 === 0) return;
  const big = p.form > 0;
  const cx = p.x + p.w / 2;
  const bottom = p.y + p.h;
  const k = big ? 1.55 : 1;
  const run = Math.abs(p.vx) > 5 && p.ground;
  const step = run ? Math.sin(p.anim * 2) : 0;
  const air = !p.ground && !p.plat;
  ctx.save();
  ctx.translate(cx, bottom);
  ctx.scale(p.facing * k, k);
  const fur = p.star > 0 ? `hsl(${(t * 600) % 360} 90% 60%)` : '#f97316';
  const scarf = p.form === 2 ? '#ef4444' : '#22c55e';
  // Tail.
  ctx.fillStyle = fur;
  ctx.beginPath();
  ctx.ellipse(-8, -6 - (air ? 2 : 0), 5, 3, -0.6 + step * 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff7ed';
  circle(ctx, -11.5, -8.5 - (air ? 2 : 0), 2, '#fff7ed');
  // Legs.
  ctx.fillStyle = '#7c2d12';
  ctx.fillRect(-4 + step * 2, -3, 3, 3);
  ctx.fillRect(1 - step * 2, -3, 3, 3);
  // Body and belly.
  fillRound(ctx, -5, -10, 10, 8, 4, fur);
  fillRound(ctx, -2, -8, 6, 6, 3, '#fff7ed');
  // Head.
  circle(ctx, 1, -12, 5, fur);
  ctx.fillStyle = fur;
  ctx.beginPath();
  ctx.moveTo(-3, -15);
  ctx.lineTo(-2, -20);
  ctx.lineTo(0.5, -16);
  ctx.moveTo(2, -16);
  ctx.lineTo(4.5, -20);
  ctx.lineTo(5, -15);
  ctx.fill();
  ctx.fillStyle = '#fff7ed';
  ctx.beginPath();
  ctx.ellipse(4, -10.5, 3, 2, 0, 0, Math.PI * 2);
  ctx.fill();
  circle(ctx, 6.6, -11, 0.9, '#1c1917');
  circle(ctx, 2.6, -13, 1.1, '#1c1917');
  // Scarf.
  ctx.fillStyle = scarf;
  ctx.fillRect(-4, -9.5, 9, 2);
  ctx.fillRect(-6, -9 + (air ? -1 : 0), 3, 4);
  if (p.form === 2) circle(ctx, -9.5, -9, 1.5 + Math.sin(t * 20) * 0.5, '#fde047');
  ctx.restore();
}

function drawEnemy(ctx: CanvasRenderingContext2D, e: Enemy, t: number) {
  const b = e.b;
  const x = b.x;
  const y = b.y;
  ctx.save();
  if (e.flipped) {
    ctx.translate(x + b.w / 2, y + b.h / 2);
    ctx.scale(1, -1);
    ctx.translate(-(x + b.w / 2), -(y + b.h / 2));
  }
  switch (e.kind) {
    case 'g': {
      // Grumblebug: a grumpy purple beetle. Squashed when stomped.
      const squash = !e.alive && !e.flipped;
      const h = squash ? 5 : 11;
      const leg = Math.sin(t * 14 + x) * 2;
      ctx.fillStyle = '#1f2937';
      if (!squash) {
        ctx.fillRect(x + 2 + leg, y + 11, 3, 3);
        ctx.fillRect(x + 9 - leg, y + 11, 3, 3);
      }
      fillRound(ctx, x, y + 14 - h - (squash ? 0 : 3), 14, h, 5, '#7e22ce');
      ctx.fillStyle = '#a855f7';
      ctx.fillRect(x + 6.5, y + 14 - h - (squash ? 0 : 3), 1, h);
      if (!squash) {
        circle(ctx, x + (e.dir < 0 ? 4 : 10), y + 5, 2, '#fff');
        circle(ctx, x + (e.dir < 0 ? 3.5 : 10.5), y + 5.2, 1, '#111');
        ctx.fillStyle = '#111';
        ctx.fillRect(x + (e.dir < 0 ? 2 : 8), y + 2, 4, 1);
      }
      break;
    }
    case 'k': {
      // Shellby: a green snail; its spiral shell can be kicked.
      const shellX = x + 1;
      if (e.shell === 0) {
        fillRound(ctx, x + (e.dir < 0 ? 0 : 4), y + 9, 10, 5, 3, '#86efac');
        circle(ctx, x + (e.dir < 0 ? 1 : 13), y + 7, 2.5, '#86efac');
        ctx.fillStyle = '#166534';
        ctx.fillRect(x + (e.dir < 0 ? 0 : 13), y + 2, 1, 4);
        circle(ctx, x + (e.dir < 0 ? 0.5 : 13.5), y + 2, 1.2, '#166534');
      }
      const spin = e.shell === 2 ? t * 20 : 0;
      circle(ctx, shellX + 6, y + 7, 6.5, '#16a34a');
      ctx.strokeStyle = '#bbf7d0';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let a = 0; a < 9; a += 0.4) {
        const r = 1 + a * 0.55;
        const px = shellX + 6 + Math.cos(a + spin) * r;
        const py = y + 7 + Math.sin(a + spin) * r;
        if (a === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
      if (e.shell === 1 && e.timer < 2 && Math.floor(t * 8) % 2) circle(ctx, shellX + 6, y + 2, 1.5, '#fde047');
      break;
    }
    case 'h': {
      // Prickle: a hedgehog you must not stomp.
      ctx.fillStyle = '#57534e';
      for (let k = 0; k < 5; k++) {
        ctx.beginPath();
        ctx.moveTo(x + 1 + k * 3, y + 6);
        ctx.lineTo(x + 2.5 + k * 3 + (e.dir < 0 ? 1 : -1), y - 1);
        ctx.lineTo(x + 4 + k * 3, y + 6);
        ctx.fill();
      }
      fillRound(ctx, x, y + 3, 14, 10, 5, '#78716c');
      fillRound(ctx, x + (e.dir < 0 ? 0 : 7), y + 7, 7, 6, 3, '#d6d3d1');
      circle(ctx, x + (e.dir < 0 ? 0 : 14), y + 10, 1.4, '#1c1917');
      circle(ctx, x + (e.dir < 0 ? 3.5 : 10.5), y + 8, 1, '#1c1917');
      const leg = Math.sin(t * 12 + x) * 1.5;
      ctx.fillStyle = '#44403c';
      ctx.fillRect(x + 3 + leg, y + 12, 2, 2);
      ctx.fillRect(x + 9 - leg, y + 12, 2, 2);
      break;
    }
    case 'b': {
      // Flitter: a little bat.
      const flap = Math.sin(t * 18 + x) * 5;
      ctx.fillStyle = '#6d28d9';
      ctx.beginPath();
      ctx.moveTo(x + 7, y + 7);
      ctx.lineTo(x - 4, y + 3 + flap);
      ctx.lineTo(x + 1, y + 9);
      ctx.moveTo(x + 7, y + 7);
      ctx.lineTo(x + 18, y + 3 + flap);
      ctx.lineTo(x + 13, y + 9);
      ctx.fill();
      circle(ctx, x + 7, y + 7, 5, '#7c3aed');
      circle(ctx, x + 5, y + 6, 1.2, '#fde047');
      circle(ctx, x + 9, y + 6, 1.2, '#fde047');
      break;
    }
    case 'c': {
      // Snapweed: a plant that snaps out of tree stumps.
      ctx.fillStyle = '#15803d';
      ctx.fillRect(x + 5, y + 10, 2, 10);
      ctx.beginPath();
      ctx.ellipse(x + 2, y + 15, 4, 2, -0.5, 0, Math.PI * 2);
      ctx.ellipse(x + 10, y + 15, 4, 2, 0.5, 0, Math.PI * 2);
      ctx.fill();
      const open = 2 + Math.abs(Math.sin(t * 6)) * 3;
      circle(ctx, x + 6, y + 5, 6, '#e11d48');
      ctx.fillStyle = '#fecdd3';
      ctx.fillRect(x + 1, y + 5 - open / 2, 10, open);
      ctx.fillStyle = '#fff';
      for (let k = 0; k < 4; k++) ctx.fillRect(x + 2 + k * 2.5, y + 5 - open / 2, 1, 1.5);
      circle(ctx, x + 3, y + 1, 1, '#fff');
      circle(ctx, x + 9, y + 1, 1, '#fff');
      break;
    }
  }
  ctx.restore();
}

function drawItem(ctx: CanvasRenderingContext2D, it: Item, t: number) {
  const { x, y } = it.b;
  if (it.kind === 'acorn') {
    fillRound(ctx, x + 1, y + 5, 10, 9, 5, '#b45309');
    fillRound(ctx, x, y + 2, 12, 5, 2, '#78350f');
    ctx.fillStyle = '#78350f';
    ctx.fillRect(x + 5, y, 2, 3);
    circle(ctx, x + 4, y + 8, 1.5, 'rgba(255,255,255,0.4)');
  } else if (it.kind === 'berry') {
    const f = Math.sin(t * 12) * 1;
    circle(ctx, x + 6, y + 3 + f, 3, '#fde047');
    circle(ctx, x + 6, y + 9, 5.5, '#ef4444');
    circle(ctx, x + 4, y + 7, 1.5, 'rgba(255,255,255,0.6)');
    ctx.fillStyle = '#16a34a';
    ctx.fillRect(x + 5, y + 2, 2, 3);
  } else if (it.kind === 'star') {
    ctx.fillStyle = `hsl(${(t * 400) % 360} 95% 60%)`;
    ctx.beginPath();
    for (let k = 0; k < 10; k++) {
      const a = (k / 10) * Math.PI * 2 - Math.PI / 2;
      const r = k % 2 ? 3 : 7;
      ctx.lineTo(x + 6 + Math.cos(a) * r, y + 7 + Math.sin(a) * r);
    }
    ctx.fill();
    circle(ctx, x + 4.5, y + 7, 0.9, '#111');
    circle(ctx, x + 7.5, y + 7, 0.9, '#111');
  } else {
    ctx.fillStyle = '#22c55e';
    ctx.beginPath();
    ctx.ellipse(x + 6, y + 7, 6, 4, -0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#14532d';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + 1, y + 11);
    ctx.lineTo(x + 11, y + 3);
    ctx.stroke();
    text(ctx, '1UP', x + 6, y - 3, { size: 6, color: '#14532d' });
  }
}

function drawBoss(ctx: CanvasRenderingContext2D, boss: Boss, t: number) {
  if (boss.invuln > 0 && Math.floor(t * 16) % 2 === 0) return;
  const { x, y, w, h } = boss.b;
  const colors = ['#65a30d', '#78716c', '#0ea5e9', '#a5f3fc', '#dc2626'];
  const body = colors[boss.world];
  const bob = boss.state === 'walk' ? Math.sin(t * 10) * 1.5 : 0;
  ctx.save();
  if (boss.state === 'down') {
    ctx.translate(x + w / 2, y + h / 2);
    ctx.rotate(Math.PI);
    ctx.translate(-(x + w / 2), -(y + h / 2));
  }
  const cx = x + w / 2;
  // Horns.
  ctx.fillStyle = '#fef3c7';
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(cx + side * 8, y + 6 + bob);
    ctx.lineTo(cx + side * 20, y - 8 + bob);
    ctx.lineTo(cx + side * 14, y + 8 + bob);
    ctx.fill();
  }
  // Spiky back.
  ctx.fillStyle = boss.world === 3 ? '#e0f2fe' : '#1c1917';
  for (let k = 0; k < 5; k++) {
    const sx = x + 4 + k * 7;
    ctx.beginPath();
    ctx.moveTo(sx, y + 8 + bob);
    ctx.lineTo(sx + 3.5, y + bob);
    ctx.lineTo(sx + 7, y + 8 + bob);
    ctx.fill();
  }
  fillRound(ctx, x, y + 4 + bob, w, h - 6, 14, body);
  fillRound(ctx, x + 8, y + 16 + bob, w - 16, h - 22, 8, 'rgba(255,255,255,0.35)');
  // Face.
  const ex = cx + boss.dir * 6;
  circle(ctx, ex - 5, y + 13 + bob, 4, '#fff');
  circle(ctx, ex + 5, y + 13 + bob, 4, '#fff');
  circle(ctx, ex - 5 + boss.dir, y + 13 + bob, 2, '#111');
  circle(ctx, ex + 5 + boss.dir, y + 13 + bob, 2, '#111');
  ctx.fillStyle = '#111';
  ctx.fillRect(ex - 9, y + 7 + bob, 7, 2);
  ctx.fillRect(ex + 2, y + 7 + bob, 7, 2);
  fillRound(ctx, ex - 6, y + 21 + bob, 12, 4, 2, '#7f1d1d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(ex - 5, y + 21 + bob, 2, 2);
  ctx.fillRect(ex + 3, y + 21 + bob, 2, 2);
  // Feet.
  ctx.fillStyle = '#1c1917';
  ctx.fillRect(x + 4, y + h - 3, 10, 3);
  ctx.fillRect(x + w - 14, y + h - 3, 10, 3);
  if (boss.world === 4) {
    // A crown for the king.
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.moveTo(cx - 9, y + 2 + bob);
    ctx.lineTo(cx - 9, y - 6 + bob);
    ctx.lineTo(cx - 4, y - 1 + bob);
    ctx.lineTo(cx, y - 8 + bob);
    ctx.lineTo(cx + 4, y - 1 + bob);
    ctx.lineTo(cx + 9, y - 6 + bob);
    ctx.lineTo(cx + 9, y + 2 + bob);
    ctx.fill();
  }
  ctx.restore();
}

/* ------------------------------------------------------------------ render */

export function render(ctx: CanvasRenderingContext2D, s: State) {
  background(ctx, s);
  const cam = Math.round(s.cam);
  ctx.save();
  ctx.translate(-cam, 0);
  const c0 = Math.max(0, Math.floor(cam / T) - 1);
  const c1 = Math.min(s.lv.cols - 1, c0 + Math.ceil(VIEW_W / T) + 2);
  const t = s.time;

  // Plants and rising power-ups sit behind the tiles.
  for (const e of s.enemies) if (e.kind === 'c' && e.alive) drawEnemy(ctx, e, t);
  for (const it of s.items) if (it.rise < 1) drawItem(ctx, it, t);

  for (let r = 0; r < ROWS; r++) {
    for (let c = c0; c <= c1; c++) {
      const v = s.tiles[r * s.lv.cols + c];
      if (!v) continue;
      const bump = s.bumps.find((q) => q.c === c && q.r === r);
      drawTile(ctx, s, v, c, r, c * T, r * T - (bump ? Math.sin((bump.t / 0.15) * Math.PI) * 5 : 0));
    }
  }

  // Goal pole and Pip's burrow.
  if (s.goal) {
    const g = s.goal;
    const px = g.c * T + 7;
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(px, g.top, 2, g.bottom - g.top - T);
    circle(ctx, px + 1, g.top - 2, 3, '#facc15');
    const fy = s.phase === 'flag' || s.phase === 'tally' ? s.flagY : g.top + 2;
    ctx.fillStyle = '#22c55e';
    ctx.beginPath();
    ctx.moveTo(px, fy);
    ctx.lineTo(px - 16, fy + 6);
    ctx.lineTo(px, fy + 12);
    ctx.fill();
    circle(ctx, px - 6, fy + 6, 2, '#f97316');
    const hx = (g.c + 5) * T;
    const hy = 14 * T;
    ctx.fillStyle = '#4d7c0f';
    ctx.beginPath();
    ctx.ellipse(hx + 40, hy, 52, 44, 0, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = '#65a30d';
    ctx.beginPath();
    ctx.ellipse(hx + 40, hy, 46, 38, 0, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = '#92400e';
    ctx.beginPath();
    ctx.ellipse(hx + 34, hy, 13, 18, 0, Math.PI, 0);
    ctx.fill();
    circle(ctx, hx + 41, hy - 8, 1.6, '#facc15');
    ctx.fillStyle = '#fef3c7';
    fillRound(ctx, hx + 52, hy - 24, 12, 10, 3, '#fef3c7');
    ctx.fillStyle = '#92400e';
    ctx.fillRect(hx + 57.5, hy - 24, 1, 10);
    ctx.fillRect(hx + 52, hy - 19.5, 12, 1);
  }
  for (const ck of s.checks) {
    const x = ck.c * T + 6;
    const y = (ck.r + 1) * T;
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(x, y - 28, 2, 28);
    ctx.fillStyle = ck.reached ? '#22c55e' : '#94a3b8';
    ctx.beginPath();
    ctx.moveTo(x + 2, y - 28);
    ctx.lineTo(x + 14, y - 23);
    ctx.lineTo(x + 2, y - 18);
    ctx.fill();
  }

  // Coins.
  for (const c of s.coins) {
    if (c.taken || c.x < cam - 10 || c.x > cam + VIEW_W + 10) continue;
    const squeeze = Math.abs(Math.cos(t * 3 + c.x * 0.05));
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.ellipse(c.x, c.y, 5 * squeeze + 1, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(c.x - 1, c.y - 3, 1.5 * squeeze + 0.5, 6);
  }

  // Moving and crumbling ledges.
  for (const pl of s.plats) {
    if (pl.state === 3) continue;
    const shake = pl.state === 1 ? Math.sin(t * 60) * 1.5 : 0;
    const theme = s.lv.plan.theme;
    if (pl.kind === 'f') {
      fillRound(ctx, pl.x + shake, pl.y, pl.w, 8, 4, '#f1f5f9');
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(pl.x + 4 + shake, pl.y + 5, pl.w - 8, 2);
    } else {
      fillRound(ctx, pl.x, pl.y, pl.w, 7, 3, theme === 'castle' || theme === 'volcano' ? '#a8a29e' : '#d97706');
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.fillRect(pl.x + 2, pl.y + 5, pl.w - 4, 2);
    }
  }

  for (const it of s.items) if (it.rise >= 1) drawItem(ctx, it, t);
  for (const e of s.enemies) {
    if (e.kind === 'c') continue;
    if (e.alive || e.fade > 0) drawEnemy(ctx, e, t);
  }
  if (s.boss) drawBoss(ctx, s.boss, t);
  if (s.phase !== 'tally' || s.p.x < (s.goal ? (s.goal.c + 7) * T - 4 : Infinity)) drawPip(ctx, s.p, t);

  // Fire berries, boss fireballs and fire bars.
  for (const sh of s.shots) {
    circle(ctx, sh.b.x + 4, sh.b.y + 4, 4.5, '#f97316');
    circle(ctx, sh.b.x + 4, sh.b.y + 4, 2.5, '#fde047');
  }
  for (const f of s.bolts) {
    circle(ctx, f.x, f.y, 6, 'rgba(239,68,68,0.5)');
    circle(ctx, f.x, f.y, 4, '#f97316');
    circle(ctx, f.x, f.y, 2, '#fef08a');
  }
  for (const bar of s.bars) {
    for (let k = 1; k <= bar.n; k++) {
      const x = bar.cx + Math.cos(bar.a) * k * 8;
      const y = bar.cy + Math.sin(bar.a) * k * 8;
      circle(ctx, x, y, 4, '#ea580c');
      circle(ctx, x, y, 2.2, '#fde047');
    }
  }
  for (const d of s.debris) {
    ctx.fillStyle = '#c2410c';
    ctx.fillRect(d.x - 3, d.y - 3, 6, 6);
  }
  drawSparks(ctx, s.sparks);
  for (const q of s.pops) {
    ctx.globalAlpha = Math.min(1, q.t * 2);
    text(ctx, q.text, q.x, q.y - (0.9 - q.t) * 30, { size: 9, color: '#fff' });
    ctx.globalAlpha = 1;
  }
  ctx.restore();

  // Boss health.
  if (s.boss && s.arenaLocked && s.boss.state !== 'down') {
    const b = s.boss;
    text(ctx, BOSS_NAMES[b.world], VIEW_W / 2, 14, { size: 10, color: '#fff' });
    fillRound(ctx, VIEW_W / 2 - 80, 22, 160, 7, 3, 'rgba(0,0,0,0.5)');
    fillRound(ctx, VIEW_W / 2 - 79, 23, 158 * Math.max(0, b.hp / b.maxHp), 5, 2, '#ef4444');
  }
  if (s.p.star > 0 && s.p.star < 2 && Math.floor(t * 6) % 2) text(ctx, '★', VIEW_W - 16, 16, { size: 12, color: '#fde047' });
  if (s.hurried && s.clock < 60 && s.phase === 'play' && Math.floor(t * 2) % 2) text(ctx, 'Hurry!', VIEW_W / 2, 40, { size: 14, color: '#fde047' });

  // Level card.
  if (s.phase === 'intro') {
    ctx.fillStyle = 'rgba(15,23,42,0.82)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    const w = Math.floor(s.levelIndex / PER_WORLD);
    text(ctx, `World ${w + 1}-${(s.levelIndex % PER_WORLD) + 1}`, VIEW_W / 2, VIEW_H / 2 - 30, { size: 22, color: '#fde047' });
    text(ctx, s.lv.plan.name, VIEW_W / 2, VIEW_H / 2 - 4, { size: 14, color: '#fff' });
    text(ctx, WORLD_NAMES[w], VIEW_W / 2, VIEW_H / 2 + 16, { size: 10, color: '#94a3b8', weight: 600 });
    ctx.save();
    ctx.translate(VIEW_W / 2 - 60, VIEW_H / 2 + 54);
    drawPip(ctx, { ...s.p, x: 0, y: -s.p.h, invuln: 0, vx: 0, ground: true, plat: null }, t);
    ctx.restore();
    text(ctx, `× ${s.lives}`, VIEW_W / 2 - 30, VIEW_H / 2 + 46, { size: 14, color: '#fff' });
  }
  if (s.phase === 'tally' || (s.phase === 'boss-down' && s.phaseT < 1.6)) {
    text(ctx, s.phase === 'boss-down' ? `${BOSS_NAMES[Math.floor(s.levelIndex / PER_WORLD)]} is beaten!` : 'Level clear!', VIEW_W / 2, 60, {
      size: 18,
      color: '#fde047',
    });
  }
}
