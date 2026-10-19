import { circle, drawSparks, fillRound, text } from '../_shared/arcade/draw';
import { AH, AT, AW } from '../_shared/platform/arena';
import { ONEWAY, SOLID } from '../_shared/platform/tiles';
import { BOSSES, LANDS, PER_LAND } from './stages';
import type { Boss, Enemy, Pickup, State } from './game';

const SKY = [
  ['#0c1e3d', '#1e3a8a'],
  ['#2e1065', '#6d28d9'],
  ['#431407', '#c2410c'],
];

const ENEMY_COLOR = { imp: '#f97316', hopper: '#22c55e', flamer: '#a855f7', wisp: '#38bdf8' } as const;

function background(ctx: CanvasRenderingContext2D, s: State) {
  const [a, b] = SKY[s.plan.land];
  const g = ctx.createLinearGradient(0, 0, 0, AH);
  g.addColorStop(0, a);
  g.addColorStop(1, b);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, AW, AH);
  if (s.plan.land === 1) {
    // Aurora ribbons.
    for (let k = 0; k < 3; k++) {
      ctx.strokeStyle = `rgba(${k === 1 ? '74,222,128' : '45,212,191'},0.18)`;
      ctx.lineWidth = 10;
      ctx.beginPath();
      for (let x = 0; x <= AW; x += 8) ctx.lineTo(x, 30 + k * 18 + Math.sin(x / 30 + s.time * 0.6 + k) * 8);
      ctx.stroke();
    }
  }
  // Distant snowy peaks.
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.beginPath();
  ctx.moveTo(0, AH);
  for (let x = 0; x <= AW; x += 32) ctx.lineTo(x, 150 - ((x / 32) % 2) * 40 - ((x * 7) % 23));
  ctx.lineTo(AW, AH);
  ctx.fill();
  for (const f of s.flakes) {
    ctx.fillStyle = s.plan.land === 2 ? 'rgba(254,215,170,0.6)' : 'rgba(255,255,255,0.7)';
    ctx.fillRect(f.x, f.y, f.s * 1.6, f.s * 1.6);
  }
}

function tiles(ctx: CanvasRenderingContext2D, s: State) {
  const g = s.grid;
  const land = s.plan.land;
  for (let r = 0; r < g.rows; r++) {
    for (let c = 0; c < g.cols; c++) {
      const v = g.cells[r * g.cols + c];
      const x = c * AT;
      const y = r * AT;
      if (v === SOLID) {
        ctx.fillStyle = land === 2 ? '#57534e' : '#475569';
        ctx.fillRect(x, y, AT, AT);
        ctx.fillStyle = 'rgba(255,255,255,0.12)';
        ctx.fillRect(x, y, AT, 1);
        ctx.fillRect(x, y + 8, AT, 1);
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.fillRect(x + ((r % 2) * 8), y + 1, 1, 7);
        ctx.fillRect(x + 4 + ((r % 2) * 8), y + 9, 1, 7);
        const above = r > 0 ? g.cells[(r - 1) * g.cols + c] : 0;
        if (above === 0 && c > 0 && c < g.cols - 1) fillRound(ctx, x - 1, y - 2, AT + 2, 5, 2, '#f8fafc');
      } else if (v === ONEWAY) {
        ctx.fillStyle = land === 2 ? '#7dd3fc' : '#93c5fd';
        ctx.fillRect(x, y + 3, AT, 7);
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.fillRect(x + 2, y + 5, 5, 1);
        fillRound(ctx, x - 1, y, AT + 2, 5, 2, '#f8fafc');
        ctx.fillStyle = '#e0f2fe';
        if ((c * 3 + r) % 4 === 0) ctx.fillRect(x + 6, y + 10, 2, 3);
      }
    }
  }
}

/** Yuki: a fluffy white yeti kid in a red bobble hat. */
function drawYuki(ctx: CanvasRenderingContext2D, s: State) {
  const p = s.p;
  if (p.invuln > 0 && !p.dead && Math.floor(s.time * 16) % 2 === 0) return;
  const cx = p.x + p.w / 2;
  const by = p.y + p.h;
  const step = p.ground ? Math.sin(p.anim * 2) * 1.5 : 0;
  ctx.save();
  ctx.translate(cx, by);
  ctx.scale(p.facing, 1);
  if (p.dead) ctx.rotate(s.time * 10);
  if (s.giant > 0) circle(ctx, 0, -8, 12 + Math.sin(s.time * 12), 'rgba(250,204,21,0.35)');
  ctx.fillStyle = '#cbd5e1';
  ctx.fillRect(-5 + step, -3, 4, 3);
  ctx.fillRect(1 - step, -3, 4, 3);
  circle(ctx, 0, -8, 7.5, '#f8fafc');
  for (let k = -2; k <= 2; k++) circle(ctx, k * 3, -14 + Math.abs(k), 2.5, '#f8fafc');
  fillRound(ctx, -1, -12, 7, 6, 3, '#7dd3fc');
  circle(ctx, 2, -10, 1, '#0f172a');
  circle(ctx, 5, -10, 1, '#0f172a');
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(2, -7.5, 3, 1);
  ctx.fillStyle = '#ef4444';
  ctx.beginPath();
  ctx.ellipse(0, -15, 6, 3.5, 0, Math.PI, 0);
  ctx.fill();
  ctx.fillRect(-6, -15.5, 12, 2);
  circle(ctx, -2, -19, 2.2, '#fef2f2');
  // Arm reaching out when throwing.
  circle(ctx, 7 + (p.shootCd > 0.08 ? 2 : 0), -7, 2.5, '#f8fafc');
  ctx.restore();
}

