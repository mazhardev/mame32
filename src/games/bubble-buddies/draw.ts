import { circle, drawSparks, fillRound, text } from '../_shared/arcade/draw';
import { AH, AT, AW } from '../_shared/platform/arena';
import { ONEWAY, SOLID } from '../_shared/platform/tiles';
import { FRUITS } from './game';
import type { Boss, Bubble, Enemy, State } from './game';
import { BOSSES, LETTERS } from './stages';

const TIERS = [
  { top: '#0e7490', bottom: '#164e63', block: '#f472b6', edge: '#fbcfe8' },
  { top: '#1d4ed8', bottom: '#1e1b4b', block: '#fb923c', edge: '#fed7aa' },
  { top: '#0f766e', bottom: '#042f2e', block: '#a78bfa', edge: '#ddd6fe' },
  { top: '#312e81', bottom: '#0b1020', block: '#22d3ee', edge: '#cffafe' },
];

const ENEMY = { windup: '#94a3b8', hopper: '#facc15', drifter: '#c084fc', thrower: '#f87171' } as const;

function background(ctx: CanvasRenderingContext2D, s: State) {
  const tier = TIERS[Math.min(3, Math.floor(s.stage / 10))];
  const g = ctx.createLinearGradient(0, 0, 0, AH);
  g.addColorStop(0, tier.top);
  g.addColorStop(1, tier.bottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, AW, AH);
  // Light rays and drifting specks.
  ctx.fillStyle = 'rgba(255,255,255,0.05)';
  for (let k = 0; k < 4; k++) {
    const x = 30 + k * 60 + Math.sin(s.time * 0.4 + k) * 10;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + 18, 0);
    ctx.lineTo(x + 50, AH);
    ctx.lineTo(x + 20, AH);
    ctx.fill();
  }
  for (let i = 0; i < 18; i++) {
    const x = (i * 47) % AW;
    const y = AH - ((s.time * (10 + (i % 4) * 5) + i * 37) % AH);
    circle(ctx, x + Math.sin(s.time + i) * 3, y, 1 + (i % 3) * 0.5, 'rgba(255,255,255,0.25)');
  }
  // Seaweed.
  ctx.strokeStyle = 'rgba(34,197,94,0.35)';
  ctx.lineWidth = 3;
  for (let i = 0; i < 6; i++) {
    const x = 24 + i * 42;
    ctx.beginPath();
    ctx.moveTo(x, AH - AT);
    for (let k = 1; k <= 5; k++) ctx.lineTo(x + Math.sin(s.time * 1.5 + k + i) * 4, AH - AT - k * 9);
    ctx.stroke();
  }
}

function tiles(ctx: CanvasRenderingContext2D, s: State) {
  const tier = TIERS[Math.min(3, Math.floor(s.stage / 10))];
  const g = s.grid;
  for (let r = 0; r < g.rows; r++) {
    for (let c = 0; c < g.cols; c++) {
      const v = g.cells[r * g.cols + c];
      const x = c * AT;
      const y = r * AT;
      if (v === SOLID) {
        fillRound(ctx, x + 0.5, y + 0.5, AT - 1, AT - 1, 4, tier.block);
        ctx.fillStyle = tier.edge;
        ctx.fillRect(x + 3, y + 3, 4, 2);
        circle(ctx, x + 11, y + 11, 1.5, 'rgba(0,0,0,0.18)');
      } else if (v === ONEWAY) {
        fillRound(ctx, x, y + 1, AT, 7, 3, tier.block);
        ctx.fillStyle = tier.edge;
        ctx.fillRect(x + 2, y + 2, AT - 4, 1);
      }
    }
  }
}

