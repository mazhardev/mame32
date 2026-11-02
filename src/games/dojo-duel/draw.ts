import { circle, fillRound, text } from '../_shared/arcade/draw';
import { drawFighter } from './drawFighter';
import { METER_MAX } from './engine';
import type { Battle, Effect, Fighter, Proj } from './engine';
import { STAGES } from './fighters';
import type { FighterDef } from './fighters';
import { FLOOR_Y, H, W, opponent } from './game';
import type { State } from './game';
import { STANCE, poseOf } from './pose';

/** Dojo Duel drawing: stages, fighters, projectiles, effects and the fight HUD. */

/* --------------------------------------------------------------- stages */
function stage(ctx: CanvasRenderingContext2D, n: number, t: number) {
  const sky = (a: string, b: string) => {
    const g = ctx.createLinearGradient(0, 0, 0, FLOOR_Y);
    g.addColorStop(0, a);
    g.addColorStop(1, b);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, FLOOR_Y);
  };
  const floor = (top: string, bottom: string, lines: string) => {
    const g = ctx.createLinearGradient(0, FLOOR_Y, 0, H);
    g.addColorStop(0, top);
    g.addColorStop(1, bottom);
    ctx.fillStyle = g;
    ctx.fillRect(0, FLOOR_Y, W, H - FLOOR_Y);
    ctx.strokeStyle = lines;
    ctx.lineWidth = 1;
    for (let i = -8; i <= 8; i++) {
      ctx.beginPath();
      ctx.moveTo(W / 2 + i * 34, FLOOR_Y);
      ctx.lineTo(W / 2 + i * 60, H);
      ctx.stroke();
    }
  };
  switch (n) {
    case 0: {
      // Dojo: paper screens, wooden beams, a hanging scroll.
      sky('#d9b98a', '#c49a66');
      for (let x = 0; x < W; x += 80) {
        ctx.fillStyle = '#f4ead2';
        ctx.fillRect(x + 6, 40, 68, 168);
        ctx.strokeStyle = '#7a5332';
        ctx.lineWidth = 1.5;
        for (let i = 1; i < 4; i++) {
          ctx.beginPath();
          ctx.moveTo(x + 6 + i * 17, 40);
          ctx.lineTo(x + 6 + i * 17, 208);
          ctx.stroke();
        }
        for (let j = 1; j < 6; j++) {
          ctx.beginPath();
          ctx.moveTo(x + 6, 40 + j * 28);
          ctx.lineTo(x + 74, 40 + j * 28);
          ctx.stroke();
        }
        ctx.fillStyle = '#5c3b22';
        ctx.fillRect(x, 30, 6, 210);
      }
      ctx.fillStyle = '#5c3b22';
      ctx.fillRect(0, 22, W, 14);
      ctx.fillRect(0, 206, W, 8);
      fillRound(ctx, 214, 52, 52, 96, 3, '#efe3c4');
      ctx.fillStyle = '#9b2a22';
      ctx.fillRect(214, 48, 52, 6);
      ctx.fillRect(214, 146, 52, 6);
      circle(ctx, 240, 96, 15, '#9b2a22');
      circle(ctx, 240, 96, 9, '#efe3c4');
      floor('#b07a45', '#8a5a2e', 'rgba(70,40,15,0.35)');
      break;
    }
    case 1: {
      // Temple steps at dusk with a red gate.
      sky('#f2a65a', '#fde3b0');
      circle(ctx, 360, 92, 30, 'rgba(255,240,200,0.9)');
      ctx.fillStyle = '#8a8f98';
      for (let i = 0; i < 6; i++) ctx.fillRect(110 - i * 14, 150 + i * 15, 260 + i * 28, 15);
      ctx.fillStyle = '#c2372b';
      ctx.fillRect(150, 70, 10, 82);
      ctx.fillRect(320, 70, 10, 82);
      ctx.fillRect(132, 62, 216, 10);
      ctx.fillRect(140, 84, 200, 7);
      ctx.fillStyle = '#2b2b2b';
      ctx.fillRect(126, 56, 228, 7);
      ctx.fillStyle = '#6f7a5a';
      for (const x of [30, 70, 420, 455]) {
        circle(ctx, x, 150, 34, '#6f7a5a');
        ctx.fillStyle = '#4b3a28';
        ctx.fillRect(x - 3, 170, 6, 40);
      }
      floor('#a3a7ad', '#7d8188', 'rgba(60,60,70,0.35)');
      break;
    }
    case 2: {
      // Bamboo grove with drifting leaves.
      sky('#cfe8c0', '#9fcf8f');
      for (let i = 0; i < 22; i++) {
        const x = (i * 53.7) % W;
        const w = 7 + (i % 3) * 3;
        ctx.fillStyle = i % 2 ? '#5f9a46' : '#4a8236';
        ctx.fillRect(x, 0, w, FLOOR_Y);
        ctx.fillStyle = '#3c6b2b';
        for (let y = 20 + (i % 4) * 9; y < FLOOR_Y; y += 46) ctx.fillRect(x - 1, y, w + 2, 3);
      }
      ctx.fillStyle = 'rgba(120,180,90,0.8)';
      for (let i = 0; i < 12; i++) {
        const x = (i * 97 + t * 18) % (W + 40) - 20;
        const y = (i * 41 + t * 22) % FLOOR_Y;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(t * 2 + i);
        ctx.fillRect(-4, -1.5, 8, 3);
        ctx.restore();
      }
      floor('#7a9a55', '#5b7a3c', 'rgba(40,60,20,0.3)');
      break;
    }
    case 3: {
      // Night rooftop above a lit city.
      sky('#141a3a', '#3b2f6b');
      circle(ctx, 90, 60, 22, '#f5f1d8');
      circle(ctx, 100, 54, 22, '#1c2147');
      for (let i = 0; i < 40; i++) {
        ctx.fillStyle = `rgba(255,255,255,${0.3 + 0.4 * Math.abs(Math.sin(t + i))})`;
        ctx.fillRect((i * 83.3) % W, (i * 37.1) % 110, 1.5, 1.5);
      }
      for (let i = 0; i < 14; i++) {
        const x = i * 36;
        const h = 60 + ((i * 47) % 90);
        ctx.fillStyle = '#20244a';
        ctx.fillRect(x, FLOOR_Y - h, 32, h);
        ctx.fillStyle = '#ffd772';
        for (let wy = FLOOR_Y - h + 8; wy < FLOOR_Y - 10; wy += 12)
          for (let wx = x + 4; wx < x + 28; wx += 8) if ((wx * 7 + wy * 3 + i) % 5 < 2) ctx.fillRect(wx, wy, 3, 5);
      }
      ctx.fillStyle = '#3a3f5c';
      ctx.fillRect(0, FLOOR_Y - 8, W, 8);
      floor('#4a4f6e', '#2e3250', 'rgba(20,20,40,0.5)');
      break;
    }
    default: {
      // Volcano shrine: red sky, lava glow, stone pillars.
      sky('#3a0d0d', '#b2361c');
      ctx.fillStyle = '#2a1414';
      ctx.beginPath();
      ctx.moveTo(140, FLOOR_Y);
      ctx.lineTo(220, 70);
      ctx.lineTo(260, 70);
      ctx.lineTo(340, FLOOR_Y);
      ctx.fill();
      ctx.fillStyle = `rgba(255,${120 + Math.sin(t * 3) * 40},40,0.9)`;
      ctx.beginPath();
      ctx.moveTo(222, 72);
      ctx.lineTo(258, 72);
      ctx.lineTo(250, 110);
      ctx.lineTo(230, 110);
      ctx.fill();
      for (let i = 0; i < 18; i++) {
        const y = (FLOOR_Y - ((t * 30 + i * 37) % FLOOR_Y));
        circle(ctx, (i * 61) % W, y, 1.5, 'rgba(255,170,60,0.8)');
      }
      for (const x of [40, 420]) {
        ctx.fillStyle = '#4a3a3a';
        ctx.fillRect(x, 60, 22, FLOOR_Y - 60);
        ctx.fillStyle = '#5c4848';
        ctx.fillRect(x - 6, 52, 34, 10);
        circle(ctx, x + 11, 80, 6, `rgba(255,140,40,${0.6 + 0.3 * Math.sin(t * 8 + x)})`);
      }
      floor('#4d2b26', '#2b1512', 'rgba(255,90,40,0.25)');
      break;
    }
  }
}