function drawCreature(ctx: CanvasRenderingContext2D, e: Enemy, t: number) {
  const b = e.w.b;
  const x = b.x;
  const y = b.y;
  const color = ENEMY_COLOR[e.base];
  const dir = e.w.dir;
  if (e.base === 'wisp') {
    const flap = Math.sin(t * 16 + x) * 4;
    ctx.fillStyle = '#0ea5e9';
    ctx.beginPath();
    ctx.moveTo(x + 7, y + 6);
    ctx.lineTo(x - 3, y + 2 + flap);
    ctx.lineTo(x + 2, y + 10);
    ctx.moveTo(x + 7, y + 6);
    ctx.lineTo(x + 17, y + 2 + flap);
    ctx.lineTo(x + 12, y + 10);
    ctx.fill();
    circle(ctx, x + 7, y + 7, 6, color);
  } else {
    const h = e.base === 'hopper' ? 11 : 13;
    fillRound(ctx, x, y + 14 - h, 14, h, 5, color);
    if (e.base === 'imp') {
      ctx.fillStyle = '#15803d';
      ctx.fillRect(x + 6, y - 2, 2, 4);
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.fillRect(x + 4, y + 2, 1, 11);
      ctx.fillRect(x + 9, y + 2, 1, 11);
    } else if (e.base === 'flamer') {
      const f = Math.sin(t * 20 + x) * 1.5;
      circle(ctx, x + 7, y - 1 + f * 0.3, 3.5, '#fb923c');
      circle(ctx, x + 7, y, 1.8, '#fde047');
    } else {
      circle(ctx, x + 3, y + 3, 2.5, color);
      circle(ctx, x + 11, y + 3, 2.5, color);
    }
  }
  const ex = x + 7 + dir * 2.5;
  circle(ctx, ex - 2.5, y + 6, 2, '#fff');
  circle(ctx, ex + 2.5, y + 6, 2, '#fff');
  circle(ctx, ex - 2.5 + dir * 0.6, y + 6.3, 1, '#111');
  circle(ctx, ex + 2.5 + dir * 0.6, y + 6.3, 1, '#111');
  ctx.fillStyle = '#111';
  ctx.fillRect(ex - 2, y + 10, 4, 1);
}

function drawEnemy(ctx: CanvasRenderingContext2D, e: Enemy, t: number) {
  const b = e.w.b;
  const cx = b.x + b.w / 2;
  const cy = b.y + b.h / 2;
  if (e.state === 'dead') {
    ctx.globalAlpha = Math.max(0, e.timer / 0.6);
    circle(ctx, cx, cy, 8 + (0.6 - e.timer) * 20, 'rgba(224,242,254,0.6)');
    ctx.globalAlpha = 1;
    return;
  }
  if (e.state === 'arrive') {
    ctx.globalAlpha = 1 - e.timer / 0.9;
    drawCreature(ctx, e, t);
    ctx.globalAlpha = 1;
    return;
  }
  if (e.snow >= 4 || e.state === 'rolling') {
    // A full snowball (spinning when kicked).
    const r = 9;
    const by = b.y + b.h - r;
    circle(ctx, cx, by, r, '#f8fafc');
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, by, r - 3, e.spin, e.spin + 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, by, r - 5, e.spin + 3, e.spin + 4.5);
    ctx.stroke();
    if (e.state !== 'rolling') {
      // The trapped creature peeks out; it wriggles as the snow melts.
      const wob = e.melt < 1 ? Math.sin(t * 30) * 1 : 0;
      circle(ctx, cx - 2 + wob, by - 1, 1.3, '#111');
      circle(ctx, cx + 2 + wob, by - 1, 1.3, '#111');
      circle(ctx, cx + wob, by + 3, 1.5, ENEMY_COLOR[e.base]);
    }
    return;
  }
  drawCreature(ctx, e, t);
  if (e.snow > 0) {
    // Snow builds up from the feet.
    const h = (e.snow / 4) * (b.h + 4);
    ctx.save();
    ctx.beginPath();
    ctx.rect(b.x - 4, b.y + b.h - h, b.w + 8, h);
    ctx.clip();
    circle(ctx, cx, b.y + b.h - 8, 9.5, '#f1f5f9');
    ctx.restore();
  }
}