/** Fizz: a pink axolotl with feathery gills. */
function drawFizz(ctx: CanvasRenderingContext2D, s: State) {
  const p = s.p;
  if (p.invuln > 0 && !p.dead && Math.floor(s.time * 16) % 2 === 0) return;
  const step = p.ground ? Math.sin(p.anim * 2) * 1.5 : 0;
  ctx.save();
  ctx.translate(p.x + p.w / 2, p.y + p.h);
  ctx.scale(p.facing, 1);
  if (p.dead) ctx.rotate(s.time * 8);
  const pink = s.power.speed ? '#fb7185' : '#f9a8d4';
  // Tail.
  ctx.fillStyle = pink;
  ctx.beginPath();
  ctx.moveTo(-5, -6);
  ctx.quadraticCurveTo(-13, -8 + Math.sin(s.time * 8) * 2, -12, -2);
  ctx.lineTo(-4, -3);
  ctx.fill();
  ctx.fillStyle = '#db2777';
  ctx.fillRect(-4 + step, -2, 3, 2);
  ctx.fillRect(2 - step, -2, 3, 2);
  fillRound(ctx, -6, -9, 12, 8, 4, pink);
  // Head with gills.
  ctx.strokeStyle = '#ec4899';
  ctx.lineWidth = 1.6;
  for (const side of [-1, 1]) {
    for (let k = 0; k < 3; k++) {
      ctx.beginPath();
      ctx.moveTo(side * 5, -12);
      ctx.lineTo(side * (8 + k), -16 + k * 3);
      ctx.stroke();
    }
  }
  circle(ctx, 1, -12, 6, pink);
  circle(ctx, 3, -13, 1.3, '#111');
  circle(ctx, -1, -13, 1.3, '#111');
  ctx.strokeStyle = '#831843';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.arc(1.5, -11, 2, 0.2, Math.PI - 0.2);
  ctx.stroke();
  circle(ctx, 5, -11, 1, 'rgba(244,63,94,0.5)');
  if (p.blowCd > 0.18) circle(ctx, 8, -11, 2, 'rgba(186,230,253,0.8)');
  ctx.restore();
}

export function drawCritter(ctx: CanvasRenderingContext2D, kind: Enemy['kind'], x: number, y: number, dir: number, angry: boolean, t: number) {
  const color = angry ? '#ef4444' : ENEMY[kind];
  switch (kind) {
    case 'windup': {
      fillRound(ctx, x + 1, y + 2, 12, 11, 3, color);
      ctx.fillStyle = '#64748b';
      ctx.fillRect(x + 3, y + 12, 3, 2);
      ctx.fillRect(x + 8, y + 12, 3, 2);
      // The wind-up key on its back turns.
      const k = Math.sin(t * 10) * 3;
      ctx.fillStyle = '#facc15';
      ctx.fillRect(x + 7 - dir * 8 - 1, y + 6 - k / 2, 2, 2 + k);
      ctx.fillRect(x + 7 - dir * 7, y + 7, 2, 1);
      fillRound(ctx, x + 3, y + 4, 8, 5, 2, '#0f172a');
      circle(ctx, x + 5 + dir, y + 6.5, 1, angry ? '#fde047' : '#38bdf8');
      circle(ctx, x + 9 + dir, y + 6.5, 1, angry ? '#fde047' : '#38bdf8');
      break;
    }
    case 'hopper': {
      fillRound(ctx, x, y + 4, 14, 10, 5, color);
      circle(ctx, x + 4, y + 4, 3, color);
      circle(ctx, x + 10, y + 4, 3, color);
      circle(ctx, x + 4, y + 4, 1.3, '#111');
      circle(ctx, x + 10, y + 4, 1.3, '#111');
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(x + 7, y + 8, 3, 0.2, Math.PI - 0.2);
      ctx.stroke();
      break;
    }
    case 'drifter': {
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x + 7, y + 6, 7, Math.PI, 0);
      ctx.lineTo(x + 14, y + 8);
      ctx.lineTo(x, y + 8);
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      for (let k = 0; k < 4; k++) {
        ctx.beginPath();
        ctx.moveTo(x + 2 + k * 3.3, y + 8);
        ctx.lineTo(x + 2 + k * 3.3 + Math.sin(t * 6 + k) * 2, y + 14);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      circle(ctx, x + 5, y + 5, 1.2, '#111');
      circle(ctx, x + 9, y + 5, 1.2, '#111');
      break;
    }
    case 'thrower': {
      const claw = Math.sin(t * 8) * 1.5;
      circle(ctx, x - 1, y + 6 + claw, 3, color);
      circle(ctx, x + 15, y + 6 - claw, 3, color);
      fillRound(ctx, x + 1, y + 5, 12, 8, 4, color);
      ctx.fillStyle = '#7f1d1d';
      for (let k = 0; k < 3; k++) ctx.fillRect(x + 2 + k * 4, y + 12, 1.5, 2);
      ctx.fillStyle = color;
      ctx.fillRect(x + 4, y + 1, 1.5, 4);
      ctx.fillRect(x + 9, y + 1, 1.5, 4);
      circle(ctx, x + 4.7, y + 1, 1.5, '#fff');
      circle(ctx, x + 9.7, y + 1, 1.5, '#fff');
      circle(ctx, x + 4.7 + dir * 0.5, y + 1, 0.8, '#111');
      circle(ctx, x + 9.7 + dir * 0.5, y + 1, 0.8, '#111');
      break;
    }
  }
}

