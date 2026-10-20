import { circle, drawSparks, fillRound, text } from '../_shared/arcade/draw';
import { COLS, H, ROWS, SOFT, T, W, WALL, idx, mid } from './maze';
import { AREAS, PER_AREA } from './stages';
import type { ItemKind } from './stages';
import type { Bomber, Boss, Enemy, State } from './world';

/** Blast Maze artwork, drawn with canvas shapes. */

const HATS = ['#facc15', '#38bdf8', '#4ade80', '#f87171'];
export const BOMBER_NAMES = ['You', 'Blue', 'Green', 'Red'];

function areaOf(s: State) {
  return s.mode === 'battle' ? AREAS[(s.round - 1) % AREAS.length] : AREAS[s.plan.area];
}

function tiles(ctx: CanvasRenderingContext2D, s: State) {
  const a = areaOf(s);
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const x = c * T;
      const y = r * T;
      const v = s.grid[idx(c, r)];
      if (v === WALL) {
        if (s.pressure[idx(c, r)]) {
          ctx.fillStyle = '#52525b';
          ctx.fillRect(x, y, T, T);
          ctx.fillStyle = '#facc15';
          for (let k = -1; k < 3; k++) {
            ctx.beginPath();
            ctx.moveTo(x + k * 6, y + T);
            ctx.lineTo(x + k * 6 + 3, y + T);
            ctx.lineTo(x + k * 6 + 3 + T, y);
            ctx.lineTo(x + k * 6 + T, y);
            ctx.fill();
          }
          continue;
        }
        ctx.fillStyle = a.wall[1];
        ctx.fillRect(x, y, T, T);
        ctx.fillStyle = a.wall[0];
        ctx.fillRect(x, y, T - 2, T - 3);
        ctx.fillStyle = 'rgba(255,255,255,0.18)';
        ctx.fillRect(x, y, T - 2, 2);
        ctx.fillRect(x, y, 2, T - 3);
        continue;
      }
      ctx.fillStyle = (c + r) % 2 ? a.floor[0] : a.floor[1];
      ctx.fillRect(x, y, T, T);
      // Pillar shadows.
      if (r > 0 && s.grid[idx(c, r - 1)] === WALL) {
        ctx.fillStyle = 'rgba(0,0,0,0.18)';
        ctx.fillRect(x, y, T, 3);
      }
      if (v === SOFT) soft(ctx, s, x, y, a.soft);
    }
  }
}

function soft(ctx: CanvasRenderingContext2D, s: State, x: number, y: number, [hi, lo]: [string, string]) {
  const area = s.mode === 'battle' ? (s.round - 1) % AREAS.length : s.plan.area;
  fillRound(ctx, x + 1, y + 1, T - 2, T - 2, area === 0 || area === 3 ? 5 : 2, lo);
  fillRound(ctx, x + 1, y + 1, T - 2, T - 4, area === 0 || area === 3 ? 5 : 2, hi);
  ctx.fillStyle = lo;
  if (area === 0) {
    // Hedge: leafy bumps.
    circle(ctx, x + 5, y + 6, 2.2, lo);
    circle(ctx, x + 11, y + 5, 2, lo);
    circle(ctx, x + 8, y + 10, 2.2, lo);
  } else if (area === 1) {
    // Crate.
    ctx.fillRect(x + 2, y + 7, T - 4, 1.5);
    ctx.fillRect(x + 7, y + 2, 1.5, T - 6);
  } else if (area === 2) {
    // Crystal cluster.
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.beginPath();
    ctx.moveTo(x + 8, y + 2);
    ctx.lineTo(x + 11, y + 8);
    ctx.lineTo(x + 8, y + 12);
    ctx.lineTo(x + 5, y + 8);
    ctx.fill();
  } else if (area === 3) {
    ctx.fillStyle = 'rgba(160, 200, 230, 0.6)';
    ctx.fillRect(x + 3, y + 8, T - 6, 1);
    ctx.fillRect(x + 4, y + 4, 4, 1);
  } else {
    // Barrel with hazard band.
    ctx.fillStyle = '#facc15';
    ctx.fillRect(x + 2, y + 6, T - 4, 3);
    ctx.fillStyle = lo;
    ctx.fillRect(x + 5, y + 6, 2, 3);
    ctx.fillRect(x + 10, y + 6, 2, 3);
  }
}

