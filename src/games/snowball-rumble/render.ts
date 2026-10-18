import { circle, drawSparks, fillRound, text } from '../_shared/arcade/draw';
import { transitionProgress } from '../_shared/arena/flow';
import { COLS, H, ROWS, T, W, glyph } from '../_shared/arena/stage';
import type { Stage } from '../_shared/arena/stage';
import { BOSS_INFO } from './bosses';
import { ZONES, zoneOf } from './stages';
import type { Boss, Foe, State } from './types';

type Zone = (typeof ZONES)[number];

/* ------------------------------------------------------------ backdrop */

function backdrop(ctx: CanvasRenderingContext2D, zone: number, t: number) {
  const z = ZONES[zone];
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, z.sky[0]);
  g.addColorStop(1, z.sky[1]);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  // Moon.
  circle(ctx, 262, 40, 14, 'rgba(255,255,240,0.85)');
  circle(ctx, 268, 36, 12, z.sky[0]);
  // Distant scenery.
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  if (zone === 0) {
    for (const [x, w, h] of [[30, 90, 90], [120, 120, 120], [230, 110, 100]]) {
      ctx.beginPath();
      ctx.moveTo(x - w / 2, H);
      ctx.lineTo(x, H - h - 60);
      ctx.lineTo(x + w / 2, H);
      ctx.fill();
    }
  } else if (zone === 1) {
    for (let i = 0; i < 9; i++) {
      const x = 14 + i * 38;
      const h = 60 + ((i * 37) % 40);
      ctx.beginPath();
      ctx.moveTo(x - 16, H - 20);
      ctx.lineTo(x, H - 20 - h);
      ctx.lineTo(x + 16, H - 20);
      ctx.fill();
    }
  } else {
    for (let i = 0; i < 7; i++) {
      const x = 22 + i * 48;
      const h = 70 + ((i * 53) % 60);
      ctx.beginPath();
      ctx.moveTo(x - 9, H - 20);
      ctx.lineTo(x - 4, H - 20 - h);
      ctx.lineTo(x + 4, H - 26 - h);
      ctx.lineTo(x + 9, H - 20);
      ctx.fill();
    }
  }
  // Falling snow.
  for (let i = 0; i < 40; i++) {
    const x = (i * 83.7 + Math.sin(t * 0.8 + i) * 10) % W;
    const y = (i * 47.3 + t * (14 + (i % 4) * 5)) % H;
    ctx.globalAlpha = 0.35 + (i % 3) * 0.2;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x, y, i % 3 === 0 ? 2 : 1.4, i % 3 === 0 ? 2 : 1.4);
  }
  ctx.globalAlpha = 1;
}

/* --------------------------------------------------------------- tiles */

function drawTiles(ctx: CanvasRenderingContext2D, stage: Stage, z: Zone) {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const g = stage.tiles[r * COLS + c];
      const x = c * T;
      const y = r * T;
      if (g === '#') {
        fillRound(ctx, x, y, T, T, 2, z.iceDark);
        fillRound(ctx, x + 1, y + 1, T - 2, T - 2, 2, z.ice);
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.fillRect(x + 3, y + 3, 5, 2);
        if (glyph(stage, c, r - 1) !== '#') {
          ctx.fillStyle = z.trim;
          ctx.fillRect(x, y, T, 4);
          circle(ctx, x + 4, y + 4, 2.5, z.trim);
          circle(ctx, x + 11, y + 4, 2, z.trim);
        }
      } else if (g === '=') {
        fillRound(ctx, x, y + 1, T, 9, 2, z.iceDark);
        fillRound(ctx, x, y + 1, T, 7, 2, z.ice);
        ctx.fillStyle = z.trim;
        ctx.fillRect(x, y, T, 3);
        // Icicles under ledges.
        ctx.fillStyle = 'rgba(220,240,255,0.8)';
        for (const k of [3, 9, 13]) {
          if ((c * 7 + k) % 3 === 0) continue;
          ctx.beginPath();
          ctx.moveTo(x + k - 1.5, y + 9);
          ctx.lineTo(x + k, y + 14 + ((c + k) % 3));
          ctx.lineTo(x + k + 1.5, y + 9);
          ctx.fill();
        }
      }
    }
  }
}

/* ---------------------------------------------------------- characters */

