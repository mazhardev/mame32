import { circle, fillRound, text } from '../_shared/arcade/draw';
import { ARENA, H, W, leaderboard, player, radiusOf, rankOf } from './engine';
import type { Snake, State } from './engine';

/** Neon Serpents drawing: a glowing hex-floor arena seen from above, following your snake. */
interface Cam {
  x: number;
  y: number;
  z: number;
}

const sx = (c: Cam, x: number) => W / 2 + (x - c.x) * c.z;
const sy = (c: Cam, y: number) => H / 2 + (y - c.y) * c.z;

function floor(ctx: CanvasRenderingContext2D, c: Cam) {
  ctx.fillStyle = '#0b0d1f';
  ctx.fillRect(0, 0, W, H);
  // Hex grid, fixed to the world so it scrolls as you move.
  const size = 34;
  const hw = size * Math.sqrt(3);
  const vh = size * 1.5;
  const x0 = c.x - W / 2 / c.z - hw;
  const x1 = c.x + W / 2 / c.z + hw;
  const y0 = c.y - H / 2 / c.z - size * 2;
  const y1 = c.y + H / 2 / c.z + size * 2;
  ctx.strokeStyle = 'rgba(80,110,200,0.16)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let row = Math.floor(y0 / vh); row * vh < y1; row++) {
    const off = row % 2 ? hw / 2 : 0;
    for (let col = Math.floor((x0 - off) / hw); col * hw + off < x1; col++) {
      const cx = col * hw + off;
      const cy = row * vh;
      for (let k = 0; k < 6; k++) {
        const a = Math.PI / 6 + (k * Math.PI) / 3;
        const px = sx(c, cx + Math.cos(a) * size);
        const py = sy(c, cy + Math.sin(a) * size);
        if (k) ctx.lineTo(px, py);
        else ctx.moveTo(px, py);
      }
      ctx.closePath();
    }
  }
  ctx.stroke();
  // Outside the arena, and its glowing wall.
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, W, H);
  ctx.arc(sx(c, 0), sy(c, 0), ARENA * c.z, 0, Math.PI * 2, true);
  ctx.fillStyle = 'rgba(120,10,30,0.55)';
  ctx.fill('evenodd');
  ctx.restore();
  ctx.strokeStyle = 'rgba(255,60,90,0.85)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(sx(c, 0), sy(c, 0), ARENA * c.z, 0, Math.PI * 2);
  ctx.stroke();
}

function snake(ctx: CanvasRenderingContext2D, c: Cam, s: Snake, time: number, me: boolean) {
  const r = radiusOf(s) * c.z;
  const n = s.pts.length;
  const light = `hsl(${s.hue},95%,62%)`;
  const dark = `hsl(${s.hue},90%,42%)`;
  if (s.boosting) {
    ctx.shadowColor = light;
    ctx.shadowBlur = 12;
  }
  for (let i = n - 1; i >= 0; i--) {
    const p = s.pts[i];
    const x = sx(c, p.x);
    const y = sy(c, p.y);
    if (x < -r * 2 || x > W + r * 2 || y < -r * 2 || y > H + r * 2) continue;
    const stripe = Math.floor((i + time * (s.boosting ? 12 : 4)) / 3) % 2;
    circle(ctx, x, y, r, stripe ? light : dark);
  }
  ctx.shadowBlur = 0;
  // Eyes on the head, looking where it is going.
  const h = s.pts[0];
  const hx = sx(c, h.x);
  const hy = sy(c, h.y);
  const a = s.angle;
  for (const side of [-1, 1]) {
    const ex = hx + Math.cos(a + side * 0.75) * r * 0.55;
    const ey = hy + Math.sin(a + side * 0.75) * r * 0.55;
    circle(ctx, ex, ey, r * 0.38, '#ffffff');
    circle(ctx, ex + Math.cos(s.want) * r * 0.14, ey + Math.sin(s.want) * r * 0.14, r * 0.2, '#111122');
  }
  if (!me) text(ctx, s.name, hx, hy - r - 7, { size: 8, color: 'rgba(255,255,255,0.75)', weight: 700 });
}

