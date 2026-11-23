import { PITCH } from '../_shared/cricket/cricket';
import { circle, fillRound, text } from '../_shared/arcade/draw';
import {
  BOUNDARY,
  CREASE,
  FIELD_CX,
  FIELD_CY,
  H,
  SCALE,
  W,
  landing,
  needed,
  ballsLeft,
  throwButtons,
  toScreen,
  type State,
} from './engine';

const GRASS = '#2f7a2c';
const GRASS_LIGHT = '#348431';

function drawGround(ctx: CanvasRenderingContext2D) {
  const r = (BOUNDARY + 4) * SCALE;
  ctx.save();
  ctx.beginPath();
  ctx.arc(FIELD_CX, FIELD_CY, r, 0, Math.PI * 2);
  ctx.fillStyle = GRASS;
  ctx.fill();
  ctx.clip();
  // Mowing stripes.
  ctx.fillStyle = GRASS_LIGHT;
  for (let y = FIELD_CY - r; y < FIELD_CY + r; y += 28) ctx.fillRect(FIELD_CX - r, y, r * 2, 14);
  ctx.restore();

  ctx.strokeStyle = '#f8fafc';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(FIELD_CX, FIELD_CY, BOUNDARY * SCALE, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.setLineDash([4, 5]);
  ctx.beginPath();
  ctx.arc(FIELD_CX, FIELD_CY, 27 * SCALE, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  // Pitch, creases and stumps.
  const top = toScreen(0, PITCH + 1.2);
  const bottom = toScreen(0, -1.2);
  ctx.fillStyle = '#d6c08a';
  ctx.fillRect(top.x - 1.6 * SCALE, top.y, 3.2 * SCALE, bottom.y - top.y);
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth = 1;
  for (const y of [CREASE, PITCH - CREASE]) {
    const p = toScreen(0, y);
    ctx.beginPath();
    ctx.moveTo(p.x - 1.6 * SCALE, p.y);
    ctx.lineTo(p.x + 1.6 * SCALE, p.y);
    ctx.stroke();
  }
}

function drawStumps(ctx: CanvasRenderingContext2D, s: State, end: 0 | 1, glow: boolean) {
  const p = toScreen(0, end === 0 ? 0 : PITCH);
  if (glow) {
    const pulse = 0.5 + 0.5 * Math.sin(s.time * 8);
    ctx.strokeStyle = `rgba(253,224,71,${0.5 + 0.5 * pulse})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 11 + pulse * 3, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.fillStyle = '#7c4a1d';
  ctx.fillRect(p.x - 4, p.y - 1.5, 8, 3);
  ctx.fillStyle = '#fef3c7';
  for (const dx of [-3, 0, 3]) ctx.fillRect(p.x + dx - 0.75, p.y - 1, 1.5, 2);
}

/** The two batters: they swap ends with every completed run. */
function drawBatters(ctx: CanvasRenderingContext2D, s: State) {
  const startA = s.runs % 2 === 0 ? 0 : PITCH;
  const startB = PITCH - startA;
  const p = s.running ? s.runP : 0;
  const ya = startA + (startB - startA) * p;
  const yb = startB + (startA - startB) * p;
  for (const [x, y] of [
    [-0.9, ya],
    [0.9, yb],
  ] as const) {
    const q = toScreen(x, y);
    circle(ctx, q.x, q.y, 5, '#1d4ed8');
    circle(ctx, q.x, q.y - 1, 2.4, '#bfdbfe');
  }
}

function drawFielders(ctx: CanvasRenderingContext2D, s: State) {
  s.fielders.forEach((f, i) => {
    const q = toScreen(f.x, f.y);
    const active = i === s.active && s.phase === 'live';
    if (f.down > 0) {
      // On the ground after a dive.
      ctx.fillStyle = 'rgba(248,250,252,0.85)';
      ctx.beginPath();
      ctx.ellipse(q.x, q.y, 7, 3.5, Math.atan2(-f.dvy, f.dvx), 0, Math.PI * 2);
      ctx.fill();
    } else {
      circle(ctx, q.x, q.y + 1.5, 6, 'rgba(0,0,0,0.25)');
      circle(ctx, q.x, q.y, 6, '#f8fafc');
      circle(ctx, q.x, q.y - 1, 2.6, '#e2a77a');
    }
    if (active) {
      ctx.strokeStyle = '#fde047';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(q.x, q.y, 10, 0, Math.PI * 2);
      ctx.stroke();
      if (s.goal && s.ball.state !== 'held') {
        const g = toScreen(s.goal.x, s.goal.y);
        ctx.strokeStyle = 'rgba(253,224,71,0.55)';
        ctx.setLineDash([3, 4]);
        ctx.beginPath();
        ctx.moveTo(q.x, q.y);
        ctx.lineTo(g.x, g.y);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
  });
}

function drawBall(ctx: CanvasRenderingContext2D, s: State) {
  const b = s.ball;
  if (b.state === 'dead' && s.phase !== 'after') return;
  if (s.phase === 'runup') return;
  // Landing spot of a ball in the air: get under it for the catch.
  if (b.state === 'air' && !b.bounced && s.shot === 'hit') {
    const l = landing(b);
    const q = toScreen(l.x, l.y);
    ctx.strokeStyle = 'rgba(253,224,71,0.85)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(q.x - 5, q.y - 5);
    ctx.lineTo(q.x + 5, q.y + 5);
    ctx.moveTo(q.x + 5, q.y - 5);
    ctx.lineTo(q.x - 5, q.y + 5);
    ctx.stroke();
  }
  if (b.state === 'thrown') {
    const from = toScreen(b.fromX, b.fromY);
    const q = toScreen(b.x, b.y);
    ctx.strokeStyle = 'rgba(254,202,202,0.6)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(q.x, q.y);
    ctx.stroke();
  }
  const g = toScreen(b.x, b.y);
  const lift = b.state === 'air' ? b.z * SCALE * 0.9 : b.state === 'thrown' ? 4 : 0;
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(g.x, g.y, 3, 1.8, 0, 0, Math.PI * 2);
  ctx.fill();
  const r = 2.6 + Math.min(3, b.z * 0.18);
  circle(ctx, g.x, g.y - lift, r, '#dc2626');
  circle(ctx, g.x - r * 0.3, g.y - lift - r * 0.3, r * 0.35, 'rgba(255,255,255,0.6)');
}

function drawScoreboard(ctx: CanvasRenderingContext2D, s: State) {
  fillRound(ctx, 8, 8, W - 16, 96, 14, 'rgba(15,23,42,0.88)');
  const need = needed(s);
  const left = ballsLeft(s);
  text(ctx, 'DEFEND THE TARGET', 22, 26, { size: 11, color: '#94a3b8', align: 'left' });
  text(ctx, `${s.total}/${s.wickets}`, 22, 52, { size: 26, color: '#f8fafc', align: 'left', weight: 800 });
  text(ctx, `Target ${s.cfg.target}`, W - 22, 26, { size: 11, color: '#94a3b8', align: 'right' });
  const msg = need <= 0 ? 'Target reached' : `Need ${need} off ${left}`;
  text(ctx, msg, W - 22, 52, { size: 18, color: need <= 6 ? '#fca5a5' : '#fde68a', align: 'right', weight: 700 });
  // One dot per ball, oldest first.
  const balls = s.log.slice().reverse();
  const gap = (W - 44) / s.cfg.balls;
  for (let i = 0; i < s.cfg.balls; i++) {
    const x = 22 + gap * (i + 0.5);
    const l = balls[i];
    if (!l) {
      circle(ctx, x, 84, 9, 'rgba(148,163,184,0.18)');
      continue;
    }
    const color = l.out ? '#b91c1c' : l.runs >= 4 ? '#15803d' : l.runs > 0 ? '#334155' : '#1e293b';
    circle(ctx, x, 84, 9, color);
    text(ctx, l.out ? 'W' : l.runs === 0 ? '•' : String(l.runs), x, 84.5, { size: 10, color: '#fff', weight: 700 });
  }
  text(ctx, `${s.cfg.wickets - s.wickets} wkt${s.cfg.wickets - s.wickets === 1 ? '' : 's'} left`, W / 2, 52, {
    size: 11,
    color: '#cbd5e1',
  });
}

function drawPrompts(ctx: CanvasRenderingContext2D, s: State) {
  const b = s.ball;
  if (s.phase === 'runup') {
    const t = Math.min(1, s.phaseT / 1.1);
    const bowler = toScreen(1.2, PITCH + 12 - 10 * t);
    circle(ctx, bowler.x, bowler.y, 5, '#f8fafc');
    text(ctx, 'Bowler running in…', W / 2, 124, { size: 13, color: '#e2e8f0' });
    return;
  }
  if (s.phase === 'after' && s.banner) {
    const big = /SIX|FOUR|OUT|CAUGHT|BOWLED/.test(s.banner);
    fillRound(ctx, 30, FIELD_CY - 26, W - 60, 52, 14, big ? (/SIX|FOUR/.test(s.banner) ? 'rgba(127,29,29,0.9)' : 'rgba(22,101,52,0.92)') : 'rgba(15,23,42,0.85)');
    text(ctx, s.banner, W / 2, FIELD_CY, { size: big ? 22 : 18, color: '#fff', weight: 800 });
    return;
  }
  if (s.phase !== 'live') return;
  if (b.state === 'held') {
    for (const bt of throwButtons()) {
      fillRound(ctx, bt.x, bt.y, bt.w, bt.h, 12, 'rgba(202,138,4,0.92)');
      text(ctx, bt.label, bt.x + bt.w / 2, bt.y + bt.h / 2 + 0.5, { size: 13, color: '#1c1917', weight: 800 });
    }
    text(ctx, s.running ? 'They’re running — throw!' : 'Throw it in', W / 2, 124, {
      size: 14,
      color: s.running ? '#fde047' : '#e2e8f0',
      weight: 700,
    });
  } else if (s.banner === 'Dropped!') {
    text(ctx, 'Dropped!', W / 2, 124, { size: 15, color: '#fca5a5', weight: 800 });
  } else if (b.state === 'air' && !b.bounced && s.shot === 'hit') {
    text(ctx, 'In the air — get under it!', W / 2, 124, { size: 13, color: '#fde68a', weight: 700 });
  } else if (s.running) {
    text(ctx, 'Batters running — field it fast', W / 2, 124, { size: 13, color: '#e2e8f0' });
  }
}

export function render(ctx: CanvasRenderingContext2D, s: State) {
  ctx.fillStyle = '#0b2e18';
  ctx.fillRect(0, 0, W, H);
  drawGround(ctx);
  const held = s.phase === 'live' && s.ball.state === 'held';
  drawStumps(ctx, s, 1, held);
  drawStumps(ctx, s, 0, held);
  drawBatters(ctx, s);
  drawFielders(ctx, s);
  drawBall(ctx, s);
  drawScoreboard(ctx, s);
  drawPrompts(ctx, s);
}