export function drawPenguin(ctx: CanvasRenderingContext2D, x: number, y: number, facing: number, t: number, moving: boolean, opts: { shield?: boolean; dead?: boolean } = {}) {
  const cx = x + 7;
  const wob = moving ? Math.sin(t * 16) * 0.16 : 0;
  ctx.save();
  ctx.translate(cx, y + 14);
  ctx.rotate(opts.dead ? Math.PI : wob);
  // Feet.
  fillRound(ctx, -6, -2, 5, 2.5, 1, '#f97316');
  fillRound(ctx, 1, -2, 5, 2.5, 1, '#f97316');
  // Body and belly.
  ctx.fillStyle = '#1e2a44';
  ctx.beginPath();
  ctx.ellipse(0, -7, 6.5, 7.2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#f8fafc';
  ctx.beginPath();
  ctx.ellipse(facing * 1.2, -6, 4.2, 5.4, 0, 0, Math.PI * 2);
  ctx.fill();
  // Flipper.
  ctx.fillStyle = '#16213a';
  ctx.beginPath();
  ctx.ellipse(-facing * 5.5, -7, 1.8, 4, -facing * 0.4, 0, Math.PI * 2);
  ctx.fill();
  // Eye and beak.
  circle(ctx, facing * 2.6, -10.5, 1.5, '#ffffff');
  circle(ctx, facing * 3, -10.5, 0.8, '#0f172a');
  ctx.fillStyle = '#fb923c';
  ctx.beginPath();
  ctx.moveTo(facing * 4.5, -9.5);
  ctx.lineTo(facing * 8.5, -8.6);
  ctx.lineTo(facing * 4.5, -7.6);
  ctx.fill();
  // Knitted hat with a bobble.
  ctx.fillStyle = '#e11d48';
  ctx.beginPath();
  ctx.ellipse(0, -13.2, 6, 3.4, 0, Math.PI, 0);
  ctx.fill();
  ctx.fillStyle = '#fda4af';
  ctx.fillRect(-6, -13.4, 12, 1.4);
  circle(ctx, -facing * 1.5, -17, 2, '#ffffff');
  ctx.restore();
  if (opts.shield) {
    ctx.strokeStyle = `hsla(${(t * 360) % 360} 90% 70% / 0.9)`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, y + 7, 11, 0, Math.PI * 2);
    ctx.stroke();
  }
}

const FOE_COLORS = { goblin: ['#e11d48', '#9f1239'], hopper: ['#22c55e', '#15803d'], imp: ['#f97316', '#c2410c'], bat: ['#8b5cf6', '#5b21b6'] };

function drawFoeBody(ctx: CanvasRenderingContext2D, f: Foe, t: number, angry: boolean) {
  const cx = f.x + 7;
  const by = f.y + 14;
  const [main, dark] = FOE_COLORS[f.kind];
  const col = angry ? '#ef4444' : main;
  const d = f.dir < 0 ? -1 : 1;
  switch (f.kind) {
    case 'goblin': {
      ctx.fillStyle = dark;
      for (const k of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(cx + k * 3, by - 11);
        ctx.lineTo(cx + k * 6, by - 16);
        ctx.lineTo(cx + k * 5.5, by - 10);
        ctx.fill();
      }
      circle(ctx, cx, by - 7, 7, col);
      circle(ctx, cx + d * 2, by - 8.5, 2.4, '#fff');
      circle(ctx, cx + d * 2.6, by - 8.5, 1.2, '#111');
      ctx.fillStyle = '#fff';
      ctx.fillRect(cx + d * 1 - 1, by - 4, 1.5, 2);
      ctx.fillRect(cx + d * 3.5 - 1, by - 4, 1.5, 2);
      const step = Math.sin(t * 14 + f.x) * 1.5;
      fillRound(ctx, cx - 5 + step, by - 2, 4, 2.5, 1, dark);
      fillRound(ctx, cx + 1 - step, by - 2, 4, 2.5, 1, dark);
      break;
    }
    case 'hopper': {
      const air = !f.onGround;
      ctx.strokeStyle = dark;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx - 3, by - 5);
      ctx.lineTo(cx - 6, by - (air ? 1 : 3));
      ctx.lineTo(cx - 4, by);
      ctx.moveTo(cx + 3, by - 5);
      ctx.lineTo(cx + 6, by - (air ? 1 : 3));
      ctx.lineTo(cx + 4, by);
      ctx.stroke();
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.ellipse(cx, by - 8, 6.5, 5.5, 0, 0, Math.PI * 2);
      ctx.fill();
      for (const k of [-1, 1]) {
        circle(ctx, cx + k * 3, by - 13, 2.6, col);
        circle(ctx, cx + k * 3 + d * 0.5, by - 13.2, 1.3, '#111');
      }
      break;
    }
    case 'imp': {
      const flick = Math.sin(t * 20 + f.x) * 1.5;
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(cx - 7, by - 1);
      ctx.quadraticCurveTo(cx - 8, by - 10, cx - 2 + flick, by - 17);
      ctx.quadraticCurveTo(cx + 1, by - 11, cx + 3, by - 14 - flick);
      ctx.quadraticCurveTo(cx + 9, by - 8, cx + 7, by - 1);
      ctx.closePath();
      ctx.fill();
      circle(ctx, cx, by - 5, 4, '#fde047');
      circle(ctx, cx + d * 2, by - 7, 1.1, '#111');
      circle(ctx, cx - d * 0.5, by - 7, 1.1, '#111');
      break;
    }
    case 'bat': {
      const flap = Math.sin(t * 20 + f.x) * 4;
      ctx.fillStyle = dark;
      ctx.beginPath();
      ctx.moveTo(cx, by - 8);
      ctx.lineTo(cx - 10, by - 11 + flap);
      ctx.lineTo(cx - 6, by - 4);
      ctx.lineTo(cx + 6, by - 4);
      ctx.lineTo(cx + 10, by - 11 + flap);
      ctx.closePath();
      ctx.fill();
      circle(ctx, cx, by - 8, 5, col);
      circle(ctx, cx - 2, by - 9, 1, '#fde047');
      circle(ctx, cx + 2, by - 9, 1, '#fde047');
      break;
    }
  }
}