function drawBubble(ctx: CanvasRenderingContext2D, b: Bubble, t: number) {
  const blink = b.enemy && b.enemy.timer < 2 && Math.floor(t * 10) % 2;
  if (b.enemy) {
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.scale(0.75, 0.75);
    drawCritter(ctx, b.enemy.kind, -7, -7, 1, false, t);
    ctx.restore();
  }
  const fill =
    b.kind === 'lightning' ? 'rgba(250,204,21,0.35)'
    : b.kind === 'fire' ? 'rgba(249,115,22,0.35)'
    : b.kind === 'letter' ? 'rgba(236,72,153,0.35)'
    : b.enemy ? (blink ? 'rgba(239,68,68,0.35)' : 'rgba(125,211,252,0.3)')
    : 'rgba(186,230,253,0.25)';
  const r = 8 + Math.sin(b.wobble) * 0.4;
  circle(ctx, b.x, b.y, r, fill);
  ctx.strokeStyle = b.kind === 'plain' ? 'rgba(224,242,254,0.9)' : b.kind === 'lightning' ? '#fde047' : b.kind === 'fire' ? '#fb923c' : '#f9a8d4';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(b.x, b.y, r, 0, Math.PI * 2);
  ctx.stroke();
  circle(ctx, b.x - 3, b.y - 3, 1.8, 'rgba(255,255,255,0.8)');
  if (b.kind === 'lightning') {
    ctx.fillStyle = '#fde047';
    ctx.beginPath();
    ctx.moveTo(b.x + 1, b.y - 6);
    ctx.lineTo(b.x - 3, b.y + 1);
    ctx.lineTo(b.x, b.y + 1);
    ctx.lineTo(b.x - 1, b.y + 6);
    ctx.lineTo(b.x + 3, b.y - 1);
    ctx.lineTo(b.x, b.y - 1);
    ctx.fill();
  } else if (b.kind === 'fire') {
    circle(ctx, b.x, b.y + 1, 3.5, '#f97316');
    circle(ctx, b.x, b.y - 2, 2, '#fde047');
  } else if (b.kind === 'letter') {
    text(ctx, LETTERS[b.letter], b.x, b.y + 0.5, { size: 9, color: '#fff' });
  }
}

function drawBoss(ctx: CanvasRenderingContext2D, boss: Boss, t: number) {
  if (boss.invuln > 0 && Math.floor(t * 20) % 2 === 0) return;
  const { x, y, w, h } = boss.b;
  const cx = x + w / 2;
  const cy = y + h / 2;
  const dir = boss.b.vx < 0 ? -1 : 1;
  ctx.save();
  if (boss.dead) {
    ctx.translate(cx, cy);
    ctx.rotate(t * 6);
    ctx.translate(-cx, -cy);
  }
  if (boss.kind === 0) {
    // Captain Puffer: a spiky pufferfish in a captain's hat.
    ctx.fillStyle = '#ca8a04';
    for (let k = 0; k < 14; k++) {
      const a = (k / 14) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * 16, cy + Math.sin(a) * 16);
      ctx.lineTo(cx + Math.cos(a + 0.12) * 23, cy + Math.sin(a + 0.12) * 23);
      ctx.lineTo(cx + Math.cos(a + 0.24) * 16, cy + Math.sin(a + 0.24) * 16);
      ctx.fill();
    }
    circle(ctx, cx, cy, 18, '#facc15');
    circle(ctx, cx, cy + 6, 11, '#fef9c3');
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.moveTo(cx - dir * 16, cy);
    ctx.lineTo(cx - dir * 28, cy - 9);
    ctx.lineTo(cx - dir * 28, cy + 9);
    ctx.fill();
    fillRound(ctx, cx - 12, y - 4, 24, 8, 3, '#1e3a8a');
    fillRound(ctx, cx - 15, y + 2, 30, 4, 2, '#1e293b');
    circle(ctx, cx, y, 2.5, '#fde047');
  } else {
    // Grand Grumble: a crowned walrus.
    fillRound(ctx, x, y + 6, w, h - 6, 16, '#a16207');
    circle(ctx, cx, cy + 4, 14, '#ca8a04');
    ctx.fillStyle = '#fef3c7';
    ctx.fillRect(cx - 7, cy + 8, 3, 12);
    ctx.fillRect(cx + 4, cy + 8, 3, 12);
    circle(ctx, cx - 4, cy + 6, 4, '#d6a467');
    circle(ctx, cx + 4, cy + 6, 4, '#d6a467');
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.moveTo(cx - 12, y + 8);
    ctx.lineTo(cx - 12, y - 4);
    ctx.lineTo(cx - 6, y + 2);
    ctx.lineTo(cx, y - 7);
    ctx.lineTo(cx + 6, y + 2);
    ctx.lineTo(cx + 12, y - 4);
    ctx.lineTo(cx + 12, y + 8);
    ctx.fill();
  }
  const eyeX = cx + dir * 4;
  circle(ctx, eyeX - 5, cy - 4, 3.5, '#fff');
  circle(ctx, eyeX + 5, cy - 4, 3.5, '#fff');
  circle(ctx, eyeX - 5 + dir, cy - 4, 1.8, '#111');
  circle(ctx, eyeX + 5 + dir, cy - 4, 1.8, '#111');
  ctx.fillStyle = '#111';
  ctx.fillRect(eyeX - 9, cy - 10, 7, 1.5);
  ctx.fillRect(eyeX + 2, cy - 10, 7, 1.5);
  ctx.restore();
}