/* -------------------------------------------------------------- fighters */
function glowFor(f: Fighter): string | undefined {
  const r = f.run;
  if (!r) return undefined;
  if (r.m.super) return '#ffd34a';
  if (r.special) return f.def.style.aura ?? '#ffffff';
  return undefined;
}

function drawOne(ctx: CanvasRenderingContext2D, f: Fighter, frame: number, time: number) {
  const pose = poseOf(f, frame);
  // Shadow.
  const sh = Math.max(0.35, 1 - f.y / 140);
  ctx.fillStyle = `rgba(0,0,0,${0.25 * sh})`;
  ctx.beginPath();
  ctx.ellipse(f.x, FLOOR_Y + 2, 20 * f.def.scale * sh, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  drawFighter(ctx, f.def, pose, {
    x: f.x,
    floorY: FLOOR_Y,
    lift: f.y,
    face: f.face,
    scale: f.def.scale,
    flash: f.flash > 0 ? Math.min(1, f.flash / 6) : 0,
    alpha: f.alpha,
    glow: glowFor(f),
    time,
  });
}

/** A fighter standing ready, for portraits and the versus screen. */
export function drawStanding(ctx: CanvasRenderingContext2D, def: FighterDef, x: number, floorY: number, face: 1 | -1, scale: number, time: number) {
  drawFighter(ctx, def, STANCE, { x, floorY, lift: 0, face, scale: def.scale * scale, flash: 0, alpha: 1, time });
}

function drawProj(ctx: CanvasRenderingContext2D, p: Proj, time: number) {
  const x = p.x;
  const y = FLOOR_Y - p.y;
  const r = p.def.h / 2;
  switch (p.def.kind) {
    case 'orb':
    case 'storm': {
      const big = p.def.kind === 'storm';
      const g = ctx.createRadialGradient(x, y, 2, x, y, r * 1.4);
      g.addColorStop(0, '#fffbe0');
      g.addColorStop(0.4, big ? '#ffb23a' : '#ffd36b');
      g.addColorStop(1, 'rgba(255,90,20,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r * 1.4, 0, Math.PI * 2);
      ctx.fill();
      for (let i = 1; i <= 3; i++) circle(ctx, x - p.dir * i * r * 0.6, y + Math.sin(time * 20 + i) * 3, r * (0.5 - i * 0.1), `rgba(255,140,40,${0.5 - i * 0.12})`);
      break;
    }
    case 'dark': {
      const g = ctx.createRadialGradient(x, y, 2, x, y, r * 1.5);
      g.addColorStop(0, '#f0d0ff');
      g.addColorStop(0.35, '#7a2bbf');
      g.addColorStop(1, 'rgba(30,0,50,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r * 1.5, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'star': {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(time * 25);
      ctx.fillStyle = '#c9d2dc';
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI) / 4;
        const rr = i % 2 ? r * 0.35 : r;
        ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
      }
      ctx.closePath();
      ctx.fill();
      circle(ctx, 0, 0, r * 0.2, '#555');
      ctx.restore();
      break;
    }
    case 'spark': {
      circle(ctx, x, y, r * 1.2, 'rgba(120,210,255,0.35)');
      circle(ctx, x, y, r * 0.6, '#e8f8ff');
      ctx.strokeStyle = '#7fd6ff';
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 4; i++) {
        const a = time * 9 + i * 1.6;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + Math.cos(a) * r * 0.8, y + Math.sin(a) * r * 0.8);
        ctx.lineTo(x + Math.cos(a + 0.4) * r * 1.3, y + Math.sin(a + 0.4) * r * 1.3);
        ctx.stroke();
      }
      break;
    }
    case 'wave': {
      ctx.fillStyle = 'rgba(160,120,80,0.8)';
      for (let i = 0; i < 4; i++) {
        const h = 6 + ((i * 7 + p.t) % 9);
        ctx.fillRect(x - p.def.w / 2 + i * 8, FLOOR_Y - h, 6, h);
      }
      ctx.fillStyle = 'rgba(255,240,200,0.5)';
      ctx.fillRect(x - p.def.w / 2, FLOOR_Y - 3, p.def.w, 3);
      break;
    }
  }
}

