import { circle, fillRound, text } from '../_shared/arcade/draw';
import { CANDY_R, H, W, candyPos } from './engine';
import type { State } from './engine';
import { PER_BOX } from './levels';

/** Snip Snack drawing: the box backdrop, ropes, the sweet, the Nibbler and props. */
const THEMES = [
  { bg: '#d9b383', line: '#c49d6c', tape: '#e8d2a8' },
  { bg: '#9c7a55', line: '#87674a', tape: '#b8936a' },
  { bg: '#5b7fc4', line: '#4f70b0', tape: '#8eb0ea' },
];

function backdrop(ctx: CanvasRenderingContext2D, s: State) {
  const th = THEMES[Math.floor(s.level / PER_BOX) % THEMES.length];
  ctx.fillStyle = th.bg;
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = th.line;
  ctx.lineWidth = 1;
  if (s.level < PER_BOX) {
    // Corrugated cardboard.
    for (let y = 0; y < H; y += 6) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }
  } else if (s.level < PER_BOX * 2) {
    // Wooden planks.
    for (let x = 0; x < W; x += 64) {
      ctx.fillStyle = (x / 64) % 2 ? '#a5835c' : '#957350';
      ctx.fillRect(x, 0, 64, H);
      ctx.strokeRect(x, 0, 64, H);
    }
  } else {
    // Toy-box polka dots.
    for (let y = 20; y < H; y += 40) for (let x = (y / 40) % 2 ? 0 : 20; x < W; x += 40) circle(ctx, x, y, 6, th.line);
  }
  ctx.fillStyle = th.tape;
  ctx.globalAlpha = 0.6;
  ctx.fillRect(0, 0, W, 10);
  ctx.globalAlpha = 1;
}

function star(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, t: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.sin(t * 2) * 0.15);
  circle(ctx, 0, 0, r * 1.4, 'rgba(255,230,120,0.25)');
  ctx.fillStyle = '#ffd34a';
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * 0.45 : r;
    ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#d99a14';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();
}

function ropes(ctx: CanvasRenderingContext2D, s: State) {
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const l of s.links) {
    if (l.cut) continue;
    const a = s.pts[l.a];
    const b = s.pts[l.b];
    ctx.strokeStyle = '#6b4a2a';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    ctx.strokeStyle = '#a77b4a';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
  // Number badges by each live rope's anchor (keys 1–9 cut them).
  const seen = new Set<number>();
  for (const l of s.links) {
    if (seen.has(l.rope)) continue;
    seen.add(l.rope);
    if (l.rope > 8 || !s.links.some((o) => o.rope === l.rope && !o.cut) || s.severed[l.rope]) continue;
    const a = s.pts[l.a];
    circle(ctx, a.x + 10, a.y - 9, 6, 'rgba(0,0,0,0.45)');
    text(ctx, String(l.rope + 1), a.x + 10, a.y - 9, { size: 8, weight: 800 });
  }
  // Anchors: every pinned point.
  for (const p of s.pts) {
    if (!p.pinned) continue;
    circle(ctx, p.x, p.y + 1, 7, 'rgba(0,0,0,0.25)');
    circle(ctx, p.x, p.y, 6.5, '#c9a24a');
    circle(ctx, p.x - 2, p.y - 2, 2.2, '#f3dc94');
  }
}

function sweet(ctx: CanvasRenderingContext2D, x: number, y: number, t: number) {
  // Wrapper twists either side, then a red-and-white swirl.
  ctx.fillStyle = '#ff8fb8';
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(x + side * (CANDY_R - 2), y);
    ctx.lineTo(x + side * (CANDY_R + 9), y - 7);
    ctx.lineTo(x + side * (CANDY_R + 7), y);
    ctx.lineTo(x + side * (CANDY_R + 9), y + 7);
    ctx.closePath();
    ctx.fill();
  }
  circle(ctx, x, y, CANDY_R, '#ffffff');
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, CANDY_R, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = '#e8453c';
  for (let i = 0; i < 4; i++) {
    const a = t * 2 + (i * Math.PI) / 2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.arc(x, y, CANDY_R, a, a + 0.75);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
  circle(ctx, x - 4, y - 4, 3, 'rgba(255,255,255,0.8)');
}

function nibbler(ctx: CanvasRenderingContext2D, s: State) {
  const [x, y] = s.def.monster;
  const c = candyPos(s);
  const near = Math.hypot(c.x - x, c.y - y);
  const open = s.phase === 'play' ? Math.max(0, Math.min(1, 1 - (near - 30) / 120)) : s.phase === 'won' ? Math.max(0, 1 - s.phaseT * 3) : 0;
  const bob = Math.sin(s.time * 3) * 1.5;
  // The little crate it sits on.
  fillRound(ctx, x - 26, y + 14, 52, 22, 3, '#8a5a2b');
  ctx.strokeStyle = '#6b4320';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x - 26, y + 14, 52, 22);
  // Body.
  circle(ctx, x, y + bob, 24, '#5cbf4a');
  circle(ctx, x - 6, y - 6 + bob, 14, '#74d460');
  // Eyes follow the sweet.
  const ang = Math.atan2(c.y - y, c.x - x);
  for (const ex of [-9, 9]) {
    circle(ctx, x + ex, y - 12 + bob, 7, '#ffffff');
    circle(ctx, x + ex + Math.cos(ang) * 2.5, y - 12 + bob + Math.sin(ang) * 2.5, 3.2, s.phase === 'lost' ? '#555' : '#1d2a12');
  }
  // Mouth: opens wide as the sweet comes near; a frown after a miss.
  if (s.phase === 'lost') {
    ctx.strokeStyle = '#1d4a12';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(x, y + 14 + bob, 8, Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();
  } else {
    ctx.fillStyle = '#7a1f28';
    ctx.beginPath();
    ctx.ellipse(x, y + 4 + bob, 12, 3 + open * 9, 0, 0, Math.PI * 2);
    ctx.fill();
    if (open > 0.3) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x - 6, y + bob - 1 - open * 6, 4, 4);
      ctx.fillRect(x + 2, y + bob - 1 - open * 6, 4, 4);
    }
  }
}