function drawFoe(ctx: CanvasRenderingContext2D, f: Foe, t: number, angry: boolean) {
  const cx = f.x + 7;
  const cy = f.y + 7;
  if (f.state === 'spawn') {
    ctx.globalAlpha = Math.max(0.15, 1 - f.timer);
    drawFoeBody(ctx, f, t, false);
    ctx.globalAlpha = 1;
    return;
  }
  if (f.state === 'out') {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(f.spin * 2);
    ctx.translate(-cx, -cy);
    drawFoeBody(ctx, f, t, false);
    ctx.restore();
    return;
  }
  if (f.state === 'ball' || f.state === 'roll') {
    // A packed snowball, with the foe's feet sticking out until it rolls.
    const crack = f.state === 'ball' && f.melt < 1.6;
    const shake = crack ? Math.sin(t * 60) * 1 : 0;
    circle(ctx, cx + shake, cy, 8.5, '#ffffff');
    ctx.fillStyle = 'rgba(147,197,253,0.55)';
    ctx.beginPath();
    ctx.arc(cx + shake, cy, 8.5, 0.2, Math.PI * 0.9);
    ctx.fill();
    if (f.state === 'roll') {
      ctx.strokeStyle = 'rgba(96,165,250,0.8)';
      ctx.lineWidth = 1.2;
      for (let k = 0; k < 3; k++) {
        const a = f.spin + (k * Math.PI * 2) / 3;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * 3, cy + Math.sin(a) * 3);
        ctx.lineTo(cx + Math.cos(a) * 7.5, cy + Math.sin(a) * 7.5);
        ctx.stroke();
      }
    } else {
      fillRound(ctx, cx - 5, f.y + 12, 3.5, 2.5, 1, FOE_COLORS[f.kind][1]);
      fillRound(ctx, cx + 1.5, f.y + 12, 3.5, 2.5, 1, FOE_COLORS[f.kind][1]);
      if (crack) {
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(cx - 3, cy - 6);
        ctx.lineTo(cx, cy - 1);
        ctx.lineTo(cx - 2, cy + 3);
        ctx.stroke();
      }
    }
    return;
  }
  drawFoeBody(ctx, f, t, angry && f.snow === 0);
  if (f.snow > 0) {
    // Snow piles up from the feet: a quarter of the body per layer.
    const shiver = f.melt < 0.4 ? Math.sin(t * 50) * 0.8 : 0;
    const h = (f.snow / 4) * 16;
    ctx.save();
    ctx.beginPath();
    ctx.rect(f.x - 4 + shiver, f.y + 15 - h, 22, h + 1);
    ctx.clip();
    circle(ctx, cx + shiver, cy + 1, 8.5, '#f8fafc');
    ctx.restore();
    ctx.fillStyle = '#ffffff';
    for (let k = -1; k <= 1; k++) circle(ctx, cx + k * 4 + shiver, f.y + 15 - h, 2.6, '#ffffff');
  }
}