function drawPickup(ctx: CanvasRenderingContext2D, it: Pickup, t: number) {
  if (it.life < 2 && Math.floor(t * 10) % 2) return;
  const x = it.b.x + 6;
  const y = it.b.y + 6;
  if (it.kind === 'food') {
    switch (it.food) {
      case 0:
        fillRound(ctx, x - 5, y - 4, 10, 9, 2, '#fef3c7');
        fillRound(ctx, x - 4, y - 3, 8, 3, 1, '#78350f');
        break;
      case 1:
        circle(ctx, x, y, 5.5, '#d97706');
        circle(ctx, x - 2, y - 1, 1, '#451a03');
        circle(ctx, x + 2, y + 1, 1, '#451a03');
        break;
      case 2:
        fillRound(ctx, x - 6, y - 3, 12, 8, 2, '#fbcfe8');
        ctx.fillStyle = '#f9fafb';
        ctx.fillRect(x - 6, y - 4, 12, 2);
        circle(ctx, x, y - 6, 2, '#ef4444');
        break;
      case 3:
        ctx.fillStyle = '#d97706';
        ctx.beginPath();
        ctx.moveTo(x - 6, y + 4);
        ctx.lineTo(x + 6, y + 4);
        ctx.lineTo(x, y - 5);
        ctx.fill();
        ctx.fillStyle = '#7c2d12';
        ctx.fillRect(x - 3, y, 6, 1);
        break;
      default:
        ctx.fillStyle = '#e0e7ff';
        ctx.beginPath();
        ctx.moveTo(x - 4, y);
        ctx.lineTo(x + 4, y);
        ctx.lineTo(x, y + 6);
        ctx.fill();
        circle(ctx, x - 2, y - 2, 3, '#f9a8d4');
        circle(ctx, x + 2, y - 2, 3, '#fef3c7');
        circle(ctx, x, y - 5, 1.5, '#ef4444');
    }
    return;
  }
  const color = { red: '#ef4444', blue: '#3b82f6', yellow: '#facc15', green: '#22c55e' }[it.kind];
  fillRound(ctx, x - 2, y - 7, 4, 3, 1, '#e2e8f0');
  circle(ctx, x, y, 5, color);
  circle(ctx, x - 1.5, y - 1.5, 1.5, 'rgba(255,255,255,0.7)');
}

function drawBoss(ctx: CanvasRenderingContext2D, boss: Boss, t: number) {
  if (boss.invuln > 0 && Math.floor(t * 18) % 2 === 0) return;
  const { x, y, w, h } = boss.b;
  const cx = x + w / 2;
  ctx.save();
  if (boss.dead) {
    ctx.translate(cx, y + h / 2);
    ctx.rotate(t * 6);
    ctx.translate(-cx, -(y + h / 2));
  }
  if (boss.kind === 1) {
    // Gloomwing: a great night owl.
    const flap = Math.sin(t * 9) * 8;
    ctx.fillStyle = '#4c1d95';
    ctx.beginPath();
    ctx.moveTo(cx, y + 12);
    ctx.lineTo(x - 18, y + 4 + flap);
    ctx.lineTo(x + 6, y + h);
    ctx.moveTo(cx, y + 12);
    ctx.lineTo(x + w + 18, y + 4 + flap);
    ctx.lineTo(x + w - 6, y + h);
    ctx.fill();
    fillRound(ctx, x + 6, y, w - 12, h, 12, '#6d28d9');
    circle(ctx, cx - 7, y + 10, 6, '#fde047');
    circle(ctx, cx + 7, y + 10, 6, '#fde047');
    circle(ctx, cx - 7, y + 10, 2.5, '#111');
    circle(ctx, cx + 7, y + 10, 2.5, '#111');
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.moveTo(cx - 3, y + 15);
    ctx.lineTo(cx + 3, y + 15);
    ctx.lineTo(cx, y + 21);
    ctx.fill();
  } else {
    const body = boss.kind === 0 ? '#ea580c' : '#991b1b';
    fillRound(ctx, x, y + 4, w, h - 4, 14, body);
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    for (let k = 1; k < 4; k++) ctx.fillRect(x + (w / 4) * k, y + 6, 2, h - 10);
    if (boss.kind === 0) {
      ctx.fillStyle = '#15803d';
      ctx.fillRect(cx - 2, y - 4, 4, 9);
      fillRound(ctx, cx + 1, y - 4, 8, 4, 2, '#22c55e');
    } else {
      for (const side of [-1, 1]) {
        ctx.fillStyle = '#292524';
        ctx.beginPath();
        ctx.moveTo(cx + side * 10, y + 6);
        ctx.lineTo(cx + side * 18, y - 6);
        ctx.lineTo(cx + side * 16, y + 8);
        ctx.fill();
      }
      circle(ctx, cx, y + 30, 6 + Math.sin(t * 10), '#fb923c');
    }
    ctx.fillStyle = '#fde047';
    ctx.beginPath();
    ctx.moveTo(cx - 12, y + 12);
    ctx.lineTo(cx - 3, y + 17);
    ctx.lineTo(cx - 12, y + 19);
    ctx.moveTo(cx + 12, y + 12);
    ctx.lineTo(cx + 3, y + 17);
    ctx.lineTo(cx + 12, y + 19);
    ctx.fill();
    ctx.fillStyle = '#1c1917';
    ctx.beginPath();
    for (let k = 0; k < 6; k++) ctx.lineTo(cx - 12 + k * 5, y + 25 + (k % 2) * 4);
    for (let k = 5; k >= 0; k--) ctx.lineTo(cx - 12 + k * 5, y + 31);
    ctx.fill();
  }
  ctx.restore();
}