const ITEM_COLORS: Record<ItemKind, string> = {
  bomb: '#1e293b',
  fire: '#ea580c',
  speed: '#0ea5e9',
  remote: '#7c3aed',
  kick: '#a16207',
  pass: '#64748b',
  bombpass: '#334155',
  vest: '#0d9488',
  life: '#db2777',
};

export function itemIcon(ctx: CanvasRenderingContext2D, kind: ItemKind, x: number, y: number) {
  fillRound(ctx, x + 1, y + 1, 14, 14, 3, '#fef3c7');
  fillRound(ctx, x + 2, y + 2, 12, 12, 2, ITEM_COLORS[kind]);
  const cx = x + 8;
  const cy = y + 8;
  ctx.fillStyle = '#fff';
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 1.4;
  switch (kind) {
    case 'bomb':
      circle(ctx, cx, cy + 1, 3.5, '#fff');
      ctx.fillRect(cx + 1, cy - 4, 1.5, 2);
      break;
    case 'fire':
      ctx.fillStyle = '#fde047';
      ctx.beginPath();
      ctx.moveTo(cx, cy - 5);
      ctx.quadraticCurveTo(cx + 5, cy, cx, cy + 5);
      ctx.quadraticCurveTo(cx - 5, cy, cx, cy - 5);
      ctx.fill();
      break;
    case 'speed':
      ctx.beginPath();
      ctx.moveTo(cx - 4, cy + 3);
      ctx.lineTo(cx + 4, cy + 3);
      ctx.lineTo(cx + 4, cy);
      ctx.lineTo(cx, cy - 1);
      ctx.lineTo(cx - 1, cy - 4);
      ctx.lineTo(cx - 4, cy - 4);
      ctx.fill();
      break;
    case 'remote':
      ctx.fillRect(cx - 2, cy - 4, 4, 8);
      circle(ctx, cx, cy - 1.5, 1.2, '#ef4444');
      break;
    case 'kick':
      ctx.fillRect(cx - 2, cy - 4, 3, 6);
      ctx.fillRect(cx - 2, cy + 1, 6, 3);
      break;
    case 'pass':
      ctx.strokeRect(cx - 4, cy - 4, 8, 8);
      ctx.beginPath();
      ctx.moveTo(cx - 5, cy);
      ctx.lineTo(cx + 5, cy);
      ctx.stroke();
      break;
    case 'bombpass':
      circle(ctx, cx - 1, cy + 1, 3, '#fff');
      ctx.beginPath();
      ctx.moveTo(cx + 2, cy - 3);
      ctx.lineTo(cx + 5, cy);
      ctx.lineTo(cx + 2, cy + 3);
      ctx.stroke();
      break;
    case 'vest':
      ctx.beginPath();
      ctx.moveTo(cx, cy - 5);
      ctx.lineTo(cx + 4, cy - 3);
      ctx.lineTo(cx + 3, cy + 3);
      ctx.lineTo(cx, cy + 5);
      ctx.lineTo(cx - 3, cy + 3);
      ctx.lineTo(cx - 4, cy - 3);
      ctx.fill();
      break;
    case 'life':
      ctx.beginPath();
      ctx.moveTo(cx, cy + 4);
      ctx.bezierCurveTo(cx - 6, cy - 1, cx - 3, cy - 6, cx, cy - 2);
      ctx.bezierCurveTo(cx + 3, cy - 6, cx + 6, cy - 1, cx, cy + 4);
      ctx.fill();
      break;
  }
}