function drawFruit(ctx: CanvasRenderingContext2D, x: number, y: number, kind: number) {
  const f = FRUITS[kind];
  const cx = x + 6;
  const cy = y + 6;
  switch (f.name) {
    case 'cherry':
      circle(ctx, cx - 2.5, cy + 2, 3, f.color);
      circle(ctx, cx + 2.5, cy + 2, 3, f.color);
      ctx.strokeStyle = '#15803d';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx - 2.5, cy);
      ctx.lineTo(cx, cy - 5);
      ctx.lineTo(cx + 2.5, cy);
      ctx.stroke();
      break;
    case 'banana':
      ctx.strokeStyle = f.color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx, cy - 3, 6, 0.3, Math.PI - 0.3);
      ctx.stroke();
      break;
    case 'melon':
      ctx.fillStyle = '#15803d';
      ctx.beginPath();
      ctx.arc(cx, cy - 1, 6, 0, Math.PI);
      ctx.fill();
      ctx.fillStyle = '#f87171';
      ctx.beginPath();
      ctx.arc(cx, cy - 1, 4.5, 0, Math.PI);
      ctx.fill();
      break;
    case 'grapes':
      for (const [dx, dy] of [[-2, -2], [2, -2], [0, 1], [-2, 4], [2, 4], [0, 6]]) circle(ctx, cx + dx, cy + dy - 1, 2, f.color);
      break;
    case 'peach':
      circle(ctx, cx, cy + 1, 5, f.color);
      ctx.fillStyle = '#16a34a';
      ctx.fillRect(cx, cy - 6, 3, 2);
      break;
    default:
      fillRound(ctx, cx - 4, cy - 2, 8, 9, 3, f.color);
      ctx.fillStyle = '#16a34a';
      ctx.beginPath();
      ctx.moveTo(cx - 3, cy - 2);
      ctx.lineTo(cx, cy - 8);
      ctx.lineTo(cx + 3, cy - 2);
      ctx.fill();
  }
}

