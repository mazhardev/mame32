import { fillRound, roundRect, text } from '../_shared/arcade/draw';
import { BASE, BASE_HALF, L, POCKETS, R_POCKET } from './physics';
import type { Disc } from './physics';
import { FRAME, SIZE, label } from './game';
import type { State } from './game';
import { COINS } from './rules';
import type { Color } from './rules';

/** Everything Carrom draws, with plain canvas shapes. */

function frame(ctx: CanvasRenderingContext2D) {
  const g = ctx.createLinearGradient(0, 0, SIZE, SIZE);
  g.addColorStop(0, '#7a4520');
  g.addColorStop(0.5, '#5a3216');
  g.addColorStop(1, '#3f230e');
  fillRound(ctx, 0, 0, SIZE, SIZE, 16, '#2a1709');
  fillRound(ctx, 2, 2, SIZE - 4, SIZE - 4, 14, '#000');
  roundRect(ctx, 2, 2, SIZE - 4, SIZE - 4, 14);
  ctx.fillStyle = g;
  ctx.fill();
  // Wood grain along the rails.
  ctx.strokeStyle = 'rgba(255, 220, 170, 0.07)';
  ctx.lineWidth = 1;
  for (let k = 0; k < 6; k++) {
    const o = 5 + k * 3;
    ctx.strokeRect(o, o, SIZE - 2 * o, SIZE - 2 * o);
  }
  // Cushion lip.
  ctx.fillStyle = '#2b1608';
  ctx.fillRect(FRAME - 3, FRAME - 3, L + 6, L + 6);
}

function surface(ctx: CanvasRenderingContext2D) {
  const g = ctx.createRadialGradient(L / 2, L / 2, 20, L / 2, L / 2, L * 0.75);
  g.addColorStop(0, '#f7e4bd');
  g.addColorStop(1, '#e1bf86');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, L, L);
  ctx.strokeStyle = 'rgba(120, 80, 30, 0.07)';
  ctx.lineWidth = 1.2;
  for (let k = 0; k < 16; k++) {
    const y = 10 + k * 21;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.bezierCurveTo(L * 0.3, y + 8 * Math.sin(k), L * 0.6, y - 7 * Math.cos(k * 1.7), L, y + 3);
    ctx.stroke();
  }
}

function ring(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, stroke: string, w = 1.2) {
  ctx.strokeStyle = stroke;
  ctx.lineWidth = w;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.stroke();
}

function dot(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, fill: string | CanvasGradient) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

function markings(ctx: CanvasRenderingContext2D) {
  const ink = '#3b2614';
  const red = '#b3261e';
  const half = 7.3;
  // The four baselines with their red end circles.
  for (let side = 0; side < 4; side++) {
    ctx.save();
    ctx.translate(L / 2, L / 2);
    ctx.rotate((side * Math.PI) / 2);
    ctx.translate(-L / 2, -L / 2);
    const y = L - BASE;
    ctx.strokeStyle = ink;
    ctx.lineWidth = 1.3;
    for (const o of [-half, half]) {
      ctx.beginPath();
      ctx.moveTo(L / 2 - BASE_HALF, y + o);
      ctx.lineTo(L / 2 + BASE_HALF, y + o);
      ctx.stroke();
    }
    for (const x of [L / 2 - BASE_HALF, L / 2 + BASE_HALF]) {
      dot(ctx, x, y, half, red);
      ring(ctx, x, y, half, ink, 1.3);
      ring(ctx, x, y, half - 2.5, 'rgba(255,255,255,0.35)', 1);
    }
    ctx.restore();
  }
  // Diagonal arrows towards the pockets.
  for (const [px, py] of POCKETS) {
    const dx = Math.sign(L / 2 - px) / Math.SQRT2;
    const dy = Math.sign(L / 2 - py) / Math.SQRT2;
    const x0 = px + dx * 30;
    const y0 = py + dy * 30;
    const x1 = px + dx * 112;
    const y1 = py + dy * 112;
    ctx.strokeStyle = ink;
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
    // Arrow head pointing at the pocket.
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x0 + dx * 7 - dy * 4, y0 + dy * 7 + dx * 4);
    ctx.moveTo(x0, y0);
    ctx.lineTo(x0 + dx * 7 + dy * 4, y0 + dy * 7 - dx * 4);
    ctx.stroke();
    // A small arc at the inner end.
    ctx.beginPath();
    ctx.arc(x1 + dx * 6, y1 + dy * 6, 8, Math.atan2(dy, dx) + Math.PI * 0.55, Math.atan2(dy, dx) + Math.PI * 1.45);
    ctx.stroke();
  }
  // Centre design.
  const c = L / 2;
  ring(ctx, c, c, 42, ink, 1.4);
  ring(ctx, c, c, 39, ink, 0.8);
  ctx.fillStyle = 'rgba(179, 38, 30, 0.85)';
  ctx.beginPath();
  for (let k = 0; k < 16; k++) {
    const a = (k / 16) * Math.PI * 2 - Math.PI / 2;
    const r = k % 2 ? 13 : 35;
    ctx.lineTo(c + Math.cos(a) * r, c + Math.sin(a) * r);
  }
  ctx.closePath();
  ctx.globalAlpha = 0.22;
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.strokeStyle = red;
  ctx.lineWidth = 1;
  ctx.stroke();
  dot(ctx, c, c, 9, red);
  ring(ctx, c, c, 9, ink, 1.2);
}