function drawBoss(ctx: CanvasRenderingContext2D, b: Boss, t: number) {
  const cx = b.x + b.w / 2;
  const by = b.y + b.h;
  if (b.hurt > 0 && Math.floor(t * 30) % 2 === 0) ctx.globalAlpha = 0.5;
  if (b.dying > 0) ctx.globalAlpha = Math.max(0, 1 - b.dying / 2);
  switch (b.kind) {
    case 'troll': {
      fillRound(ctx, b.x + 6, b.y + 10, b.w - 12, b.h - 12, 10, '#7dd3fc');
      fillRound(ctx, b.x + 10, b.y + 18, b.w - 20, b.h - 26, 8, '#e0f2fe');
      // Horns, eyes, tusks, arms and feet.
      ctx.fillStyle = '#e2e8f0';
      for (const k of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(cx + k * 8, b.y + 12);
        ctx.lineTo(cx + k * 18, b.y - 2);
        ctx.lineTo(cx + k * 13, b.y + 14);
        ctx.fill();
        circle(ctx, cx + k * 7, b.y + 18, 3.5, '#fff');
        circle(ctx, cx + k * 7 + b.dir, b.y + 18, 1.8, '#1e3a8a');
        fillRound(ctx, cx + k * (b.w / 2 - 2) - 4, b.y + 18, 8, 14, 4, '#38bdf8');
        fillRound(ctx, cx + k * 9 - 6, by - 6, 12, 6, 3, '#0369a1');
      }
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.moveTo(cx - 6, b.y + 25);
      ctx.lineTo(cx - 4, b.y + 31);
      ctx.lineTo(cx - 2, b.y + 25);
      ctx.moveTo(cx + 2, b.y + 25);
      ctx.lineTo(cx + 4, b.y + 31);
      ctx.lineTo(cx + 6, b.y + 25);
      ctx.fill();
      break;
    }
    case 'djinn': {
      // A wisp of flame below a fiery torso with folded arms.
      const sway = Math.sin(t * 6) * 3;
      ctx.fillStyle = 'rgba(251,146,60,0.75)';
      ctx.beginPath();
      ctx.moveTo(cx - 12, b.y + 24);
      ctx.quadraticCurveTo(cx - 6 + sway, by + 2, cx + sway, by + 6);
      ctx.quadraticCurveTo(cx + 6 + sway, by + 2, cx + 12, b.y + 24);
      ctx.fill();
      fillRound(ctx, b.x + 6, b.y + 8, b.w - 12, 22, 10, '#f97316');
      fillRound(ctx, b.x + 4, b.y + 18, b.w - 8, 8, 4, '#ea580c');
      circle(ctx, cx, b.y + 6, 9, '#fb923c');
      ctx.fillStyle = '#fde047';
      ctx.beginPath();
      ctx.moveTo(cx - 6, b.y - 1);
      ctx.lineTo(cx, b.y - 10 - sway);
      ctx.lineTo(cx + 6, b.y - 1);
      ctx.fill();
      circle(ctx, cx - 3, b.y + 5, 1.6, '#7c2d12');
      circle(ctx, cx + 3, b.y + 5, 1.6, '#7c2d12');
      ctx.strokeStyle = '#7c2d12';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(cx, b.y + 8, 3, 0.2, Math.PI - 0.2);
      ctx.stroke();
      break;
    }
    case 'king': {
      const puffs = [[-18, 6, 12], [-6, 0, 15], [8, 2, 14], [20, 8, 11], [0, 12, 16]];
      for (const [dx, dy, r] of puffs) circle(ctx, cx + dx, b.y + dy + 8, r, '#475569');
      for (const [dx, dy, r] of puffs) circle(ctx, cx + dx, b.y + dy + 6, r - 3, '#64748b');
      // Crown.
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.moveTo(cx - 12, b.y - 2);
      for (let k = 0; k <= 4; k++) ctx.lineTo(cx - 12 + k * 6, b.y - (k % 2 ? 2 : 10));
      ctx.lineTo(cx + 12, b.y - 2);
      ctx.closePath();
      ctx.fill();
      for (const k of [-1, 1]) {
        circle(ctx, cx + k * 7, b.y + 12, 3.2, '#fef9c3');
        circle(ctx, cx + k * 7, b.y + 12, 1.6, '#0f172a');
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(cx + k * 3, b.y + 8);
        ctx.lineTo(cx + k * 11, b.y + 6);
        ctx.stroke();
      }
      ctx.strokeStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(cx, b.y + 24, 5, Math.PI + 0.3, -0.3);
      ctx.stroke();
      break;
    }
  }
  ctx.globalAlpha = 1;
}

