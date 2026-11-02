import { circle, fillRound, text } from '../_shared/arcade/draw';
import { BODY_H, H, HIGH_BOTTOM, LOW_H, SLIDE_H, W, onGround } from './game';
import type { State } from './game';
import { LANE_W, laneX } from './track';
import type { Item } from './track';

/** Lane Rush drawing: a pseudo-3D view from just behind the runner. */
const HORIZON = 168;
const CAM_Y = 3.6;
const CAM_BACK = 3.6;
const FOCAL = 200;
const FAR = 100;

interface Cam {
  x: number;
  z: number;
}

/** World → screen; returns [x, y, scale] or null when behind the camera. */
function proj(c: Cam, x: number, y: number, z: number): [number, number, number] | null {
  const dz = z - c.z;
  if (dz < 0.4) return null;
  const k = FOCAL / dz;
  return [W / 2 + (x - c.x) * k, HORIZON + (CAM_Y - y) * k, k];
}

function sky(ctx: CanvasRenderingContext2D, s: State) {
  const g = ctx.createLinearGradient(0, 0, 0, HORIZON);
  g.addColorStop(0, '#3a5fd9');
  g.addColorStop(0.6, '#f08a6a');
  g.addColorStop(1, '#ffd08a');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, HORIZON + 2);
  circle(ctx, 200, HORIZON - 34, 22, 'rgba(255,240,200,0.85)');
  // City skyline, drifting slowly with distance.
  const off = (s.z * 0.6) % 40;
  ctx.fillStyle = '#5b3f78';
  for (let i = -1; i < 9; i++) {
    const x = i * 40 - off;
    const hgt = 22 + ((i * 37 + Math.floor((s.z * 0.6) / 40) * 13) % 5) * 9;
    ctx.fillRect(x, HORIZON - hgt, 32, hgt);
  }
  ctx.fillStyle = '#7a4f86';
  for (let i = -1; i < 12; i++) {
    const x = i * 26 - ((s.z * 1.1) % 26);
    const hgt = 10 + ((i * 53) % 4) * 6;
    ctx.fillRect(x, HORIZON - hgt, 20, hgt);
  }
}

function ground(ctx: CanvasRenderingContext2D, c: Cam) {
  // Gravel on either side, the three-lane track in the middle.
  ctx.fillStyle = '#6f5a4a';
  ctx.fillRect(0, HORIZON, W, H - HORIZON);
  const edge = (x: number, z: number) => proj(c, x, 0, z);
  const near = c.z + 0.5;
  const far = c.z + FAR;
  const L = laneX(-1) - LANE_W / 2 - 0.2;
  const R = laneX(1) + LANE_W / 2 + 0.2;
  const a = edge(L, near);
  const b = edge(R, near);
  const cc = edge(R, far);
  const d = edge(L, far);
  if (a && b && cc && d) {
    ctx.fillStyle = '#8b8f99';
    ctx.beginPath();
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(b[0], b[1]);
    ctx.lineTo(cc[0], cc[1]);
    ctx.lineTo(d[0], d[1]);
    ctx.closePath();
    ctx.fill();
  }
  // Sleepers across the track, scrolling with distance.
  const first = Math.floor(c.z / 2) * 2 + 2;
  for (let z = first; z < c.z + 60; z += 2) {
    const p1 = edge(L, z);
    const p2 = edge(R, z);
    if (!p1 || !p2) continue;
    ctx.strokeStyle = 'rgba(70,55,45,0.55)';
    ctx.lineWidth = Math.max(1, p1[2] * 0.18);
    ctx.beginPath();
    ctx.moveTo(p1[0], p1[1]);
    ctx.lineTo(p2[0], p2[1]);
    ctx.stroke();
  }
  // Rails: two per lane.
  for (const lane of [-1, 0, 1]) {
    for (const side of [-0.45, 0.45]) {
      const x = laneX(lane) + side;
      const p1 = edge(x, near);
      const p2 = edge(x, far);
      if (!p1 || !p2) continue;
      ctx.strokeStyle = '#c9ced8';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(p1[0], p1[1]);
      ctx.lineTo(p2[0], p2[1]);
      ctx.stroke();
    }
  }
  // Lamp posts along both sides.
  const firstPost = Math.floor(c.z / 12) * 12 + 12;
  for (let z = firstPost + 48; z >= firstPost; z -= 12) {
    for (const x of [L - 0.8, R + 0.8]) {
      const base = proj(c, x, 0, z);
      const top = proj(c, x, 3.4, z);
      if (!base || !top) continue;
      ctx.strokeStyle = '#3b3047';
      ctx.lineWidth = Math.max(1, base[2] * 0.12);
      ctx.beginPath();
      ctx.moveTo(base[0], base[1]);
      ctx.lineTo(top[0], top[1]);
      ctx.stroke();
      circle(ctx, top[0], top[1], Math.max(1, top[2] * 0.18), '#ffe9a8');
    }
  }
}