function pockets(ctx: CanvasRenderingContext2D) {
  for (const [px, py] of POCKETS) {
    const g = ctx.createRadialGradient(px, py, 2, px, py, R_POCKET + 1.5);
    g.addColorStop(0, '#000');
    g.addColorStop(0.75, '#140c05');
    g.addColorStop(1, '#3a2412');
    dot(ctx, px, py, R_POCKET + 1.5, g);
    ctx.strokeStyle = 'rgba(255, 230, 190, 0.25)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(px, py, R_POCKET + 1, Math.PI * 0.15, Math.PI * 0.85);
    ctx.stroke();
  }
}

const COIN_STYLE: Record<Exclude<Disc['kind'], 'striker'>, { body: string; edge: string; ring: string; hi: string }> = {
  white: { body: '#f4ebd3', edge: '#b7a37a', ring: '#cdb98f', hi: 'rgba(255,255,255,0.8)' },
  black: { body: '#2e2a27', edge: '#0f0d0c', ring: '#5d5650', hi: 'rgba(255,255,255,0.25)' },
  queen: { body: '#d0302c', edge: '#7f1513', ring: '#ff8f86', hi: 'rgba(255,255,255,0.55)' },
};

export function drawCoin(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, kind: Exclude<Disc['kind'], 'striker'>) {
  const st = COIN_STYLE[kind];
  dot(ctx, x + 1.1, y + 1.6, r, 'rgba(0,0,0,0.28)');
  dot(ctx, x, y, r, st.edge);
  dot(ctx, x, y, r - 0.9, st.body);
  ring(ctx, x, y, r * 0.68, st.ring, 1.1);
  ring(ctx, x, y, r * 0.36, st.ring, 1);
  if (kind === 'queen') dot(ctx, x, y, r * 0.18, '#ffd6d1');
  ctx.strokeStyle = st.hi;
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.arc(x, y, r - 1.8, Math.PI * 1.1, Math.PI * 1.55);
  ctx.stroke();
}