/* ---------------------------------------------------------------- items */

const POTION_COLORS: Record<string, string> = { red: '#ef4444', blue: '#3b82f6', yellow: '#facc15', green: '#22c55e' };

export function drawTreat(ctx: CanvasRenderingContext2D, kind: string, x: number, y: number) {
  if (kind.startsWith('potion-')) {
    const c = POTION_COLORS[kind.slice(7)] ?? '#fff';
    fillRound(ctx, x - 4, y - 2, 8, 9, 3, c);
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(x - 1.5, y - 6, 3, 4);
    fillRound(ctx, x - 2.5, y - 7, 5, 2, 1, '#92400e');
    circle(ctx, x - 1.5, y + 1, 1.2, 'rgba(255,255,255,0.7)');
    return;
  }
  switch (kind) {
    case 'cherry':
      circle(ctx, x - 2.5, y + 2, 3, '#dc2626');
      circle(ctx, x + 2.5, y + 3, 3, '#dc2626');
      ctx.strokeStyle = '#15803d';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x - 2, y - 1);
      ctx.lineTo(x + 1, y - 6);
      ctx.lineTo(x + 2.5, y);
      ctx.stroke();
      break;
    case 'icecream':
      ctx.fillStyle = '#d97706';
      ctx.beginPath();
      ctx.moveTo(x - 4, y - 1);
      ctx.lineTo(x, y + 7);
      ctx.lineTo(x + 4, y - 1);
      ctx.fill();
      circle(ctx, x, y - 2, 4, '#f9a8d4');
      circle(ctx, x + 1, y - 5, 1.2, '#dc2626');
      break;
    case 'cake':
      fillRound(ctx, x - 5, y - 1, 10, 7, 2, '#fde68a');
      fillRound(ctx, x - 5, y - 3, 10, 3, 1.5, '#f472b6');
      circle(ctx, x, y - 5, 1.5, '#dc2626');
      break;
    case 'cocoa':
      fillRound(ctx, x - 4, y - 3, 8, 9, 2, '#e5e7eb');
      ctx.fillStyle = '#78350f';
      ctx.fillRect(x - 3, y - 2, 6, 2);
      ctx.strokeStyle = '#e5e7eb';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(x + 5, y + 1, 2, -1.4, 1.4);
      ctx.stroke();
      break;
    case 'donut':
      circle(ctx, x, y + 1, 5.5, '#f472b6');
      circle(ctx, x, y + 1, 2, '#1e293b');
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(x - 3, y - 2, 1.5, 1);
      ctx.fillRect(x + 2, y + 3, 1.5, 1);
      break;
    default:
      fillRound(ctx, x - 5, y - 4, 10, 10, 2, '#22c55e');
      ctx.fillStyle = '#facc15';
      ctx.fillRect(x - 1, y - 4, 2, 10);
      ctx.fillRect(x - 5, y, 10, 2);
  }
}

/* ---------------------------------------------------------------- frame */