function drawFx(ctx: CanvasRenderingContext2D, e: Effect) {
  const x = e.x;
  const y = FLOOR_Y - e.y;
  const f = e.t / 24;
  switch (e.kind) {
    case 'hit': {
      const n = e.big ? 10 : 7;
      const r = (e.big ? 26 : 16) * (0.5 + f);
      ctx.strokeStyle = `rgba(255,240,170,${1 - f})`;
      ctx.lineWidth = e.big ? 3 : 2;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + e.x;
        ctx.beginPath();
        ctx.moveTo(x + Math.cos(a) * r * 0.3, y + Math.sin(a) * r * 0.3);
        ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
        ctx.stroke();
      }
      circle(ctx, x, y, (e.big ? 10 : 6) * (1 - f), `rgba(255,255,255,${1 - f})`);
      break;
    }
    case 'block':
      ctx.strokeStyle = `rgba(120,200,255,${1 - f})`;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(x, y, 8 + f * 16, 0, Math.PI * 2);
      ctx.stroke();
      break;
    case 'dust':
      for (let i = 0; i < 5; i++) circle(ctx, x + (i - 2) * 9 * (1 + f), y - f * 8, (e.big ? 9 : 6) * (1 - f * 0.6), `rgba(220,200,170,${0.6 * (1 - f)})`);
      break;
    case 'clash':
      circle(ctx, x, y, 18 * f + 4, `rgba(255,255,255,${1 - f})`);
      break;
    case 'super':
      break;
  }
}

