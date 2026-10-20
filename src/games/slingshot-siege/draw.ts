import { circle, fillRound, roundRect, text } from '../_shared/arcade/draw';
import { GROUND_PX, GUIDE_T, H, PULL_PX, W, isSpecial, predict, speedFor, toScreenX, toScreenY } from './game';
import type { State } from './game';
import { SLING_X, SLING_Y, WORLDS } from './levels';
import type { Ammo, Mat } from './levels';
import { AMMO, ENEMY_HP } from './physics';
import type { Thing } from './physics';

/** Slingshot Siege drawing: everything is original vector art made on the canvas. */
interface Theme {
  skyTop: string;
  skyBottom: string;
  far: string;
  near: string;
  ground: string;
  groundTop: string;
  soil: string;
  rock: string;
  rockTop: string;
}

const THEMES: Theme[] = [
  {
    skyTop: '#6fbdf0',
    skyBottom: '#dff3ff',
    far: '#a9d99a',
    near: '#86c674',
    ground: '#8a5a35',
    groundTop: '#68b04b',
    soil: '#6e4426',
    rock: '#8d8f7c',
    rockTop: '#68b04b',
  },
  {
    skyTop: '#f39a5b',
    skyBottom: '#ffe4b3',
    far: '#e5a76a',
    near: '#dca15a',
    ground: '#d39a52',
    groundTop: '#ecc27c',
    soil: '#b97c3d',
    rock: '#c47b45',
    rockTop: '#ecc27c',
  },
  {
    skyTop: '#1d3a66',
    skyBottom: '#9ccbea',
    far: '#c7dbef',
    near: '#e4eef8',
    ground: '#b8cde1',
    groundTop: '#f5f9fd',
    soil: '#93adc7',
    rock: '#8ea9c4',
    rockTop: '#f5f9fd',
  },
];

const AMMO_COLORS: Record<Ammo, [string, string]> = {
  pebble: ['#a3a198', '#77756d'],
  triple: ['#6f93bd', '#4b6c94'],
  boulder: ['#94704d', '#6b4e33'],
  zoomer: ['#f2c23a', '#c99517'],
  kaboom: ['#3d424e', '#24272f'],
};

