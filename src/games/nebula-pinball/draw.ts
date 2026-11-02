import { circle, fillRound, text } from '../_shared/arcade/draw';
import { H, W, inPlay } from './game';
import type { State } from './game';
import { ARCH, BALL_R, BUMPERS, DROPS, DROP_X, LANE_POSTS, LANE_REST_Y, LANE_X, SAUCER, SLINGS, TOP_LANES, flipperTip } from './table';
import type { Flipper, Seg } from './table';

/** Nebula Pinball drawing: a deep-space table with planet bumpers and a black-hole saucer. */

function backdrop(ctx: CanvasRenderingContext2D, t: number) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#0d0a26');
  g.addColorStop(0.55, '#1b1145');
  g.addColorStop(1, '#0a1630');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  // Nebula clouds.
  const blob = (x: number, y: number, r: number, c: string) => {
    const rg = ctx.createRadialGradient(x, y, 0, x, y, r);
    rg.addColorStop(0, c);
    rg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = rg;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  };
  blob(70, 120, 120, 'rgba(160,60,200,0.28)');
  blob(190, 260, 130, 'rgba(40,160,200,0.2)');
  blob(110, 360, 110, 'rgba(220,70,140,0.18)');
  for (let i = 0; i < 70; i++) {
    const x = (i * 53.3) % W;
    const y = (i * 97.7) % H;
    ctx.globalAlpha = 0.35 + 0.35 * Math.sin(t * 1.5 + i * 2.1);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x, y, i % 5 === 0 ? 1.6 : 1, i % 5 === 0 ? 1.6 : 1);
  }
  ctx.globalAlpha = 1;
}

function rail(ctx: CanvasRenderingContext2D, s: Seg, color: string, core: string) {
  ctx.lineCap = 'round';
  ctx.strokeStyle = color;
  ctx.lineWidth = s.r * 2 + 2;
  ctx.beginPath();
  ctx.moveTo(s.x1, s.y1);
  ctx.lineTo(s.x2, s.y2);
  ctx.stroke();
  ctx.strokeStyle = core;
  ctx.lineWidth = Math.max(1, s.r * 0.9);
  ctx.beginPath();
  ctx.moveTo(s.x1, s.y1);
  ctx.lineTo(s.x2, s.y2);
  ctx.stroke();
}

function walls(ctx: CanvasRenderingContext2D, s: State) {
  // Outside the arch is the cabinet.
  ctx.fillStyle = '#07051a';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(W, 0);
  ctx.lineTo(W, ARCH.cy);
  ctx.ellipse(ARCH.cx, ARCH.cy, ARCH.rx, ARCH.ry, 0, 0, Math.PI, true);
  ctx.lineTo(0, ARCH.cy);
  ctx.closePath();
  ctx.fill();
  ctx.fillRect(0, 0, 10, H);
  ctx.fillRect(258, 0, W - 258, H);
  // Plunger lane floor.
  ctx.fillStyle = 'rgba(10,8,30,0.7)';
  ctx.fillRect(241, 112, 16, H - 112);
  for (const w of s.walls) {
    if (w.kind === 'sling') continue;
    if (w.kind === 'rubber') rail(ctx, w, '#ff6fa8', '#ffd1e3');
    else if (w.kind === 'post') rail(ctx, w, '#ffcf5a', '#fff2c4');
    else if (w.kind === 'gate') rail(ctx, w, '#7f8aa8', '#c9d2e8');
    else rail(ctx, w, '#3fd0e8', '#c8f6ff');
  }
}

function slings(ctx: CanvasRenderingContext2D, s: State) {
  SLINGS.forEach((sl, i) => {
    const lit = s.flash.slings[i] > 0;
    ctx.fillStyle = lit ? 'rgba(255,120,190,0.75)' : 'rgba(120,60,180,0.55)';
    ctx.beginPath();
    ctx.moveTo(sl.a[0], sl.a[1]);
    ctx.lineTo(sl.b[0], sl.b[1]);
    ctx.lineTo(sl.c[0], sl.c[1]);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = lit ? '#ffffff' : '#ff6fa8';
    ctx.lineWidth = lit ? 7 : 6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(sl.a[0], sl.a[1]);
    ctx.lineTo(sl.c[0], sl.c[1]);
    ctx.stroke();
  });
}

const PLANETS = [
  ['#ffb35a', '#c2531a'],
  ['#7fd3ff', '#2a62b8'],
  ['#b98cff', '#5a2aa8'],
];