/* ------------------------------------------------------------------- HUD */
function bars(ctx: CanvasRenderingContext2D, s: State) {
  const b = s.battle;
  const bw = 190;
  const top = 12;
  for (const side of [0, 1] as const) {
    const f = b.f[side];
    const x0 = side === 0 ? 14 : W - 14 - bw;
    fillRound(ctx, x0 - 2, top - 2, bw + 4, 14, 4, 'rgba(0,0,0,0.55)');
    const frac = Math.max(0, f.hp / f.def.hp);
    const shown = Math.max(0, s.shownHp[side] / f.def.hp);
    // Bars drain toward the outside edges.
    const drawFill = (fr: number, color: string) => {
      const w = bw * fr;
      ctx.fillStyle = color;
      if (side === 0) ctx.fillRect(x0 + bw - w, top, w, 10);
      else ctx.fillRect(x0, top, w, 10);
    };
    drawFill(shown, '#d9452f');
    drawFill(frac, frac > 0.3 ? '#f2c230' : '#f27a30');
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillRect(x0, top, bw, 3);
    const name = f.def.name.toUpperCase();
    text(ctx, name, side === 0 ? x0 : x0 + bw, top + 21, { size: 10, align: side === 0 ? 'left' : 'right', weight: 800 });
    // Round wins.
    for (let i = 0; i < 2; i++) {
      const cx = side === 0 ? x0 + bw - 6 - i * 13 : x0 + 6 + i * 13;
      circle(ctx, cx, top + 21, 4.5, 'rgba(0,0,0,0.5)');
      if (i < f.wins) circle(ctx, cx, top + 21, 3.5, '#ffd34a');
    }
    // Super meter.
    const mw = 110;
    const mx = side === 0 ? 14 : W - 14 - mw;
    const my = H - 14;
    fillRound(ctx, mx - 2, my - 2, mw + 4, 10, 3, 'rgba(0,0,0,0.55)');
    const full = f.meter >= METER_MAX;
    ctx.fillStyle = full ? (Math.floor(s.time * 6) % 2 ? '#ffe680' : '#ffb000') : '#4aa3ff';
    const mwid = (mw * f.meter) / METER_MAX;
    if (side === 0) ctx.fillRect(mx, my, mwid, 6);
    else ctx.fillRect(mx + mw - mwid, my, mwid, 6);
    if (full) text(ctx, 'SUPER!', side === 0 ? mx + mw + 8 : mx - 8, my + 3, { size: 9, color: '#ffe680', align: side === 0 ? 'left' : 'right', weight: 900 });
  }
  // Timer.
  fillRound(ctx, W / 2 - 18, 6, 36, 26, 6, 'rgba(0,0,0,0.55)');
  const secs = Math.ceil(b.timer / 60);
  text(ctx, String(secs), W / 2, 20, { size: 16, color: secs <= 10 ? '#ff7a5a' : '#ffffff', weight: 900 });
}

function banners(ctx: CanvasRenderingContext2D, s: State) {
  const b = s.battle;
  for (const t of b.texts) {
    if (t.side === -1) {
      const a = Math.min(1, (70 - t.t) / 15);
      const sc = 1 + Math.max(0, (8 - t.t) / 16);
      ctx.globalAlpha = a;
      text(ctx, t.text, W / 2 + 2, 102, { size: 30 * sc, color: 'rgba(0,0,0,0.5)', weight: 900 });
      text(ctx, t.text, W / 2, 100, { size: 30 * sc, color: '#ffe27a', weight: 900 });
    } else {
      ctx.globalAlpha = Math.min(1, (70 - t.t) / 12);
      const x = t.side === 0 ? 20 : W - 20;
      text(ctx, t.text, x, 66, { size: 15, color: '#ffffff', align: t.side === 0 ? 'left' : 'right', weight: 900 });
    }
  }
  ctx.globalAlpha = 1;
  if (b.phase === 'ko' || b.phase === 'over') {
    const label = b.koBy === 'time' ? (b.winner === 2 ? 'DRAW' : 'TIME') : b.koBy === 'perfect' ? 'PERFECT' : 'K.O.';
    const k = Math.min(1, b.phaseT / 10);
    text(ctx, label, W / 2 + 3, 113, { size: 46 * (2 - k), color: 'rgba(0,0,0,0.5)', weight: 900 });
    text(ctx, label, W / 2, 110, { size: 46 * (2 - k), color: '#ff5a3c', weight: 900 });
  }
  if (s.phase === 'matchEnd') {
    const w = s.matchWinner;
    const msg = w < 0 ? 'DRAW GAME' : `${b.f[w].def.name.toUpperCase()} WINS`;
    fillRound(ctx, W / 2 - 120, 134, 240, 34, 10, 'rgba(0,0,0,0.6)');
    text(ctx, msg, W / 2, 151, { size: 20, color: '#ffffff', weight: 900 });
  }
  s.bonus.forEach((bn, i) => {
    ctx.globalAlpha = Math.min(1, (150 - bn.t) / 20);
    text(ctx, bn.text, W / 2, 176 + i * 15, { size: 11, color: '#ffe27a', weight: 800 });
  });
  ctx.globalAlpha = 1;
}