/* ------------------------------------------------------------ background */
function hills(ctx: CanvasRenderingContext2D, base: number, amp: number, len: number, phase: number, color: string) {
  ctx.beginPath();
  ctx.moveTo(0, H);
  for (let x = 0; x <= W; x += 8) ctx.lineTo(x, base - amp * (0.6 + 0.4 * Math.sin(x / len + phase)) - amp * 0.3 * Math.sin(x / (len * 0.37) + phase * 2));
  ctx.lineTo(W, H);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

function cloud(ctx: CanvasRenderingContext2D, x: number, y: number, k: number, color: string) {
  circle(ctx, x, y, 9 * k, color);
  circle(ctx, x + 10 * k, y - 4 * k, 11 * k, color);
  circle(ctx, x + 22 * k, y, 8 * k, color);
  fillRound(ctx, x - 6 * k, y, 34 * k, 8 * k, 4 * k, color);
}

function background(ctx: CanvasRenderingContext2D, s: State, th: Theme, world: number) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, th.skyTop);
  g.addColorStop(1, th.skyBottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  const gy = toScreenY(s, 0);
  if (world === 0) {
    circle(ctx, 410, 46, 20, 'rgba(255,248,214,0.9)');
    for (let i = 0; i < 4; i++) {
      const x = ((i * 137 + s.time * (4 + i)) % (W + 80)) - 60;
      cloud(ctx, x, 30 + ((i * 53) % 60), 0.8 + (i % 2) * 0.3, 'rgba(255,255,255,0.85)');
    }
    hills(ctx, gy - 10, 46, 70, 1, th.far);
    hills(ctx, gy, 26, 45, 3, th.near);
  } else if (world === 1) {
    circle(ctx, 380, 70, 34, 'rgba(255,241,201,0.95)');
    circle(ctx, 380, 70, 46, 'rgba(255,241,201,0.25)');
    // Flat-topped mesas on the horizon.
    ctx.fillStyle = '#d58a52';
    for (const [x, w, h] of [
      [40, 90, 60],
      [210, 60, 42],
      [330, 120, 52],
    ]) {
      ctx.beginPath();
      ctx.moveTo(x, gy);
      ctx.lineTo(x + 12, gy - h);
      ctx.lineTo(x + w - 12, gy - h);
      ctx.lineTo(x + w, gy);
      ctx.closePath();
      ctx.fill();
    }
    hills(ctx, gy, 22, 60, 2, th.far);
    hills(ctx, gy + 4, 12, 40, 5, th.near);
  } else {
    // Night sky with a soft aurora.
    for (let i = 0; i < 40; i++) {
      const x = (i * 97.3) % W;
      const y = (i * 41.9) % 120;
      ctx.globalAlpha = 0.4 + 0.4 * Math.sin(s.time * 2 + i);
      ctx.fillStyle = '#fff';
      ctx.fillRect(x, y, 1.4, 1.4);
    }
    ctx.globalAlpha = 1;
    for (let k = 0; k < 2; k++) {
      ctx.beginPath();
      for (let x = 0; x <= W; x += 10) {
        const y = 40 + k * 18 + 14 * Math.sin(x / 60 + s.time * 0.4 + k * 2);
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = k ? 'rgba(120,230,200,0.25)' : 'rgba(140,255,190,0.3)';
      ctx.lineWidth = 14;
      ctx.stroke();
    }
    // Snowy peaks.
    ctx.fillStyle = th.far;
    ctx.beginPath();
    ctx.moveTo(0, gy);
    const peaks = [
      [0, 120],
      [70, 60],
      [140, 130],
      [220, 50],
      [300, 120],
      [380, 70],
      [480, 140],
    ];
    for (const [x, y] of peaks) ctx.lineTo(x, y + (gy - 170));
    ctx.lineTo(W, gy);
    ctx.closePath();
    ctx.fill();
    hills(ctx, gy, 16, 50, 4, th.near);
  }
}

function ground(ctx: CanvasRenderingContext2D, s: State, th: Theme, world: number) {
  const gy = toScreenY(s, 0);
  ctx.fillStyle = th.ground;
  ctx.fillRect(0, gy, W, H - gy);
  ctx.fillStyle = th.soil;
  for (let i = 0; i < 24; i++) ctx.fillRect((i * 53.7) % W, gy + 8 + ((i * 7) % (GROUND_PX - 10)), 3, 2);
  ctx.fillStyle = th.groundTop;
  ctx.fillRect(0, gy - 1, W, 5);
  if (world === 0) {
    ctx.fillStyle = '#4f9a3a';
    for (let x = 4; x < W; x += 13) {
      ctx.beginPath();
      ctx.moveTo(x, gy);
      ctx.lineTo(x + 2, gy - 4 - (x % 3));
      ctx.lineTo(x + 4, gy);
      ctx.fill();
    }
  } else if (world === 2) {
    ctx.fillStyle = '#ffffff';
    for (let x = 6; x < W; x += 29) ctx.fillRect(x, gy + 1, 2, 2);
  }
}

/* -------------------------------------------------------------- the fort */
function crack(ctx: CanvasRenderingContext2D, w: number, h: number, seed: number, n: number) {
  ctx.strokeStyle = 'rgba(30,20,10,0.55)';
  ctx.lineWidth = 0.8;
  for (let k = 0; k < n; k++) {
    let x = -w / 2 + ((seed * (k + 3) * 37) % 100) / 100 * w;
    let y = -h / 2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    for (let j = 1; j <= 4; j++) {
      x += (((seed + j * 13 + k * 7) % 9) - 4) * w * 0.05;
      y = -h / 2 + (h * j) / 4;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
}

function drawBlock(ctx: CanvasRenderingContext2D, s: State, t: Thing) {
  const p = t.body.getPosition();
  const z = s.zoom;
  const w = t.w * z;
  const h = t.h * z;
  ctx.save();
  ctx.translate(toScreenX(s, p.x), toScreenY(s, p.y));
  ctx.rotate(-t.body.getAngle());
  const mat: Mat = t.mat;
  if (mat === 'wood') {
    fillRound(ctx, -w / 2, -h / 2, w, h, 1.5, '#c98b4a');
    ctx.strokeStyle = '#a86d34';
    ctx.lineWidth = 0.8;
    const along = w > h;
    for (let k = 1; k < 3; k++) {
      ctx.beginPath();
      if (along) {
        ctx.moveTo(-w / 2 + 2, -h / 2 + (h * k) / 3);
        ctx.lineTo(w / 2 - 2, -h / 2 + (h * k) / 3);
      } else {
        ctx.moveTo(-w / 2 + (w * k) / 3, -h / 2 + 2);
        ctx.lineTo(-w / 2 + (w * k) / 3, h / 2 - 2);
      }
      ctx.stroke();
    }
    ctx.strokeStyle = '#7a4a20';
  } else if (mat === 'stone') {
    fillRound(ctx, -w / 2, -h / 2, w, h, 1.5, '#9aa1aa');
    ctx.fillStyle = '#b9bec5';
    ctx.fillRect(-w / 2 + 1, -h / 2 + 1, w - 2, 1.5);
    ctx.strokeStyle = '#7d838c';
    ctx.lineWidth = 0.8;
    const long = Math.max(t.w, t.h);
    const seg = Math.max(1, Math.round(long / 1.1));
    for (let k = 1; k < seg; k++) {
      ctx.beginPath();
      if (w > h) {
        ctx.moveTo(-w / 2 + (w * k) / seg, -h / 2);
        ctx.lineTo(-w / 2 + (w * k) / seg, h / 2);
      } else {
        ctx.moveTo(-w / 2, -h / 2 + (h * k) / seg);
        ctx.lineTo(w / 2, -h / 2 + (h * k) / seg);
      }
      ctx.stroke();
    }
    ctx.strokeStyle = '#5f656e';
  } else if (mat === 'ice') {
    fillRound(ctx, -w / 2, -h / 2, w, h, 1.5, 'rgba(184,230,255,0.86)');
    ctx.strokeStyle = 'rgba(255,255,255,0.75)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-w / 2 + w * 0.2, h / 2 - h * 0.15);
    ctx.lineTo(-w / 2 + w * 0.45, -h / 2 + h * 0.15);
    ctx.stroke();
    ctx.strokeStyle = '#6fb9e3';
  } else {
    fillRound(ctx, -w / 2, -h / 2, w, h, 1.5, '#d8432f');
    ctx.fillStyle = '#a92d1f';
    ctx.fillRect(-w / 2, -h / 2 + h * 0.18, w, h * 0.1);
    ctx.fillRect(-w / 2, h / 2 - h * 0.28, w, h * 0.1);
    fillRound(ctx, -w * 0.36, -h * 0.17, w * 0.72, h * 0.34, 1, '#f5c542');
    text(ctx, 'TNT', 0, 0.5, { size: Math.max(5, h * 0.26), color: '#8a1f12', weight: 900 });
    ctx.strokeStyle = '#6e1a10';
  }
  ctx.lineWidth = 1;
  roundRect(ctx, -w / 2, -h / 2, w, h, 1.5);
  ctx.stroke();
  const frac = t.hp / t.maxHp;
  if (frac < 0.7 && mat !== 'tnt') crack(ctx, w, h, t.id * 7 + 3, frac < 0.35 ? 3 : 1);
  if (t.hurt > 0) {
    ctx.globalAlpha = Math.min(0.5, t.hurt * 2);
    fillRound(ctx, -w / 2, -h / 2, w, h, 1.5, '#ffffff');
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

function drawRock(ctx: CanvasRenderingContext2D, s: State, t: Thing, th: Theme) {
  const p = t.body.getPosition();
  const x = toScreenX(s, p.x - t.w / 2);
  const y = toScreenY(s, p.y + t.h / 2);
  const w = t.w * s.zoom;
  const h = t.h * s.zoom;
  fillRound(ctx, x, y, w, h + 2, 3, th.rock);
  ctx.fillStyle = 'rgba(0,0,0,0.12)';
  for (let k = 1; k < 3; k++) ctx.fillRect(x + 2, y + (h * k) / 3, w - 4, 1.5);
  fillRound(ctx, x - 1, y - 1, w + 2, 5, 2, th.rockTop);
}

/* --------------------------------------------------------------- critters */
function drawEnemy(ctx: CanvasRenderingContext2D, s: State, t: Thing) {
  const p = t.body.getPosition();
  const r = t.r * s.zoom;
  const hurtFrac = t.hp / ENEMY_HP[t.size];
  ctx.save();
  ctx.translate(toScreenX(s, p.x), toScreenY(s, p.y));
  ctx.rotate(-t.body.getAngle());
  // Horns.
  ctx.fillStyle = '#f3e3b3';
  for (const k of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(k * r * 0.35, -r * 0.8);
    ctx.lineTo(k * r * 0.62, -r * 1.25);
    ctx.lineTo(k * r * 0.72, -r * 0.6);
    ctx.closePath();
    ctx.fill();
  }
  circle(ctx, 0, 0, r, '#7d4fc4');
  circle(ctx, -r * 0.12, -r * 0.12, r * 0.86, '#9466d8');
  circle(ctx, 0, r * 0.35, r * 0.45, '#b48ef0');
  // One big eye that blinks now and then.
  const blink = (s.time + t.id * 0.73) % 3.4 < 0.12;
  const ey = -r * 0.18;
  if (blink || hurtFrac < 0.5) {
    ctx.strokeStyle = '#2c1a47';
    ctx.lineWidth = Math.max(1, r * 0.12);
    ctx.beginPath();
    ctx.moveTo(-r * 0.32, ey);
    ctx.lineTo(r * 0.32, ey);
    ctx.stroke();
  } else {
    circle(ctx, 0, ey, r * 0.36, '#ffffff');
    circle(ctx, r * 0.08, ey, r * 0.17, '#2c1a47');
    circle(ctx, r * 0.13, ey - r * 0.06, r * 0.05, '#ffffff');
  }
  // Grumpy brow and frown.
  ctx.strokeStyle = '#2c1a47';
  ctx.lineWidth = Math.max(1, r * 0.1);
  ctx.beginPath();
  ctx.moveTo(-r * 0.42, ey - r * 0.5);
  ctx.lineTo(r * 0.42, ey - r * 0.32);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, r * 0.62, r * 0.26, Math.PI * 1.15, Math.PI * 1.85);
  ctx.stroke();
  if (t.size === 1) {
    // A dented pot for a helmet.
    ctx.fillStyle = '#9aa3ad';
    ctx.beginPath();
    ctx.arc(0, -r * 0.55, r * 0.62, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = '#7b848e';
    ctx.fillRect(-r * 0.7, -r * 0.6, r * 1.4, r * 0.14);
  } else if (t.size === 2) {
    ctx.fillStyle = '#f2c035';
    ctx.beginPath();
    ctx.moveTo(-r * 0.55, -r * 0.72);
    ctx.lineTo(-r * 0.55, -r * 1.15);
    ctx.lineTo(-r * 0.28, -r * 0.92);
    ctx.lineTo(0, -r * 1.22);
    ctx.lineTo(r * 0.28, -r * 0.92);
    ctx.lineTo(r * 0.55, -r * 1.15);
    ctx.lineTo(r * 0.55, -r * 0.72);
    ctx.closePath();
    ctx.fill();
    circle(ctx, 0, -r * 0.86, r * 0.07, '#e2453a');
  }
  if (hurtFrac < 0.75) circle(ctx, -r * 0.5, r * 0.15, r * 0.16, 'rgba(70,30,110,0.45)');
  if (t.hurt > 0) circle(ctx, 0, 0, r, `rgba(255,255,255,${Math.min(0.5, t.hurt * 2)})`);
  ctx.restore();
}

/** A stone critter: a round rock with a determined face. */
export function drawStone(ctx: CanvasRenderingContext2D, ammo: Ammo, x: number, y: number, r: number, angle = 0, lit = false, time = 0) {
  const [fill, dark] = AMMO_COLORS[ammo];
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  if (ammo === 'zoomer') {
    ctx.fillStyle = '#e48a1e';
    ctx.beginPath();
    ctx.moveTo(r * 0.7, -r * 0.45);
    ctx.lineTo(r * 1.45, 0);
    ctx.lineTo(r * 0.7, r * 0.45);
    ctx.closePath();
    ctx.fill();
  }
  circle(ctx, 0, 0, r, dark);
  circle(ctx, -r * 0.1, -r * 0.1, r * 0.88, fill);
  ctx.fillStyle = dark;
  ctx.globalAlpha = 0.5;
  circle(ctx, -r * 0.45, r * 0.35, r * 0.12, dark);
  circle(ctx, r * 0.1, r * 0.55, r * 0.09, dark);
  ctx.globalAlpha = 1;
  if (ammo === 'kaboom') {
    ctx.strokeStyle = '#c9a36b';
    ctx.lineWidth = Math.max(1, r * 0.14);
    ctx.beginPath();
    ctx.moveTo(0, -r);
    ctx.quadraticCurveTo(r * 0.3, -r * 1.4, r * 0.55, -r * 1.3);
    ctx.stroke();
    const on = !lit || Math.sin(time * 30) > 0;
    if (on) circle(ctx, r * 0.6, -r * 1.32, r * 0.2, lit ? '#ff5a2a' : '#ffcf4a');
    if (lit) circle(ctx, 0, 0, r * 1.15, 'rgba(255,80,40,0.25)');
  }
  // Eyes looking ahead, with a stern brow.
  for (const k of [-1, 1]) {
    circle(ctx, r * 0.18 + k * r * 0.26, -r * 0.18, r * 0.2, '#ffffff');
    circle(ctx, r * 0.25 + k * r * 0.26, -r * 0.16, r * 0.1, '#1b1b1f');
  }
  ctx.strokeStyle = '#1b1b1f';
  ctx.lineWidth = Math.max(1, r * 0.11);
  ctx.beginPath();
  ctx.moveTo(-r * 0.2, -r * 0.5);
  ctx.lineTo(r * 0.3, -r * 0.38);
  ctx.moveTo(r * 0.36, -r * 0.38);
  ctx.lineTo(r * 0.75, -r * 0.5);
  ctx.stroke();
  ctx.restore();
}

/* -------------------------------------------------------------- the sling */
function slingArm(ctx: CanvasRenderingContext2D, s: State, tipX: number) {
  const bx = toScreenX(s, SLING_X);
  const fy = toScreenY(s, 1.7);
  const tx = toScreenX(s, tipX);
  const ty = toScreenY(s, SLING_Y + 0.35);
  ctx.strokeStyle = '#6b4220';
  ctx.lineWidth = Math.max(3, s.zoom * 0.28);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(bx, fy);
  ctx.quadraticCurveTo(tx, fy - 2, tx, ty);
  ctx.stroke();
  ctx.lineCap = 'butt';
}

function band(ctx: CanvasRenderingContext2D, s: State, tipX: number, px: number, py: number) {
  ctx.strokeStyle = '#3b2414';
  ctx.lineWidth = Math.max(2, s.zoom * 0.14);
  ctx.beginPath();
  ctx.moveTo(toScreenX(s, tipX), toScreenY(s, SLING_Y + 0.3));
  ctx.lineTo(px, py);
  ctx.stroke();
}

function sling(ctx: CanvasRenderingContext2D, s: State, front: boolean, stone: [number, number] | null) {
  const bx = toScreenX(s, SLING_X);
  if (!front) {
    ctx.strokeStyle = '#7a4c25';
    ctx.lineWidth = Math.max(4, s.zoom * 0.36);
    ctx.beginPath();
    ctx.moveTo(bx, toScreenY(s, 0));
    ctx.lineTo(bx, toScreenY(s, 1.75));
    ctx.stroke();
    slingArm(ctx, s, SLING_X + 0.42);
    if (stone) band(ctx, s, SLING_X + 0.42, stone[0], stone[1]);
  } else {
    slingArm(ctx, s, SLING_X - 0.38);
    if (stone) band(ctx, s, SLING_X - 0.38, stone[0], stone[1]);
    else {
      ctx.strokeStyle = '#3b2414';
      ctx.lineWidth = Math.max(2, s.zoom * 0.14);
      ctx.beginPath();
      ctx.moveTo(toScreenX(s, SLING_X - 0.38), toScreenY(s, SLING_Y + 0.3));
      ctx.lineTo(toScreenX(s, SLING_X), toScreenY(s, SLING_Y - 0.1));
      ctx.lineTo(toScreenX(s, SLING_X + 0.42), toScreenY(s, SLING_Y + 0.3));
      ctx.stroke();
    }
  }
}

/** The stone waiting in the pouch, pulled back along the aim. */
function pouchStone(s: State): [number, number] {
  const pull = s.drag.on || s.keyAim ? 1.5 * s.aim.power : 0;
  return [toScreenX(s, SLING_X - Math.cos(s.aim.angle) * pull), toScreenY(s, SLING_Y - Math.sin(s.aim.angle) * pull)];
}

function guide(ctx: CanvasRenderingContext2D, s: State) {
  const speed = speedFor(s.aim.power);
  const steps = Math.round(GUIDE_T[s.difficulty] * 60);
  for (let n = 5; n <= steps; n += 5) {
    const [x, y] = predict(s.aim.angle, speed, n);
    if (y < 0) break;
    circle(ctx, toScreenX(s, x), toScreenY(s, y), Math.max(1.2, 2.6 - n / 40), `rgba(255,255,255,${0.9 - n / (steps * 1.4)})`);
  }
}

function trail(ctx: CanvasRenderingContext2D, s: State, pts: number[], alpha: number) {
  ctx.fillStyle = `rgba(255,255,255,${alpha})`;
  for (let i = 0; i < pts.length; i += 4) ctx.fillRect(toScreenX(s, pts[i]) - 1, toScreenY(s, pts[i + 1]) - 1, 2, 2);
}

/* ------------------------------------------------------------- overlays */
function ammoStrip(ctx: CanvasRenderingContext2D, s: State) {
  const waiting = s.phase === 'aim' ? s.queue.slice(1) : s.queue;
  if (!waiting.length) return;
  const n = waiting.length;
  fillRound(ctx, 6, 6, 14 + n * 15, 20, 10, 'rgba(0,0,0,0.28)');
  waiting.forEach((a, i) => drawStone(ctx, a, 16 + i * 15, 16, 5.5));
}

function banner(ctx: CanvasRenderingContext2D, s: State) {
  const loaded = s.phase === 'aim' ? s.queue[0] : undefined;
  if (s.phase === 'aim' && s.shotsUsed === 0 && s.phaseT < 3) {
    const a = Math.min(1, (3 - s.phaseT) * 1.5);
    ctx.globalAlpha = a;
    fillRound(ctx, W / 2 - 110, 8, 220, 26, 13, 'rgba(0,0,0,0.35)');
    text(ctx, `Level ${s.level + 1} · ${s.def.name}`, W / 2, 21, { size: 13 });
    text(ctx, WORLDS[s.def.world], W / 2, 42, { size: 9, color: 'rgba(255,255,255,0.9)', weight: 600 });
    ctx.globalAlpha = 1;
  } else if (loaded && isSpecial(loaded)) {
    const info = AMMO[loaded];
    fillRound(ctx, W / 2 - 130, 8, 260, 20, 10, 'rgba(0,0,0,0.3)');
    text(ctx, `${info.name}: ${info.tip}`, W / 2, 18, { size: 9, weight: 600 });
  }
  if (s.phase === 'fly' && s.ability === 'ready') {
    const lead = s.shots[0];
    const verb = lead?.ammo === 'triple' ? 'split' : lead?.ammo === 'zoomer' ? 'dash' : 'explode';
    const pulse = 0.75 + 0.25 * Math.sin(s.time * 10);
    ctx.globalAlpha = pulse;
    fillRound(ctx, W / 2 - 60, 8, 120, 20, 10, 'rgba(0,0,0,0.35)');
    text(ctx, `Tap to ${verb}!`, W / 2, 18, { size: 11 });
    ctx.globalAlpha = 1;
  }
  if (s.phase === 'clear' || s.phase === 'bonus') {
    fillRound(ctx, W / 2 - 100, 40, 200, 34, 17, 'rgba(0,0,0,0.35)');
    text(ctx, 'Fort smashed!', W / 2, 57, { size: 18, color: '#ffe27a' });
  } else if (s.phase === 'lost') {
    fillRound(ctx, W / 2 - 100, 40, 200, 34, 17, 'rgba(0,0,0,0.35)');
    text(ctx, 'Out of stones…', W / 2, 57, { size: 16 });
  }
}

function aimReadout(ctx: CanvasRenderingContext2D, s: State) {
  if (s.phase !== 'aim' || !(s.drag.on || s.keyAim)) return;
  const deg = Math.round((s.aim.angle * 180) / Math.PI);
  const pct = Math.round(s.aim.power * 100);
  const x = toScreenX(s, SLING_X) + 4;
  const y = toScreenY(s, SLING_Y + 1.6);
  fillRound(ctx, x - 26, y - 8, 52, 16, 8, 'rgba(0,0,0,0.35)');
  text(ctx, `${deg}° · ${pct}%`, x, y, { size: 9 });
  if (s.drag.on) {
    const dx = s.drag.x - s.drag.x0;
    const dy = s.drag.y - s.drag.y0;
    const len = Math.hypot(dx, dy);
    const k = len > PULL_PX ? PULL_PX / len : 1;
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(s.drag.x0, s.drag.y0);
    ctx.lineTo(s.drag.x0 + dx * k, s.drag.y0 + dy * k);
    ctx.stroke();
    ctx.setLineDash([]);
    circle(ctx, s.drag.x0, s.drag.y0, 3.5, 'rgba(255,255,255,0.7)');
  }
}

export function render(ctx: CanvasRenderingContext2D, s: State) {
  const world = s.def.world;
  const th = THEMES[world];
  ctx.save();
  if (s.shake > 0) ctx.translate(Math.sin(s.time * 90) * s.shake, Math.cos(s.time * 77) * s.shake * 0.6);
  background(ctx, s, th, world);
  ground(ctx, s, th, world);
  for (const t of s.phys.things) if (t.kind === 'rock' && t.w < 100) drawRock(ctx, s, t, th);
  trail(ctx, s, s.lastTrail, 0.3);
  trail(ctx, s, s.trail, 0.75);

  const stone = s.phase === 'aim' && s.queue.length ? pouchStone(s) : null;
  sling(ctx, s, false, stone);
  if (stone) drawStone(ctx, s.queue[0], stone[0], stone[1], AMMO[s.queue[0]].r * s.zoom, -s.aim.angle * 0.3);
  sling(ctx, s, true, stone);

  for (const t of s.phys.things) if (t.kind === 'block') drawBlock(ctx, s, t);
  for (const t of s.phys.things) if (t.kind === 'enemy') drawEnemy(ctx, s, t);
  for (const t of s.phys.things) {
    if (t.kind !== 'shot') continue;
    const p = t.body.getPosition();
    const x = toScreenX(s, p.x);
    const y = toScreenY(s, p.y);
    if (s.dashT > 0 && t.ammo === 'zoomer') {
      const v = t.body.getLinearVelocity();
      const sp = Math.hypot(v.x, v.y) || 1;
      ctx.strokeStyle = `rgba(255,230,140,${s.dashT})`;
      ctx.lineWidth = 2;
      for (const k of [-1, 0, 1]) {
        ctx.beginPath();
        ctx.moveTo(x - (v.x / sp) * 8 + k * (v.y / sp) * 4, y + (v.y / sp) * 8 + k * (v.x / sp) * 4);
        ctx.lineTo(x - (v.x / sp) * 26 + k * (v.y / sp) * 4, y + (v.y / sp) * 26 + k * (v.x / sp) * 4);
        ctx.stroke();
      }
    }
    const v = t.body.getLinearVelocity();
    const facing = t.ammo === 'zoomer' ? -Math.atan2(v.y, v.x) : -t.body.getAngle();
    drawStone(ctx, t.ammo, x, y, t.r * s.zoom, facing, t.ammo === 'kaboom' && s.fuse >= 0, s.time);
    if (y < -4) {
      // Off the top of the screen: point to it.
      ctx.fillStyle = AMMO_COLORS[t.ammo][0];
      ctx.beginPath();
      ctx.moveTo(x, 3);
      ctx.lineTo(x - 5, 11);
      ctx.lineTo(x + 5, 11);
      ctx.closePath();
      ctx.fill();
    }
  }
  if (stone && (s.drag.on || s.keyAim)) guide(ctx, s);

  for (const d of s.debris) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, d.life * 2);
    ctx.translate(toScreenX(s, d.x), toScreenY(s, d.y));
    ctx.rotate(d.a);
    const k = d.size * s.zoom;
    ctx.fillStyle = d.color;
    ctx.fillRect(-k / 2, -k / 2, k, k * 0.7);
    ctx.restore();
  }
  for (const b of s.booms) {
    const f = b.t / 0.6;
    const r = b.r * s.zoom * (0.35 + f * 0.75);
    const x = toScreenX(s, b.x);
    const y = toScreenY(s, b.y);
    circle(ctx, x, y, r, `rgba(255,190,70,${0.55 * (1 - f)})`);
    circle(ctx, x, y, r * 0.55, `rgba(255,250,220,${0.8 * (1 - f)})`);
  }
  for (const p of s.pops) {
    ctx.globalAlpha = Math.min(1, (1.1 - p.t) * 2.5);
    text(ctx, p.text, toScreenX(s, p.x), toScreenY(s, p.y + p.t * 1.2), {
      size: p.big ? 12 : 9,
      color: p.big ? '#ffe27a' : '#ffffff',
      weight: 800,
    });
  }
  ctx.globalAlpha = 1;
  ctx.restore();
  ammoStrip(ctx, s);
  banner(ctx, s);
  aimReadout(ctx, s);
}