/** A little mole in a hard hat. */
export function drawBomber(ctx: CanvasRenderingContext2D, b: Bomber, t: number, hat = HATS[b.id]) {
  if (!b.alive && b.deadT <= 0) return;
  if (b.alive && b.vest > 0 && b.vest < 3 && Math.floor(t * 12) % 2) return;
  ctx.save();
  ctx.translate(b.x, b.y + 1);
  if (!b.alive) {
    const k = Math.max(0, b.deadT / 1.2);
    ctx.rotate((1 - k) * 8);
    ctx.scale(k, k);
  }
  const step = b.moving ? Math.sin(b.anim) * 1.5 : 0;
  // Feet.
  ctx.fillStyle = '#7c2d12';
  ctx.fillRect(-5 + step, 4, 3, 2);
  ctx.fillRect(2 - step, 4, 3, 2);
  // Body and face.
  circle(ctx, 0, 0, 6.5, '#8b5a2b');
  circle(ctx, 0, 1.5, 4.5, '#d6a578');
  const lx = b.dir === 1 ? 1.5 : b.dir === 3 ? -1.5 : 0;
  const ly = b.dir === 0 ? -1 : b.dir === 2 ? 0.5 : 0;
  if (b.dir !== 0) {
    circle(ctx, -2 + lx, -0.5 + ly, 1, '#1c1917');
    circle(ctx, 2 + lx, -0.5 + ly, 1, '#1c1917');
    circle(ctx, lx * 1.4, 2 + ly, 1.4, '#f472b6');
  }
  // Hard hat with a lamp.
  ctx.fillStyle = hat;
  ctx.beginPath();
  ctx.arc(0, -3, 6, Math.PI, 0);
  ctx.fill();
  ctx.fillRect(-7, -3.5, 14, 2);
  circle(ctx, 0, -6, 1.6, '#fff7cc');
  if (b.vest > 0) {
    ctx.strokeStyle = `rgba(45, 212, 191, ${0.5 + Math.sin(t * 10) * 0.3})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, 9, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

function drawEnemy(ctx: CanvasRenderingContext2D, e: Enemy) {
  const k = e.alive ? 1 : Math.max(0, e.deadT / 0.7);
  ctx.save();
  ctx.translate(e.x, e.y);
  ctx.scale(k, k);
  if (!e.alive) ctx.rotate((1 - k) * 6);
  const w = Math.sin(e.anim);
  const eyes = (y: number, color = '#111', gap = 2.2) => {
    circle(ctx, -gap, y, 1.6, '#fff');
    circle(ctx, gap, y, 1.6, '#fff');
    circle(ctx, -gap, y + 0.3, 0.8, color);
    circle(ctx, gap, y + 0.3, 0.8, color);
  };
  switch (e.kind) {
    case 'puffle':
    case 'mini': {
      const r = e.kind === 'mini' ? 4.5 : 6.5;
      ctx.fillStyle = '#f472b6';
      ctx.beginPath();
      ctx.ellipse(0, 1, r + w * 0.6, r - w * 0.6, 0, 0, Math.PI * 2);
      ctx.fill();
      eyes(-0.5);
      break;
    }
    case 'bouncer': {
      const hop = Math.abs(w) * 2.5;
      circle(ctx, 0, -hop, 6, '#fb923c');
      ctx.fillStyle = '#7c2d12';
      ctx.fillRect(-4, 4, 3, 2);
      ctx.fillRect(1, 4, 3, 2);
      eyes(-1.5 - hop);
      break;
    }
    case 'ghostie':
    case 'hurry': {
      ctx.globalAlpha *= e.kind === 'hurry' ? 0.95 : 0.8;
      ctx.fillStyle = e.kind === 'hurry' ? '#7e22ce' : '#e2e8f0';
      ctx.beginPath();
      ctx.arc(0, -1, 6, Math.PI, 0);
      for (let i = 0; i <= 4; i++) ctx.lineTo(6 - i * 3, 5 + (i % 2) * 2 + w);
      ctx.fill();
      eyes(-1.5, e.kind === 'hurry' ? '#ef4444' : '#1e3a8a');
      break;
    }
    case 'chaser': {
      circle(ctx, 0, 1, 6, '#dc2626');
      ctx.fillStyle = '#7f1d1d';
      ctx.beginPath();
      ctx.moveTo(-5, -3);
      ctx.lineTo(-6, -8);
      ctx.lineTo(-2, -5);
      ctx.moveTo(5, -3);
      ctx.lineTo(6, -8);
      ctx.lineTo(2, -5);
      ctx.fill();
      eyes(0, '#111', 2.4);
      break;
    }
    case 'zapper': {
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2 + e.anim * 0.5;
        const r = i % 2 ? 4 : 7;
        ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      ctx.fill();
      eyes(0, '#111', 1.8);
      break;
    }
    case 'splitter': {
      ctx.fillStyle = '#22c55e';
      ctx.beginPath();
      ctx.ellipse(0, 1, 7, 5.5 + w * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#14532d';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, -4);
      ctx.lineTo(1, 0);
      ctx.lineTo(-1, 3);
      ctx.stroke();
      eyes(-1, '#111', 3);
      break;
    }
  }
  ctx.restore();
}

function drawBoss(ctx: CanvasRenderingContext2D, b: Boss, t: number) {
  if (!b.alive && b.deadT <= 0) return;
  if (b.alive && b.invuln > 0 && Math.floor(t * 16) % 2) return;
  ctx.save();
  ctx.translate(b.x, b.y);
  ctx.globalAlpha = b.alive ? b.vis : Math.max(0, b.deadT / 2);
  if (!b.alive) ctx.rotate(t * 4);
  const pulse = Math.sin(t * 4);
  const eye = (x: number, y: number, r = 2.6, pupil = '#111') => {
    circle(ctx, x, y, r, '#fff');
    circle(ctx, x, y + 0.4, r * 0.5, pupil);
  };
  switch (b.kind) {
    case 0:
      ctx.fillStyle = '#ec4899';
      ctx.beginPath();
      ctx.ellipse(0, 2, 14 + pulse, 12 - pulse, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.moveTo(-8, -8);
      ctx.lineTo(-8, -15);
      ctx.lineTo(-4, -11);
      ctx.lineTo(0, -16);
      ctx.lineTo(4, -11);
      ctx.lineTo(8, -15);
      ctx.lineTo(8, -8);
      ctx.fill();
      eye(-5, 0);
      eye(5, 0);
      break;
    case 1: {
      const flap = Math.sin(t * 9) * 6;
      ctx.fillStyle = '#b45309';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-20, -6 + flap);
      ctx.lineTo(-8, 8);
      ctx.moveTo(0, 0);
      ctx.lineTo(20, -6 + flap);
      ctx.lineTo(8, 8);
      ctx.fill();
      circle(ctx, 0, 0, 10, '#d97706');
      eye(-4, -2, 2.6, '#7f1d1d');
      eye(4, -2, 2.6, '#7f1d1d');
      ctx.fillStyle = '#fde68a';
      ctx.beginPath();
      ctx.moveTo(-2, 3);
      ctx.lineTo(2, 3);
      ctx.lineTo(0, 7);
      ctx.fill();
      break;
    }
    case 2:
      ctx.fillStyle = '#4c1d95';
      ctx.beginPath();
      ctx.arc(0, -3, 12, Math.PI, 0);
      for (let i = 0; i <= 6; i++) ctx.lineTo(12 - i * 4, 12 + (i % 2) * 3 + pulse);
      ctx.fill();
      circle(ctx, -4, -3, 2.4, '#a3e635');
      circle(ctx, 4, -3, 2.4, '#a3e635');
      break;
    case 3:
      fillRound(ctx, -12, -11, 24, 22, 5, '#64748b');
      fillRound(ctx, -9, -8, 18, 9, 3, '#0f172a');
      circle(ctx, -4, -4, 2, '#f87171');
      circle(ctx, 4, -4, 2, '#f87171');
      ctx.save();
      ctx.translate(0, 6);
      ctx.rotate(t * 3);
      ctx.fillStyle = '#facc15';
      for (let i = 0; i < 8; i++) {
        ctx.rotate(Math.PI / 4);
        ctx.fillRect(-1.5, -6, 3, 3);
      }
      circle(ctx, 0, 0, 4, '#facc15');
      ctx.restore();
      break;
    default: {
      ctx.fillStyle = '#1c1917';
      ctx.beginPath();
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2 + t;
        const r = i % 2 ? 11 : 15;
        ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      ctx.fill();
      circle(ctx, 0, 0, 9, '#b91c1c');
      circle(ctx, 0, 0, 5 + pulse, '#fb923c');
      circle(ctx, 0, 0, 2.5, '#fef08a');
    }
  }
  ctx.restore();
  if (b.alive) {
    fillRound(ctx, b.x - 14, b.y - 22, 28, 4, 2, 'rgba(0,0,0,0.5)');
    fillRound(ctx, b.x - 13, b.y - 21, 26 * (b.hp / b.maxHp), 2, 1, '#ef4444');
  }
}

function flames(ctx: CanvasRenderingContext2D, s: State) {
  for (const f of s.flames) {
    const x = mid(f.c);
    const y = mid(f.r);
    const k = Math.min(1, f.t / 0.15) * (0.75 + 0.25 * Math.sin(s.time * 40 + f.c));
    for (const [color, w] of [
      ['rgba(234, 88, 12, 0.9)', 7],
      ['#fde047', 3.6],
    ] as const) {
      ctx.fillStyle = color;
      const ww = w * k;
      if (f.dir === -1) {
        circle(ctx, x, y, ww + 1.5, color);
        ctx.fillRect(x - T / 2, y - ww, T, ww * 2);
        ctx.fillRect(x - ww, y - T / 2, ww * 2, T);
      } else if (f.dir % 2 === 1) {
        const x0 = f.end && f.dir === 1 ? x - T / 2 : f.end ? x - ww : x - T / 2;
        const x1 = f.end && f.dir === 3 ? x + T / 2 : f.end ? x + ww : x + T / 2;
        ctx.fillRect(x0, y - ww, x1 - x0, ww * 2);
        if (f.end) circle(ctx, x, y, ww, color);
      } else {
        const y0 = f.end && f.dir === 2 ? y - T / 2 : f.end ? y - ww : y - T / 2;
        const y1 = f.end && f.dir === 0 ? y + T / 2 : f.end ? y + ww : y + T / 2;
        ctx.fillRect(x - ww, y0, ww * 2, y1 - y0);
        if (f.end) circle(ctx, x, y, ww, color);
      }
    }
  }
}

function bombs(ctx: CanvasRenderingContext2D, s: State) {
  for (const b of s.bombs) {
    const urgent = !b.remote && b.t < 0.8;
    const k = 1 + Math.sin(s.time * (urgent ? 30 : 10)) * 0.06;
    ctx.save();
    ctx.translate(b.x, b.y + 1);
    ctx.scale(k, k);
    circle(ctx, 1, 2, 6, 'rgba(0,0,0,0.25)');
    circle(ctx, 0, 0, 6, b.remote ? '#1e3a8a' : b.owner === -1 ? '#7f1d1d' : '#1f2937');
    circle(ctx, -2, -2, 1.8, 'rgba(255,255,255,0.5)');
    ctx.strokeStyle = '#a16207';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(2, -5);
    ctx.quadraticCurveTo(4, -8, 6, -7);
    ctx.stroke();
    if (b.remote) circle(ctx, 0, 0, 1.5, Math.floor(s.time * 4) % 2 ? '#ef4444' : '#fca5a5');
    else circle(ctx, 6, -7, 1.4 + Math.random() * 0.8, Math.floor(s.time * 20) % 2 ? '#fde047' : '#fb923c');
    ctx.restore();
  }
}

export function render(ctx: CanvasRenderingContext2D, s: State) {
  ctx.save();
  if (s.shake > 0) ctx.translate((Math.random() - 0.5) * s.shake * 3, (Math.random() - 0.5) * s.shake * 3);
  tiles(ctx, s);
  for (const c of s.crumbles) {
    const k = c.t / 0.4;
    ctx.globalAlpha = k;
    const a = areaOf(s);
    fillRound(ctx, c.c * T + 1 + (1 - k) * 4, c.r * T + 1 + (1 - k) * 4, (T - 2) * k, (T - 2) * k, 3, a.soft[0]);
    ctx.globalAlpha = 1;
  }
  if (s.exit && s.exit.revealed) {
    const x = (s.exit.i % COLS) * T;
    const y = Math.floor(s.exit.i / COLS) * T;
    if (s.exit.open) {
      for (let k = 0; k < 3; k++) circle(ctx, x + 8, y + 8, 7 - k * 2, ['#7c3aed', '#a78bfa', '#ede9fe'][k]);
      ctx.strokeStyle = 'rgba(255,255,255,0.8)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(x + 8, y + 8, 4, s.time * 4, s.time * 4 + 4);
      ctx.stroke();
    } else {
      fillRound(ctx, x + 1, y + 1, 14, 14, 3, '#57534e');
      ctx.fillStyle = '#a8a29e';
      ctx.fillRect(x + 3, y + 7, 10, 2);
      ctx.fillRect(x + 7, y + 3, 2, 10);
    }
  }
  for (const d of s.drops) if (d.safe < 0.3) itemIcon(ctx, d.kind, d.c * T, d.r * T);
  bombs(ctx, s);
  flames(ctx, s);
  for (const e of s.enemies) drawEnemy(ctx, e);
  for (const b of s.bombers) drawBomber(ctx, b, s.time);
  if (s.boss) drawBoss(ctx, s.boss, s.time);
  drawSparks(ctx, s.sparks);
  for (const q of s.pops) {
    ctx.globalAlpha = Math.min(1, q.t * 2);
    text(ctx, q.text, q.x, q.y - (1 - q.t) * 14, { size: 7, color: '#fff' });
    ctx.globalAlpha = 1;
  }
  ctx.restore();

  if (s.phase === 'intro') {
    ctx.fillStyle = 'rgba(15, 23, 42, 0.78)';
    ctx.fillRect(0, H / 2 - 30, W, 56);
    if (s.mode === 'battle') {
      text(ctx, `Round ${s.round}`, W / 2, H / 2 - 10, { size: 16, color: '#fde047' });
      text(ctx, 'Last bomber standing wins', W / 2, H / 2 + 10, { size: 8, color: '#e2e8f0', weight: 600 });
    } else {
      const k = s.stage % PER_AREA;
      text(ctx, s.plan.boss !== null ? `Boss: ${AREAS[s.plan.area].boss}` : `Stage ${s.plan.area + 1}-${k + 1}`, W / 2, H / 2 - 10, { size: 15, color: '#fde047' });
      text(ctx, AREAS[s.plan.area].name, W / 2, H / 2 + 10, { size: 8, color: '#e2e8f0', weight: 600 });
    }
  } else if (s.phase === 'clear') {
    text(ctx, 'Stage clear!', W / 2, H / 2 - 8, { size: 16, color: '#fde047' });
  } else if (s.phase === 'roundEnd') {
    ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
    ctx.fillRect(20, 40, W - 40, H - 80);
    const w = s.roundWinner;
    text(ctx, w === -1 ? 'Draw!' : w === 0 ? 'You win the round!' : `${BOMBER_NAMES[w]} wins the round`, W / 2, 60, { size: 12, color: '#fde047' });
    s.bombers.forEach((b, i) => {
      const y = 86 + i * 22;
      drawBomber(ctx, { ...b, x: 70, y, alive: true, vest: 0, dir: 2, moving: false }, 0);
      text(ctx, BOMBER_NAMES[i], 92, y, { size: 8, color: '#fff', align: 'left' });
      for (let k = 0; k < 3; k++) circle(ctx, 150 + k * 14, y, 5, k < b.wins ? '#facc15' : 'rgba(255,255,255,0.2)');
    });
  }
  if (s.mode === 'battle' && s.phase === 'play' && !s.bombers[0].alive) {
    text(ctx, 'Watching the rest of the round…', W / 2, 8, { size: 7, color: '#fff' });
  }
  if (s.mode === 'battle' && s.phase === 'play' && s.clock <= 0) {
    if (Math.floor(s.time * 3) % 2) text(ctx, 'Sudden death!', W / 2, H - 8, { size: 9, color: '#fde047' });
  }
}