function bumpers(ctx: CanvasRenderingContext2D, s: State) {
  BUMPERS.forEach((b, i) => {
    const f = s.flash.bumpers[i];
    if (f > 0) circle(ctx, b.x, b.y, b.r + 8 + f * 20, `rgba(255,255,255,${f * 1.6})`);
    const g = ctx.createRadialGradient(b.x - 4, b.y - 5, 2, b.x, b.y, b.r);
    g.addColorStop(0, f > 0 ? '#ffffff' : PLANETS[i][0]);
    g.addColorStop(1, PLANETS[i][1]);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.fill();
    // A tilted ring.
    ctx.strokeStyle = 'rgba(255,255,255,0.65)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(b.x, b.y, b.r + 5, 4, -0.35, 0, Math.PI * 2);
    ctx.stroke();
    text(ctx, String(100 * (1 + s.bumperLevel)), b.x, b.y, { size: 7, color: 'rgba(255,255,255,0.9)', weight: 800 });
  });
}

function saucer(ctx: CanvasRenderingContext2D, s: State, t: number) {
  const { x, y, r } = SAUCER;
  const hot = s.multiball || s.lockLit;
  ctx.save();
  ctx.translate(x, y);
  for (let k = 0; k < 3; k++) {
    ctx.rotate(t * (1.5 + k * 0.6));
    ctx.strokeStyle = hot ? `rgba(255,${180 - k * 40},80,${0.7 - k * 0.15})` : `rgba(160,120,255,${0.55 - k * 0.12})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, 0, r + 5 + k * 3, r - 1 + k * 1.5, 0, 0, Math.PI * 1.4);
    ctx.stroke();
  }
  ctx.restore();
  circle(ctx, x, y, r, '#000000');
  circle(ctx, x, y, r - 2, '#05030f');
  const label = s.multiball ? 'JACKPOT' : s.lockLit ? 'LOCK' : 'BLACK HOLE';
  const blink = hot && Math.floor(t * 4) % 2 === 0;
  text(ctx, label, x + 2, y + 22, { size: 6.5, color: blink ? '#ffe27a' : hot ? '#ffb35a' : 'rgba(200,180,255,0.75)', weight: 800 });
  if (s.locks > 0 && !s.multiball) for (let i = 0; i < s.locks; i++) circle(ctx, x - 6 + i * 6, y - 15, 2, '#ffe27a');
}

function targets(ctx: CanvasRenderingContext2D, s: State) {
  DROPS.forEach((d, i) => {
    const up = s.drops[i];
    fillRound(ctx, DROP_X - 3, d.y1, 6, d.y2 - d.y1, 2, up ? '#ffcf5a' : 'rgba(255,207,90,0.18)');
    if (up) fillRound(ctx, DROP_X - 1, d.y1 + 2, 2, d.y2 - d.y1 - 4, 1, '#fff6d6');
  });
}

function lanes(ctx: CanvasRenderingContext2D, s: State) {
  TOP_LANES.forEach((x, i) => {
    const lit = s.lanes[i];
    const f = s.flash.lanes[i];
    const r = 5 + f * 6;
    ctx.fillStyle = lit || f > 0 ? '#ffe27a' : 'rgba(255,226,122,0.22)';
    ctx.beginPath();
    for (let k = 0; k < 10; k++) {
      const a = -Math.PI / 2 + (k * Math.PI) / 5;
      const rr = k % 2 ? r * 0.45 : r;
      ctx.lineTo(x + Math.cos(a) * rr, 84 + Math.sin(a) * rr);
    }
    ctx.closePath();
    ctx.fill();
  });
  void LANE_POSTS;
}

/** Inserts on the playfield: bonus multiplier lights and the ball-save light. */
function inserts(ctx: CanvasRenderingContext2D, s: State, t: number) {
  for (let m = 2; m <= 6; m++) {
    const x = 125 + (m - 4) * 17;
    const on = s.mult >= m;
    circle(ctx, x, 318, 7, on ? '#ff8a3c' : 'rgba(255,138,60,0.18)');
    text(ctx, `${m}×`, x, 318.5, { size: 6.5, color: on ? '#2a1205' : 'rgba(255,200,170,0.55)', weight: 900 });
  }
  const save = s.saveT > 0 && (s.saveT > 2 || Math.floor(t * 6) % 2 === 0);
  fillRound(ctx, 108, 456, 34, 11, 5, save ? '#4ff0a0' : 'rgba(79,240,160,0.14)');
  text(ctx, 'SAVE', 125, 461.5, { size: 6.5, color: save ? '#06301c' : 'rgba(160,255,210,0.45)', weight: 900 });
}

function flipper(ctx: CanvasRenderingContext2D, f: Flipper, active: boolean) {
  const [tx, ty] = flipperTip(f);
  const dx = tx - f.x;
  const dy = ty - f.y;
  const len = Math.hypot(dx, dy);
  const nx = -dy / len;
  const ny = dx / len;
  ctx.fillStyle = active ? '#e9fbff' : '#bfefff';
  ctx.beginPath();
  ctx.arc(f.x, f.y, 6.5, 0, Math.PI * 2);
  ctx.arc(tx, ty, 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(f.x + nx * 6.5, f.y + ny * 6.5);
  ctx.lineTo(tx + nx * 3.5, ty + ny * 3.5);
  ctx.lineTo(tx - nx * 3.5, ty - ny * 3.5);
  ctx.lineTo(f.x - nx * 6.5, f.y - ny * 6.5);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#2bb7d6';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(f.x + nx * 4, f.y + ny * 4);
  ctx.lineTo(tx + nx * 2, ty + ny * 2);
  ctx.stroke();
  circle(ctx, f.x, f.y, 2.2, '#2bb7d6');
}

function plunger(ctx: CanvasRenderingContext2D, s: State) {
  const top = LANE_REST_Y + BALL_R + 3 + s.plunger * 14;
  ctx.strokeStyle = '#9aa7c4';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  const coils = 6;
  for (let i = 0; i <= coils * 2; i++) {
    const y = top + 3 + ((H - top - 3) * i) / (coils * 2);
    const x = LANE_X + (i % 2 ? 5 : -5);
    if (i) ctx.lineTo(x, y);
    else ctx.moveTo(x, y);
  }
  ctx.stroke();
  fillRound(ctx, LANE_X - 7, top, 14, 4, 2, '#d8e2f5');
  if (s.plunger > 0) {
    fillRound(ctx, 242, 380, 6, 60, 3, 'rgba(255,255,255,0.12)');
    fillRound(ctx, 242, 440 - 60 * s.plunger, 6, 60 * s.plunger, 3, '#4ff0a0');
  }
}

function ball(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(x + 2, y + 3, BALL_R, BALL_R * 0.8, 0, 0, Math.PI * 2);
  ctx.fill();
  const g = ctx.createRadialGradient(x - 2, y - 2.5, 0.5, x, y, BALL_R);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.45, '#c9d3e6');
  g.addColorStop(1, '#5a6582');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, BALL_R, 0, Math.PI * 2);
  ctx.fill();
}

function messages(ctx: CanvasRenderingContext2D, s: State) {
  const shown = s.msgs.slice(-2);
  shown.forEach((m, i) => {
    const a = Math.min(1, (2.2 - m.t) * 3, m.t * 8);
    ctx.globalAlpha = Math.max(0, a);
    const y = 268 + i * 22 - (shown.length - 1) * 11;
    const size = m.big ? 15 : 11;
    fillRound(ctx, 30, y - 11, W - 60, 22, 8, 'rgba(8,6,28,0.75)');
    text(ctx, m.text, 125, y, { size, color: m.big ? '#ffe27a' : '#c8f6ff', weight: 900 });
  });
  ctx.globalAlpha = 1;
  if (s.tilted) text(ctx, 'TILT', 125, 240, { size: 34, color: '#ff4a5a', weight: 900 });
}

export function render(ctx: CanvasRenderingContext2D, s: State) {
  const t = s.time;
  ctx.save();
  if (s.shake > 0) ctx.translate(Math.sin(t * 80) * s.shake * 0.6, Math.cos(t * 67) * s.shake * 0.4);
  backdrop(ctx, t);
  inserts(ctx, s, t);
  lanes(ctx, s);
  saucer(ctx, s, t);
  walls(ctx, s);
  slings(ctx, s);
  targets(ctx, s);
  bumpers(ctx, s);
  plunger(ctx, s);
  s.flippers.forEach((f) => flipper(ctx, f, f.held));
  for (const b of inPlay(s)) ball(ctx, b.x, b.y);
  ctx.restore();
  messages(ctx, s);
  const lane = inPlay(s).find((b) => b.inLane);
  if (lane && s.bonusT < 0 && s.plunger === 0) {
    const pulse = 0.6 + 0.4 * Math.sin(t * 5);
    ctx.globalAlpha = pulse;
    fillRound(ctx, 77, 350, 96, 20, 8, 'rgba(8,6,28,0.75)');
    text(ctx, 'Hold ↓ / Space, release', 125, 356, { size: 6.5, color: '#4ff0a0', weight: 800 });
    text(ctx, 'or hold the right side', 125, 364, { size: 6.5, color: '#4ff0a0', weight: 800 });
    ctx.globalAlpha = 1;
  }
}