function drawStriker(ctx: CanvasRenderingContext2D, s: State) {
  const st = s.striker;
  const { x, y, r } = st;
  dot(ctx, x + 1.3, y + 1.9, r, 'rgba(0,0,0,0.3)');
  dot(ctx, x, y, r, s.invalid > 0 ? '#ef4444' : '#5b6b7d');
  dot(ctx, x, y, r - 1, '#eef3f8');
  ring(ctx, x, y, r * 0.72, s.board.turn === 'white' ? '#2563eb' : '#0f766e', 1.8);
  // A small star in the middle.
  ctx.fillStyle = s.board.turn === 'white' ? '#2563eb' : '#0f766e';
  ctx.beginPath();
  for (let k = 0; k < 10; k++) {
    const a = (k / 10) * Math.PI * 2 - Math.PI / 2;
    const rr = k % 2 ? r * 0.18 : r * 0.42;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(x, y, r - 2.2, Math.PI * 1.1, Math.PI * 1.55);
  ctx.stroke();
}

/** Where the striker would first touch a coin or a cushion along the aim. */
export function firstContact(s: State): { x: number; y: number; coin: Disc | null; wall: boolean } {
  const st = s.striker;
  const dx = Math.cos(s.aim.angle);
  const dy = Math.sin(s.aim.angle);
  let best = Infinity;
  let coin: Disc | null = null;
  for (const d of s.board.discs) {
    if (!d.on) continue;
    const R = st.r + d.r;
    const fx = st.x - d.x;
    const fy = st.y - d.y;
    const b = fx * dx + fy * dy;
    const c = fx * fx + fy * fy - R * R;
    const disc = b * b - c;
    if (disc < 0) continue;
    const t = -b - Math.sqrt(disc);
    if (t > 0.01 && t < best) {
      best = t;
      coin = d;
    }
  }
  const walls = [dx > 0 ? (L - st.r - st.x) / dx : dx < 0 ? (st.r - st.x) / dx : Infinity, dy > 0 ? (L - st.r - st.y) / dy : dy < 0 ? (st.r - st.y) / dy : Infinity];
  const tw = Math.min(...walls);
  if (tw < best) return { x: st.x + dx * tw, y: st.y + dy * tw, coin: null, wall: true };
  return { x: st.x + dx * best, y: st.y + dy * best, coin, wall: false };
}

function guide(ctx: CanvasRenderingContext2D, s: State) {
  const st = s.striker;
  const hit = firstContact(s);
  ctx.save();
  ctx.setLineDash([4, 5]);
  ctx.strokeStyle = 'rgba(30, 20, 10, 0.55)';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(st.x, st.y);
  ctx.lineTo(hit.x, hit.y);
  ctx.stroke();
  ctx.setLineDash([]);
  ring(ctx, hit.x, hit.y, st.r, 'rgba(30, 20, 10, 0.4)', 1.2);
  if (hit.coin) {
    const nx = hit.coin.x - hit.x;
    const ny = hit.coin.y - hit.y;
    const n = Math.hypot(nx, ny) || 1;
    const len = 28 + 60 * s.aim.power;
    ctx.strokeStyle = 'rgba(37, 99, 235, 0.75)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(hit.coin.x, hit.coin.y);
    ctx.lineTo(hit.coin.x + (nx / n) * len, hit.coin.y + (ny / n) * len);
    ctx.stroke();
  }
  // Power arc around the striker.
  if (s.aim.power > 0) {
    const p = s.aim.power;
    ctx.strokeStyle = p < 0.5 ? '#16a34a' : p < 0.8 ? '#f59e0b' : '#dc2626';
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(st.x, st.y, st.r + 5, -Math.PI / 2, -Math.PI / 2 + p * Math.PI * 2);
    ctx.stroke();
    ctx.lineCap = 'butt';
  }
  ctx.restore();
}

function tray(ctx: CanvasRenderingContext2D, s: State, c: Color, y: number) {
  const n = COINS - s.board.discs.filter((d) => d.on && d.kind === c).length;
  for (let k = 0; k < n; k++) drawCoin(ctx, FRAME + 8 + k * 11, y, 4.6, c);
  if (s.board.queen === c) drawCoin(ctx, FRAME + 8 + n * 11 + 4, y, 4.6, 'queen');
  text(ctx, label(s, c), SIZE - FRAME - 6, y, { size: 9, color: s.board.turn === c ? '#fde68a' : 'rgba(255,240,220,0.6)', align: 'right' });
}

export function render(ctx: CanvasRenderingContext2D, s: State) {
  ctx.clearRect(0, 0, SIZE, SIZE);
  frame(ctx);
  ctx.save();
  ctx.translate(FRAME, FRAME);
  surface(ctx);
  markings(ctx);
  pockets(ctx);
  const aiming = s.phase === 'aim' || s.phase === 'cpu-aim' || s.phase === 'cpu-power';
  if (aiming && !(s.phase === 'aim' && s.mode === 'ai' && s.board.turn === 'black')) guide(ctx, s);
  for (const d of s.board.discs) if (d.on && d.kind !== 'striker') drawCoin(ctx, d.x, d.y, d.r, d.kind);
  if (s.striker.on && s.phase !== 'pause' && s.phase !== 'end') drawStriker(ctx, s);
  else if (s.striker.on && s.phase === 'pause') {
    ctx.globalAlpha = 0.5;
    drawStriker(ctx, s);
    ctx.globalAlpha = 1;
  }

  if (s.phase === 'think') {
    const dots = '.'.repeat(1 + (Math.floor(s.time * 3) % 3));
    text(ctx, `Thinking${dots}`, L / 2, BASE - 26, { size: 11, color: 'rgba(40, 25, 10, 0.75)' });
  }
  if (s.phase === 'aim' && s.stats.shots === 0 && s.aim.power === 0) {
    fillRound(ctx, L / 2 - 122, L / 2 + 62, 244, 34, 10, 'rgba(24, 16, 8, 0.78)');
    text(ctx, 'Drag the striker sideways to place it,', L / 2, L / 2 + 72, { size: 10, color: '#fff7e6', weight: 600 });
    text(ctx, 'then pull back anywhere and let go to shoot.', L / 2, L / 2 + 86, { size: 10, color: '#fff7e6', weight: 600 });
  }
  // Notes (fouls, the queen, extra turns).
  s.notes.forEach((n, i) => {
    const y = L / 2 - 64 + i * 22;
    ctx.globalAlpha = Math.min(1, n.t * 2);
    ctx.font = '700 11px Inter, system-ui, sans-serif';
    const w = ctx.measureText(n.text).width + 18;
    fillRound(ctx, L / 2 - w / 2, y - 9, w, 18, 9, 'rgba(24, 16, 8, 0.82)');
    text(ctx, n.text, L / 2, y, { size: 11, color: '#fff7e6' });
    ctx.globalAlpha = 1;
  });
  ctx.restore();

  tray(ctx, s, 'white', SIZE - FRAME / 2);
  tray(ctx, s, 'black', FRAME / 2);
  if (s.phase !== 'end') {
    const y = s.board.turn === 'white' ? SIZE - FRAME / 2 : FRAME / 2;
    text(ctx, s.banner, SIZE / 2, y, { size: 10, color: '#fde68a' });
  }
}