function props(ctx: CanvasRenderingContext2D, s: State) {
  for (const [x1, y1, x2, y2] of s.def.spikes ?? []) {
    const len = Math.hypot(x2 - x1, y2 - y1);
    const n = Math.max(2, Math.round(len / 12));
    const nx = -(y2 - y1) / len;
    const ny = (x2 - x1) / len;
    ctx.fillStyle = '#5f6670';
    ctx.fillRect(Math.min(x1, x2) - 2, Math.min(y1, y2) - 2, Math.abs(x2 - x1) + 4, Math.abs(y2 - y1) + 4);
    for (let i = 0; i < n; i++) {
      const t0 = i / n;
      const t1 = (i + 1) / n;
      const ax = x1 + (x2 - x1) * t0;
      const ay = y1 + (y2 - y1) * t0;
      const bx = x1 + (x2 - x1) * t1;
      const by = y1 + (y2 - y1) * t1;
      for (const side of [-1, 1]) {
        ctx.fillStyle = side < 0 ? '#c9d0d8' : '#9aa3ad';
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo((ax + bx) / 2 + nx * 9 * side, (ay + by) / 2 + ny * 9 * side);
        ctx.lineTo(bx, by);
        ctx.closePath();
        ctx.fill();
      }
    }
  }
  for (const p of s.pins) {
    if (p.used) continue;
    ctx.setLineDash([4, 5]);
    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    circle(ctx, p.x, p.y, 6.5, '#c9a24a');
    circle(ctx, p.x, p.y, 2.5, '#6b4a2a');
  }
  (s.def.blowers ?? []).forEach(([x, y, dir]) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(dir);
    fillRound(ctx, -16, -12, 22, 24, 6, '#e05a8a');
    fillRound(ctx, -12, -9, 14, 18, 4, '#f08fb0');
    ctx.fillStyle = '#9a2f55';
    ctx.beginPath();
    ctx.moveTo(6, -6);
    ctx.lineTo(16, -9);
    ctx.lineTo(16, 9);
    ctx.lineTo(6, 6);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  });
  for (const p of s.puffs) {
    const k = p.t / 0.5;
    for (let i = 0; i < 3; i++) {
      const d = 20 + k * 120 + i * 14;
      circle(ctx, p.x + Math.cos(p.dir) * d, p.y + Math.sin(p.dir) * d + (i - 1) * 8 * k, 6 + k * 8, `rgba(255,255,255,${0.6 * (1 - k)})`);
    }
  }
}

export function render(ctx: CanvasRenderingContext2D, s: State) {
  backdrop(ctx, s);
  props(ctx, s);
  for (const st of s.stars) if (!st.got) star(ctx, st.x, st.y, 13, s.time);
  nibbler(ctx, s);
  ropes(ctx, s);
  const c = candyPos(s);
  const eaten = s.phase === 'won';
  if (!eaten) sweet(ctx, c.x, c.y, s.time);
  for (const b of s.bubbles) {
    if (b.popped) continue;
    circle(ctx, b.x, b.y, 24, 'rgba(180,230,255,0.28)');
    ctx.strokeStyle = 'rgba(255,255,255,0.75)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(b.x, b.y, 24, 0, Math.PI * 2);
    ctx.stroke();
    circle(ctx, b.x - 8, b.y - 9, 4, 'rgba(255,255,255,0.8)');
  }
  // The swipe trail.
  if (s.swipe.length > 1) {
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    s.swipe.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.stroke();
  }
  // Stars collected, top left.
  for (let i = 0; i < 3; i++) {
    const got = i < s.stars.filter((o) => o.got).length;
    ctx.globalAlpha = got ? 1 : 0.3;
    star(ctx, 22 + i * 26, 28, 10, 0);
  }
  ctx.globalAlpha = 1;
  // First-time tips, placed clear of each level's props.
  const tip = (msg: string, y: number) => {
    fillRound(ctx, W / 2 - 104, y - 13, 208, 26, 10, 'rgba(0,0,0,0.45)');
    text(ctx, msg, W / 2, y, { size: 10, weight: 800 });
  };
  const floating = s.bubbles.some((b) => b.holding);
  if (s.phase === 'play') {
    if (s.level === 0 && s.stats.cuts === 0) tip('Swipe across the rope to cut it', 200);
    if (s.level === 5 && floating) tip('Bubbles carry the sweet upward', H - 40);
    if (s.level === 6 && floating) tip(s.stats.taps === 0 ? 'Tap the blower to puff air' : 'Tap the bubble to pop it', 60);
    if (s.level === 7 && s.stats.cuts === 0) tip('Dotted rings tie on a new rope', H - 18);
  }
  if (s.phase === 'lost') {
    fillRound(ctx, W / 2 - 110, H / 2 - 20, 220, 40, 12, 'rgba(0,0,0,0.55)');
    text(ctx, s.lostWhy === 'spikes' ? 'Ouch — the spikes got it!' : 'The sweet got away!', W / 2, H / 2, { size: 13, weight: 900 });
  }
}