export function render(ctx: CanvasRenderingContext2D, s: State) {
  const t = s.time;
  background(ctx, s);
  tiles(ctx, s);
  for (const it of s.pickups) drawPickup(ctx, it, t);
  if (s.boss) drawBoss(ctx, s.boss, t);
  for (const e of s.enemies) drawEnemy(ctx, e, t);
  if (s.phase !== 'intro') drawYuki(ctx, s);
  for (const sh of s.shots) {
    circle(ctx, sh.x, sh.y, 3.5, '#f8fafc');
    circle(ctx, sh.x - 1, sh.y - 1, 1.2, '#bae6fd');
  }
  for (const f of s.fires) {
    circle(ctx, f.x, f.y, 4.5, 'rgba(239,68,68,0.5)');
    circle(ctx, f.x, f.y, 3, '#f97316');
    circle(ctx, f.x, f.y, 1.5, '#fef08a');
  }
  if (s.ghost) {
    const g = s.ghost;
    ctx.globalAlpha = 0.85;
    circle(ctx, g.x, g.y, 9, '#e9d5ff');
    ctx.fillStyle = '#e9d5ff';
    ctx.beginPath();
    ctx.moveTo(g.x - 9, g.y);
    for (let k = 0; k <= 6; k++) ctx.lineTo(g.x - 9 + k * 3, g.y + 12 + (k % 2) * 3 + Math.sin(t * 8 + k) * 1.5);
    ctx.lineTo(g.x + 9, g.y);
    ctx.fill();
    circle(ctx, g.x - 3, g.y - 1, 2, '#3b0764');
    circle(ctx, g.x + 3, g.y - 1, 2, '#3b0764');
    ctx.globalAlpha = 1;
  }
  drawSparks(ctx, s.sparks);
  for (const q of s.pops) {
    ctx.globalAlpha = Math.min(1, q.t * 2);
    text(ctx, q.text, q.x, q.y - (1 - q.t) * 24, { size: 8, color: '#fff' });
    ctx.globalAlpha = 1;
  }
  if (s.boss && !s.boss.dead) {
    text(ctx, BOSSES[s.boss.kind], AW / 2, 8, { size: 8, color: '#fff' });
    fillRound(ctx, AW / 2 - 50, 14, 100, 5, 2, 'rgba(0,0,0,0.5)');
    fillRound(ctx, AW / 2 - 49, 15, 98 * Math.max(0, s.boss.hp / s.boss.maxHp), 3, 1, '#ef4444');
  }
  if (s.phase === 'play' && !s.plan.boss && s.stageTime > 40 && s.stageTime < 50 && Math.floor(t * 3) % 2) {
    text(ctx, 'Hurry up!', AW / 2, 40, { size: 14, color: '#fde047' });
  }
  if (s.phase === 'intro') {
    ctx.fillStyle = 'rgba(15,23,42,0.7)';
    ctx.fillRect(0, AH / 2 - 34, AW, 60);
    text(ctx, s.plan.boss ? `Boss: ${BOSSES[s.plan.land]}` : `Stage ${s.stage + 1}`, AW / 2, AH / 2 - 14, { size: 16, color: '#fde047' });
    text(ctx, LANDS[s.plan.land], AW / 2, AH / 2 + 8, { size: 9, color: '#e2e8f0', weight: 600 });
  }
  if (s.phase === 'clear') text(ctx, s.stage % PER_LAND === PER_LAND - 1 ? 'Boss beaten!' : 'Stage clear!', AW / 2, 40, { size: 16, color: '#fde047' });
}