function superFlash(ctx: CanvasRenderingContext2D, b: Battle) {
  const sf = b.superFlash;
  if (!sf) return;
  const f = b.f[sf.side];
  ctx.fillStyle = 'rgba(0,0,20,0.55)';
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = 'rgba(255,230,120,0.6)';
  ctx.lineWidth = 2;
  const cx = f.x;
  const cy = FLOOR_Y - f.y - 50;
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2 + sf.t * 0.05;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * 40, cy + Math.sin(a) * 40);
    ctx.lineTo(cx + Math.cos(a) * 300, cy + Math.sin(a) * 300);
    ctx.stroke();
  }
  const name = f.def.specials.super.name.toUpperCase();
  fillRound(ctx, W / 2 - 110, 200, 220, 26, 8, 'rgba(0,0,0,0.6)');
  text(ctx, name, W / 2, 213, { size: 14, color: '#ffe27a', weight: 900 });
}

/** The "next challenger" screen between arcade matches. */
function between(ctx: CanvasRenderingContext2D, s: State) {
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, '#1b1f3b');
  g.addColorStop(1, '#4b1d2e');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  const op = opponent(s);
  const k = Math.min(1, s.phaseT / 20);
  drawStanding(ctx, s.p1, 120 - (1 - k) * 80, 210, 1, 1.4, s.time);
  drawStanding(ctx, op, 360 + (1 - k) * 80, 210, -1, 1.4, s.time);
  text(ctx, 'VS', W / 2, 120, { size: 40, color: '#ffe27a', weight: 900 });
  const boss = op.id === 'oni';
  text(ctx, boss ? 'FINAL BATTLE' : `FIGHT ${s.rung + 1} OF ${s.ladder.length}`, W / 2, 30, { size: 13, color: boss ? '#ff6a5a' : '#ffffff', weight: 800 });
  text(ctx, op.name.toUpperCase(), 360, 232, { size: 15, weight: 900 });
  text(ctx, op.title, 360, 248, { size: 9, color: 'rgba(255,255,255,0.8)', weight: 600 });
  text(ctx, s.p1.name.toUpperCase(), 120, 232, { size: 15, weight: 900 });
  text(ctx, `“${op.quote}”`, W / 2, 58, { size: 10, color: 'rgba(255,255,255,0.85)', weight: 600 });
  text(ctx, `Stage: ${STAGES[s.battle.stage]}`, W / 2, 262, { size: 8, color: 'rgba(255,255,255,0.6)', weight: 600 });
}

export function render(ctx: CanvasRenderingContext2D, s: State) {
  if (s.phase === 'between') {
    between(ctx, s);
    return;
  }
  const b = s.battle;
  ctx.save();
  if (b.shake > 0) ctx.translate(Math.sin(b.frame * 2.3) * b.shake, Math.cos(b.frame * 1.7) * b.shake * 0.5);
  stage(ctx, b.stage, s.time);
  // The fighter attacking is drawn in front.
  const order = b.f[0].run && !b.f[1].run ? [b.f[1], b.f[0]] : [b.f[0], b.f[1]];
  for (const f of order) drawOne(ctx, f, b.frame, s.time);
  for (const p of b.projs) drawProj(ctx, p, s.time);
  for (const e of b.fx) drawFx(ctx, e);
  ctx.restore();
  superFlash(ctx, b);
  if (b.superFlash) {
    const f = b.f[b.superFlash.side];
    drawOne(ctx, f, b.frame, s.time);
  }
  bars(ctx, s);
  banners(ctx, s);
}