export function render(ctx: CanvasRenderingContext2D, s: State) {
  const zone = zoneOf(s.stageIndex);
  const t = s.stageTime + s.phaseTime;
  backdrop(ctx, zone, t);
  const sx = s.shake > 0 ? (Math.random() - 0.5) * 5 : 0;
  ctx.save();
  ctx.translate(sx, 0);

  if (s.phase === 'transition' && s.prev) {
    // Climb the tower: the old floor drops away and the next comes down.
    const p = transitionProgress(s);
    const e = p * p * (3 - 2 * p);
    ctx.save();
    ctx.translate(0, e * H);
    drawTiles(ctx, s.prev, ZONES[zoneOf(Math.max(0, s.stageIndex - 1))]);
    ctx.restore();
    ctx.save();
    ctx.translate(0, (e - 1) * H);
    drawTiles(ctx, s.stage, ZONES[zone]);
    drawPenguin(ctx, s.hero.x, s.hero.y, s.hero.facing, t, false);
    ctx.restore();
    ctx.restore();
    return;
  }

  drawTiles(ctx, s.stage, ZONES[zone]);

  for (const b of s.bolts) {
    if (b.warn > 0) {
      ctx.fillStyle = `rgba(253,224,71,${0.15 + 0.15 * Math.sin(t * 30)})`;
      ctx.fillRect(b.x - 8, 0, 16, H);
    } else {
      ctx.strokeStyle = '#fef9c3';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(b.x, 0);
      for (let y = 20; y <= H; y += 20) ctx.lineTo(b.x + (Math.sin(y + t * 80) > 0 ? 5 : -5), y);
      ctx.stroke();
      ctx.fillStyle = 'rgba(254,249,195,0.25)';
      ctx.fillRect(b.x - 10, 0, 20, H);
    }
  }

  for (const l of s.loot) {
    if (l.life < 2 && Math.floor(l.life * 8) % 2 === 0) continue;
    drawTreat(ctx, l.kind, l.x + 6, l.y + 6);
  }
  if (s.boss) drawBoss(ctx, s.boss, t);
  for (const f of s.foes) drawFoe(ctx, f, t, s.hurry > 0);

  for (const sh of s.shots) {
    circle(ctx, sh.x + sh.w / 2, sh.y + sh.h / 2, sh.w / 2 + 0.5, '#ffffff');
    circle(ctx, sh.x + sh.w / 2 - 1, sh.y + sh.h / 2 - 1, sh.w / 5, '#dbeafe');
  }
  for (const fb of s.fires) {
    circle(ctx, fb.x + 5, fb.y + 5, 6, 'rgba(249,115,22,0.35)');
    circle(ctx, fb.x + 5, fb.y + 5, 4, '#f97316');
    circle(ctx, fb.x + 5, fb.y + 5, 2, '#fde68a');
  }

  const hero = s.hero;
  const blink = s.invuln > 0 && Math.floor(s.invuln * 12) % 2 === 0;
  if (!blink) drawPenguin(ctx, hero.x, hero.y, hero.facing, t, Math.abs(hero.vx) > 1 && hero.onGround, { shield: s.potions.shield > 0, dead: s.dying > 0 });

  if (s.chaser) {
    const c = s.chaser;
    for (const [dx, dy, r] of [[-7, 2, 7], [0, -3, 9], [8, 2, 7]]) circle(ctx, c.x + dx, c.y + dy, r, '#334155');
    circle(ctx, c.x - 3, c.y, 2, '#f87171');
    circle(ctx, c.x + 4, c.y, 2, '#f87171');
    ctx.fillStyle = 'rgba(148,163,184,0.6)';
    for (let k = 0; k < 4; k++) ctx.fillRect(c.x - 7 + k * 4, c.y + 9 + ((t * 20 + k * 5) % 6), 1, 3);
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
  // Potions in effect.
  const active: string[] = [];
  if (s.potions.speed) active.push('red');
  if (s.potions.power) active.push('blue');
  if (s.potions.range) active.push('yellow');
  if (s.potions.shield > 0) active.push('green');
  active.forEach((p, i) => drawTreat(ctx, `potion-${p}`, 24 + i * 12, 22));

  const b = s.boss;
  if (b && b.dying === 0 && s.phase === 'play') {
    text(ctx, BOSS_INFO[b.kind].name, W / 2, 10, { size: 8 });
    fillRound(ctx, W / 2 - 60, 16, 120, 6, 3, 'rgba(0,0,0,0.5)');
    fillRound(ctx, W / 2 - 59, 17, 118 * (b.hp / b.maxHp), 4, 2, '#f43f5e');
  }
  if (s.phase === 'play' && s.hurry === 1 && s.stageTime - Math.floor(s.stageTime) < 0.6) {
    text(ctx, 'HURRY UP!', W / 2, 40, { size: 16, color: '#fde047' });
  }
  if (s.phase === 'intro') {
    const a = Math.min(1, (1.5 - s.phaseTime) * 3);
    ctx.globalAlpha = Math.max(0, a);
    fillRound(ctx, W / 2 - 92, H / 2 - 34, 184, 64, 12, 'rgba(15,23,42,0.75)');
    text(ctx, s.boss ? 'BOSS FLOOR' : `FLOOR ${s.stageIndex + 1}`, W / 2, H / 2 - 14, { size: 18, color: '#e0f2fe' });
    text(ctx, s.boss ? BOSS_INFO[s.boss.kind].name : ZONES[zoneOf(s.stageIndex)].name, W / 2, H / 2 + 8, { size: 10, color: '#bae6fd', weight: 600 });
    ctx.globalAlpha = 1;
  }
  if (s.phase === 'clear') {
    text(ctx, 'FLOOR CLEAR!', W / 2, H / 2 - 30, { size: 18, color: '#fde68a' });
  }
}