function minimap(ctx: CanvasRenderingContext2D, st: State) {
  const R = 34;
  const cx = W - R - 8;
  const cy = H - R - 8;
  circle(ctx, cx, cy, R, 'rgba(10,14,40,0.75)');
  ctx.strokeStyle = 'rgba(255,60,90,0.6)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.stroke();
  const k = R / ARENA;
  for (const s of st.snakes) {
    if (!s.alive) continue;
    const h = s.pts[0];
    const big = s.mass > 120;
    if (s.bot && !big) continue;
    circle(ctx, cx + h.x * k, cy + h.y * k, s.bot ? 1.6 : 2.6, s.bot ? `hsl(${s.hue},90%,60%)` : '#ffffff');
  }
}

function board(ctx: CanvasRenderingContext2D, st: State) {
  const top = leaderboard(st).slice(0, 5);
  fillRound(ctx, W - 112, 6, 106, 14 + top.length * 11, 6, 'rgba(10,14,40,0.6)');
  text(ctx, 'Leaderboard', W - 59, 13, { size: 7.5, color: 'rgba(255,255,255,0.7)', weight: 800 });
  top.forEach((s, i) => {
    const me = !s.bot;
    text(ctx, `${i + 1}. ${s.name}`, W - 106, 25 + i * 11, { size: 8, align: 'left', color: me ? '#ffe27a' : '#ffffff', weight: me ? 900 : 600 });
    text(ctx, String(Math.floor(s.mass)), W - 10, 25 + i * 11, { size: 8, align: 'right', color: me ? '#ffe27a' : 'rgba(255,255,255,0.8)', weight: 700 });
  });
  const p = player(st);
  if (p.alive && !top.includes(p)) text(ctx, `You: #${rankOf(st)}`, W - 59, 22 + top.length * 11 + 6, { size: 8, color: '#ffe27a', weight: 900 });
}

export function render(ctx: CanvasRenderingContext2D, st: State) {
  const p = player(st);
  const h = p.pts[0];
  const c: Cam = { x: h.x, y: h.y, z: st.zoom };
  floor(ctx, c);
  const t = st.time;
  for (const f of st.food) {
    const x = sx(c, f.x);
    const y = sy(c, f.y);
    if (x < -10 || x > W + 10 || y < -10 || y > H + 10) continue;
    const r = (2 + f.v * 0.7) * c.z * (1 + 0.15 * Math.sin(t * 4 + f.x));
    circle(ctx, x, y, r * 2.2, `hsla(${f.hue},100%,60%,0.18)`);
    circle(ctx, x, y, r, `hsl(${f.hue},100%,68%)`);
  }
  // Bigger snakes on top.
  const order = st.snakes.filter((s) => s.alive).sort((a, b) => a.mass - b.mass);
  for (const s of order) snake(ctx, c, s, t, !s.bot);
  for (const b of st.bursts) {
    const k = b.t / 0.7;
    ctx.strokeStyle = `hsla(${b.hue},100%,65%,${1 - k})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(sx(c, b.x), sy(c, b.y), (10 + k * 60) * c.z, 0, Math.PI * 2);
    ctx.stroke();
  }
  board(ctx, st);
  minimap(ctx, st);
  if (!p.alive) {
    fillRound(ctx, W / 2 - 120, H / 2 - 20, 240, 40, 12, 'rgba(0,0,0,0.6)');
    text(ctx, st.killer === 'the wall' ? 'You hit the wall!' : `You crashed into ${st.killer}!`, W / 2, H / 2, { size: 13, weight: 900 });
  } else if (st.time < 4) {
    ctx.globalAlpha = Math.min(1, (4 - st.time) * 1.5);
    fillRound(ctx, W / 2 - 130, H - 44, 260, 30, 10, 'rgba(0,0,0,0.5)');
    text(ctx, 'Steer toward the pointer · hold to boost', W / 2, H - 29, { size: 10, weight: 800 });
    ctx.globalAlpha = 1;
  }
}