/* ------------------------------------------------------------- obstacles */
/** A box from (x0..x1, y0..y1, z0..z1) seen from behind: front face, top, and the side facing the camera. */
function box(ctx: CanvasRenderingContext2D, c: Cam, x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, front: string, top: string, side: string) {
  const zf = Math.max(z0, c.z + 0.5);
  const zb = z1;
  if (zb <= zf) return;
  const P = (x: number, y: number, z: number) => proj(c, x, y, z) as [number, number, number];
  const f = [P(x0, y0, zf), P(x1, y0, zf), P(x1, y1, zf), P(x0, y1, zf)];
  const b = [P(x0, y0, zb), P(x1, y0, zb), P(x1, y1, zb), P(x0, y1, zb)];
  const poly = (pts: [number, number, number][], color: string) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
    ctx.closePath();
    ctx.fill();
  };
  // Side visible from the camera.
  if (x1 < c.x) poly([f[1], b[1], b[2], f[2]], side);
  if (x0 > c.x) poly([f[0], b[0], b[3], f[3]], side);
  // Top, if the camera is above it.
  if (y1 < CAM_Y) poly([f[3], f[2], b[2], b[3]], top);
  poly(f, front);
}

const TRAINS = [
  ['#d8432f', '#f06a52', '#9e2a1c'],
  ['#2f7fd8', '#5aa0ef', '#1d4f8a'],
  ['#2fa86a', '#58c78d', '#1c6b44'],
];