export function render(ctx: CanvasRenderingContext2D, s: State) {
  const t = s.time;
  background(ctx, s);
  tiles(ctx, s);
  for (const f of s.flames) {
    const k = Math.sin(t * 20 + f.x) * 1.5;
    circle(ctx, f.x, f.y - 4 + k * 0.3, 4, '#f97316');
    circle(ctx, f.x, f.y - 5, 2, '#fde047');
  }
  for (const f of s.fruits) drawFruit(ctx, f.b.x, f.b.y, f.kind);
  for (const it of s.pickups) {
    if (it.life < 3 && Math.floor(t * 10) % 2) continue;
    const { x, y } = it.b;
    if (it.kind === 'speed') {
      fillRound(ctx, x + 1, y + 4, 10, 6, 2, '#3b82f6');
      ctx.fillStyle = '#fff';
      ctx.fillRect(x + 1, y + 9, 11, 2);
    } else {
      fillRound(ctx, x + 2, y + 2, 8, 8, 3, it.kind === 'range' ? '#ec4899' : '#facc15');
      ctx.fillStyle = '#fff';
      ctx.fillRect(x, y + 5, 2, 2);
      ctx.fillRect(x + 10, y + 5, 2, 2);
    }
  }
  if (s.boss) drawBoss(ctx, s.boss, t);
  for (const e of s.enemies) {
    if (e.state === 'dead' || e.state === 'trapped') continue;
    if (e.state === 'arrive') ctx.globalAlpha = 1 - e.timer;
    drawCritter(ctx, e.kind, e.w.b.x, e.w.b.y, e.w.dir, e.angry, t);
    ctx.globalAlpha = 1;
  }
  if (s.phase !== 'intro') drawFizz(ctx, s);
  for (const b of s.bubbles) drawBubble(ctx, b, t);
  for (const sh of s.shots) {
    if (sh.kind === 'bolt') {
      ctx.strokeStyle = '#fde047';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      for (let k = 0; k < 5; k++) ctx.lineTo(sh.x - Math.sign(sh.vx) * k * 6, sh.y + (k % 2 ? 4 : -4));
      ctx.stroke();
    } else if (sh.kind === 'flame') {
      circle(ctx, sh.x, sh.y, 4, '#f97316');
    } else if (sh.kind === 'bottle') {
      fillRound(ctx, sh.x - 2.5, sh.y - 4, 5, 8, 2, '#4ade80');
      ctx.fillStyle = '#a16207';
      ctx.fillRect(sh.x - 1, sh.y - 6, 2, 2);
    } else {
      circle(ctx, sh.x, sh.y, 3.5, '#78716c');
    }
  }
  if (s.ghost) {
    const g = s.ghost;
    circle(ctx, g.x, g.y, 9, '#f8fafc');
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(g.x - 6, g.y + 4, 12, 6);
    circle(ctx, g.x - 3, g.y - 1, 2.5, '#0f172a');
    circle(ctx, g.x + 3, g.y - 1, 2.5, '#0f172a');
    ctx.fillStyle = '#0f172a';
    for (let k = 0; k < 4; k++) ctx.fillRect(g.x - 5 + k * 3, g.y + 6, 1, 3);
  }
  drawSparks(ctx, s.sparks);
  for (const q of s.pops) {
    ctx.globalAlpha = Math.min(1, q.t * 2);
    text(ctx, q.text, q.x, q.y - (1 - q.t) * 24, { size: 8, color: '#fff' });
    ctx.globalAlpha = 1;
  }
  // SPLASH letters collected so far.
  LETTERS.forEach((l, i) => {
    const x = AW - 76 + i * 11;
    circle(ctx, x, 8, 5, s.letters[i] ? '#ec4899' : 'rgba(255,255,255,0.15)');
    text(ctx, l, x, 8.5, { size: 7, color: s.letters[i] ? '#fff' : 'rgba(255,255,255,0.4)' });
  });
  if (s.boss && !s.boss.dead) {
    text(ctx, BOSSES[s.boss.kind], 70, 8, { size: 8, color: '#fff' });
    fillRound(ctx, 20, 14, 100, 5, 2, 'rgba(0,0,0,0.5)');
    fillRound(ctx, 21, 15, 98 * Math.max(0, s.boss.hp / s.boss.maxHp), 3, 1, '#ef4444');
  }
  if (s.phase === 'play' && s.plan.boss === null && s.stageTime > 30 && s.stageTime < 36 && Math.floor(t * 3) % 2) {
    text(ctx, 'Hurry!', AW / 2, 40, { size: 14, color: '#fde047' });
  }
  if (s.phase === 'intro') {
    ctx.fillStyle = 'rgba(15,23,42,0.7)';
    ctx.fillRect(0, AH / 2 - 34, AW, 60);
    text(ctx, s.plan.boss !== null ? `Boss: ${BOSSES[s.plan.boss]}` : `Stage ${s.stage + 1}`, AW / 2, AH / 2 - 14, { size: 16, color: '#fde047' });
    text(ctx, s.plan.boss !== null ? 'Pop the lightning bubbles to zap it!' : 'Bubble Lagoon', AW / 2, AH / 2 + 8, { size: 9, color: '#e2e8f0', weight: 600 });
  }
  if (s.phase === 'clear') text(ctx, s.plan.boss !== null ? 'Boss beaten!' : 'Stage clear!', AW / 2, 40, { size: 16, color: '#fde047' });
}