function drawItem(ctx: CanvasRenderingContext2D, c: Cam, it: Item, t: number) {
  const x = laneX(it.lane);
  switch (it.kind) {
    case 'block': {
      const [front, top, side] = TRAINS[it.style % 3];
      const hw = LANE_W * 0.45;
      box(ctx, c, x - hw, x + hw, 0, 2.5, it.z, it.z + it.len, front, top, side);
      // Windscreen and lights on the front, if it is still ahead.
      if (it.z > c.z + 0.6) {
        const a = proj(c, x - hw * 0.8, 2.2, it.z);
        const b = proj(c, x + hw * 0.8, 1.4, it.z);
        if (a && b) fillRound(ctx, a[0], a[1], b[0] - a[0], b[1] - a[1], 2, '#1d2433');
        for (const dx of [-hw * 0.6, hw * 0.6]) {
          const l = proj(c, x + dx, 0.5, it.z);
          if (l) circle(ctx, l[0], l[1], Math.max(1, l[2] * 0.12), '#fff3b0');
        }
      }
      break;
    }
    case 'low': {
      // A striped hurdle on two legs.
      const hw = LANE_W * 0.42;
      box(ctx, c, x - hw, x + hw, LOW_H - 0.3, LOW_H, it.z, it.z + it.len, '#f2f2f2', '#ffffff', '#cccccc');
      const p = proj(c, x - hw, LOW_H, it.z);
      const q = proj(c, x + hw, LOW_H - 0.3, it.z);
      if (p && q) {
        ctx.fillStyle = '#e04a3a';
        const w = q[0] - p[0];
        for (let i = 0; i < 4; i++) ctx.fillRect(p[0] + (w * (i * 2 + 0.5)) / 8, p[1], w / 8, q[1] - p[1]);
      }
      for (const dx of [-hw * 0.85, hw * 0.85]) {
        const a = proj(c, x + dx, LOW_H - 0.3, it.z);
        const b = proj(c, x + dx, 0, it.z);
        if (a && b) {
          ctx.strokeStyle = '#555';
          ctx.lineWidth = Math.max(1, a[2] * 0.08);
          ctx.beginPath();
          ctx.moveTo(a[0], a[1]);
          ctx.lineTo(b[0], b[1]);
          ctx.stroke();
        }
      }
      break;
    }
    case 'high': {
      // An overhead bar on tall posts.
      const hw = LANE_W * 0.48;
      box(ctx, c, x - hw, x + hw, HIGH_BOTTOM, HIGH_BOTTOM + 0.45, it.z, it.z + it.len, '#f2c230', '#ffd75a', '#c99a17');
      const p = proj(c, x - hw, HIGH_BOTTOM + 0.45, it.z);
      const q = proj(c, x + hw, HIGH_BOTTOM, it.z);
      if (p && q) {
        ctx.fillStyle = '#2b2b2b';
        const w = q[0] - p[0];
        for (let i = 0; i < 5; i++) {
          ctx.beginPath();
          const x0 = p[0] + (w * i) / 5;
          ctx.moveTo(x0, q[1]);
          ctx.lineTo(x0 + w / 10, p[1]);
          ctx.lineTo(x0 + w / 5, p[1]);
          ctx.lineTo(x0 + w / 10, q[1]);
          ctx.fill();
        }
      }
      for (const dx of [-hw, hw]) {
        const a = proj(c, x + dx, HIGH_BOTTOM + 0.45, it.z);
        const b = proj(c, x + dx, 0, it.z);
        if (a && b) {
          ctx.strokeStyle = '#4a4a55';
          ctx.lineWidth = Math.max(1, a[2] * 0.1);
          ctx.beginPath();
          ctx.moveTo(a[0], a[1]);
          ctx.lineTo(b[0], b[1]);
          ctx.stroke();
        }
      }
      break;
    }
    case 'coin': {
      const p = proj(c, x, it.y, it.z);
      if (!p) break;
      const r = 0.28 * p[2];
      const w = Math.abs(Math.cos(t * 5 + it.z)) * r;
      ctx.fillStyle = '#d99a14';
      ctx.beginPath();
      ctx.ellipse(p[0], p[1], Math.max(0.6, w), r, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffd84a';
      ctx.beginPath();
      ctx.ellipse(p[0], p[1], Math.max(0.4, w * 0.7), r * 0.75, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    default: {
      const p = proj(c, x, it.y + Math.sin(t * 4) * 0.1, it.z);
      if (!p) break;
      const r = 0.42 * p[2];
      circle(ctx, p[0], p[1], r * 1.3, 'rgba(255,255,255,0.35)');
      circle(ctx, p[0], p[1], r, it.kind === 'magnet' ? '#e04a3a' : it.kind === 'shield' ? '#3fa3f0' : '#9b5de5');
      const glyph = it.kind === 'magnet' ? 'U' : it.kind === 'shield' ? '◆' : '2×';
      text(ctx, glyph, p[0], p[1] + r * 0.05, { size: Math.max(5, r * 1.05), color: '#ffffff', weight: 900 });
    }
  }
}

/* ---------------------------------------------------------------- runner */
function runner(ctx: CanvasRenderingContext2D, c: Cam, s: State) {
  const base = proj(c, s.x, s.y, s.z);
  const ground = proj(c, s.x, 0, s.z);
  if (!base || !ground) return;
  const k = base[2];
  const [x, y] = base;
  // Shadow.
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.ellipse(ground[0], ground[1], 0.42 * k * (1 - s.y * 0.15), 0.12 * k, 0, 0, Math.PI * 2);
  ctx.fill();
  if (s.safeT > 0 && Math.floor(s.time * 20) % 2 === 0) return;
  const sliding = s.slideT > 0 && onGround(s);
  const air = !onGround(s);
  const run = s.crashed ? 0 : s.z * 1.6;
  const swing = Math.sin(run) * (air || sliding ? 0 : 1);
  const u = k * 0.1;
  ctx.lineCap = 'round';
  const limb = (x1: number, y1: number, x2: number, y2: number, w: number, color: string) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = w * u;
    ctx.beginPath();
    ctx.moveTo(x + x1 * u, y - y1 * u);
    ctx.lineTo(x + x2 * u, y - y2 * u);
    ctx.stroke();
  };
  if (s.crashed) {
    // Knocked flat, stars circling.
    fillRound(ctx, x - 5 * u, y - 4 * u, 10 * u, 4 * u, 2 * u, '#2b9bb5');
    circle(ctx, x, y - 6 * u, 2.2 * u, '#f1c7a1');
    for (let i = 0; i < 3; i++) {
      const a = s.time * 6 + i * 2.1;
      text(ctx, '★', x + Math.cos(a) * 4 * u, y - 9 * u + Math.sin(a) * 1.2 * u, { size: 2.4 * u, color: '#ffe27a' });
    }
    return;
  }
  const h = sliding ? SLIDE_H / BODY_H : 1;
  const hip = (sliding ? 3 : 8) * 1;
  // Legs.
  if (sliding) {
    limb(-1, 2, -1.5, 0.5, 2.2, '#2b3a63');
    limb(1, 2, 2.5, 3.5, 2.2, '#2b3a63');
  } else if (air) {
    limb(-1.2, hip, -1.6, 4, 2.4, '#2b3a63');
    limb(-1.6, 4, -1.2, 1.5, 2.2, '#2b3a63');
    limb(1.2, hip, 1.8, 4.5, 2.4, '#2b3a63');
    limb(1.8, 4.5, 1.2, 2.5, 2.2, '#2b3a63');
  } else {
    limb(-1.1, hip, -1.1 - swing * 0.6, 4 + swing * 1.5, 2.4, '#2b3a63');
    limb(-1.1 - swing * 0.6, 4 + swing * 1.5, -1.1, 0.4 + Math.max(0, swing) * 1.8, 2.2, '#2b3a63');
    limb(1.1, hip, 1.1 + swing * 0.6, 4 - swing * 1.5, 2.4, '#2b3a63');
    limb(1.1 + swing * 0.6, 4 - swing * 1.5, 1.1, 0.4 + Math.max(0, -swing) * 1.8, 2.2, '#2b3a63');
  }
  // Shoes.
  if (!sliding) {
    circle(ctx, x - 1.1 * u, y - (0.4 + Math.max(0, swing) * 1.8) * u, 1.2 * u, '#f2f2f2');
    circle(ctx, x + 1.1 * u, y - (0.4 + Math.max(0, -swing) * 1.8) * u, 1.2 * u, '#f2f2f2');
  }
  // Hoodie and backpack.
  const torso = sliding ? 4.5 : 7.5;
  const tb = sliding ? 3 : hip;
  fillRound(ctx, x - 2.6 * u, y - (tb + torso) * u, 5.2 * u, torso * u, 1.6 * u, '#2b9bb5');
  fillRound(ctx, x - 2 * u, y - (tb + torso - 1) * u, 4 * u, torso * 0.65 * u, 1.2 * u, '#f08a2c');
  ctx.fillStyle = '#c96a17';
  ctx.fillRect(x - 2 * u, y - (tb + torso * 0.55) * u, 4 * u, 0.6 * u);
  // Arms.
  const ay = tb + torso - 1;
  if (air) {
    limb(-2.6, ay, -4.2, ay + 3, 1.6, '#2b9bb5');
    limb(2.6, ay, 4.2, ay + 3, 1.6, '#2b9bb5');
  } else {
    limb(-2.6, ay, -3.2, ay - 3.5 + swing * 1.5, 1.6, '#2b9bb5');
    limb(2.6, ay, 3.2, ay - 3.5 - swing * 1.5, 1.6, '#2b9bb5');
  }
  // Head with a cap worn backwards.
  const hy = y - (tb + torso + 2) * u;
  circle(ctx, x, hy, 2.3 * u, '#3a2618');
  ctx.fillStyle = '#e0443a';
  ctx.beginPath();
  ctx.arc(x, hy - 0.3 * u, 2.4 * u, Math.PI, 0);
  ctx.fill();
  fillRound(ctx, x - 1.4 * u, hy + 0.1 * u, 2.8 * u, 1.1 * u, 0.5 * u, '#b8322a');
  void h;
  if (s.shield) {
    ctx.strokeStyle = `rgba(110,190,255,${0.55 + 0.25 * Math.sin(s.time * 6)})`;
    ctx.lineWidth = 0.4 * u;
    ctx.beginPath();
    ctx.ellipse(x, y - (sliding ? 4 : 9) * u, 6.5 * u, (sliding ? 6 : 11) * u, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
}

/* ------------------------------------------------------------------- HUD */
function hud(ctx: CanvasRenderingContext2D, s: State) {
  let y = 10;
  const bar = (label: string, frac: number, color: string) => {
    fillRound(ctx, 8, y, 92, 14, 7, 'rgba(0,0,0,0.45)');
    fillRound(ctx, 10, y + 2, 88 * frac, 10, 5, color);
    text(ctx, label, 54, y + 7.5, { size: 8, weight: 800 });
    y += 18;
  };
  if (s.magnetT > 0) bar('MAGNET', s.magnetT / 10, '#e04a3a');
  if (s.doubleT > 0) bar('2× SCORE', s.doubleT / 12, '#9b5de5');
  if (s.shield) bar('SHIELD', 1, '#3fa3f0');
  fillRound(ctx, W - 86, 10, 78, 18, 9, 'rgba(0,0,0,0.45)');
  text(ctx, `${Math.floor(s.z)} m`, W - 47, 19.5, { size: 11, weight: 900 });
  if (s.z < 30 && !s.crashed) {
    fillRound(ctx, 25, 210, W - 50, 44, 12, 'rgba(0,0,0,0.45)');
    text(ctx, 'Swipe or ← → to change lanes', W / 2, 224, { size: 10, weight: 800 });
    text(ctx, '↑ / swipe up jump · ↓ / swipe down slide', W / 2, 241, { size: 9, color: 'rgba(255,255,255,0.85)', weight: 700 });
  }
  if (s.crashed) {
    const what = s.crashWhat === 'train' ? 'Ran into a train!' : s.crashWhat === 'bar' ? 'Hit the bar — slide under next time!' : 'Tripped over a hurdle!';
    fillRound(ctx, 20, 200, W - 40, 30, 10, 'rgba(0,0,0,0.6)');
    text(ctx, what, W / 2, 215, { size: 11, weight: 800 });
  }
}

export function render(ctx: CanvasRenderingContext2D, s: State) {
  const cam: Cam = { x: s.x * 0.55, z: s.z - CAM_BACK };
  sky(ctx, s);
  ground(ctx, cam);
  // Far to near; things already behind the runner are drawn over it.
  const visible = s.items.filter((it) => !it.taken && it.z < s.z + FAR && it.z + it.len > cam.z + 0.5);
  const ahead = visible.filter((it) => it.z + it.len >= s.z - 0.2).sort((a, b) => b.z - a.z);
  const behind = visible.filter((it) => it.z + it.len < s.z - 0.2).sort((a, b) => b.z - a.z);
  for (const it of ahead) drawItem(ctx, cam, it, s.time);
  runner(ctx, cam, s);
  for (const it of behind) drawItem(ctx, cam, it, s.time);
  for (const p of s.pops) {
    const q = proj(cam, p.x, p.y + p.t * 1.5, p.z);
    if (!q) continue;
    ctx.globalAlpha = Math.min(1, (0.9 - p.t) * 3);
    text(ctx, p.text, q[0], q[1], { size: 12, color: '#ffe27a', weight: 900 });
    ctx.globalAlpha = 1;
  }
  hud(ctx, s);
}
