import { circle, fillRound, text } from '../_shared/arcade/draw';
import { COLS, PESTS, PLANTS, ROWS } from './data';
import type { PestId, PlantId } from './data';
import { BANK_Y, CARD_H, CARD_W, CELL_H, CELL_W, H, LAWN_X, LAWN_Y, PARKED, W, cardX, cellX, cellY } from './engine';
import type { Pest, Plant, State } from './engine';

/** Garden Guard drawing: the lawn, seed bank, plants, pests and sunlight. */
const LAWNS = [
  { a: '#6fbf4a', b: '#62b041', sky: '#a7dcf5', edge: '#4f8f33' },
  { a: '#9cc45a', b: '#8db84f', sky: '#f6d5a0', edge: '#6f8f3a' },
  { a: '#2f5e46', b: '#29543f', sky: '#1a2346', edge: '#1f4031' },
];

function lawn(ctx: CanvasRenderingContext2D, s: State) {
  const th = LAWNS[s.def.garden];
  ctx.fillStyle = th.sky;
  ctx.fillRect(0, 0, W, H);
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++) {
      ctx.fillStyle = (r + c) % 2 ? th.a : th.b;
      ctx.fillRect(LAWN_X + c * CELL_W, LAWN_Y + r * CELL_H, CELL_W, CELL_H);
    }
  // Path on the right where pests come from, the house wall on the left.
  ctx.fillStyle = s.def.garden === 2 ? '#3d3a35' : '#b49a6e';
  ctx.fillRect(LAWN_X + COLS * CELL_W, LAWN_Y, W - LAWN_X - COLS * CELL_W, CELL_H * ROWS);
  ctx.fillStyle = s.def.garden === 2 ? '#4a3b48' : '#d9c3a0';
  ctx.fillRect(0, LAWN_Y, 12, CELL_H * ROWS);
  ctx.fillStyle = th.edge;
  ctx.fillRect(12, LAWN_Y, LAWN_X - 12, CELL_H * ROWS);
  if (s.def.garden === 2) {
    circle(ctx, 450, 30, 0, '#fff');
    for (let i = 0; i < 10; i++) {
      const x = (i * 97 + s.time * 12) % W;
      const y = LAWN_Y + ((i * 53 + Math.sin(s.time + i) * 20) % (CELL_H * ROWS));
      circle(ctx, x, y, 1.6, `rgba(255,250,170,${0.4 + 0.4 * Math.sin(s.time * 3 + i)})`);
    }
  }
}

/* ------------------------------------------------------------------ plants */
function leaf(ctx: CanvasRenderingContext2D, x: number, y: number, a: number, color: string) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(a);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(6, 0, 7, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function face(ctx: CanvasRenderingContext2D, x: number, y: number, k = 1) {
  circle(ctx, x - 3 * k, y - 1 * k, 1.4 * k, '#2b2112');
  circle(ctx, x + 3 * k, y - 1 * k, 1.4 * k, '#2b2112');
  ctx.strokeStyle = '#2b2112';
  ctx.lineWidth = 1 * k;
  ctx.beginPath();
  ctx.arc(x, y + 1.5 * k, 2.5 * k, 0.2, Math.PI - 0.2);
  ctx.stroke();
}

export function drawPlant(ctx: CanvasRenderingContext2D, id: PlantId, x: number, y: number, t: number, p?: Plant) {
  const sway = Math.sin(t * 2 + x) * 1.5;
  const hurt = p && p.hurt > 0 ? 1 : 0;
  ctx.save();
  if (hurt) ctx.translate(Math.sin(t * 60) * 1.2, 0);
  switch (id) {
    case 'sunbloom': {
      ctx.strokeStyle = '#3f8a2a';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x, y + 18);
      ctx.lineTo(x + sway * 0.5, y + 2);
      ctx.stroke();
      leaf(ctx, x, y + 12, -0.5, '#4fa83a');
      leaf(ctx, x, y + 12, Math.PI + 0.5, '#4fa83a');
      const cx = x + sway;
      const cy = y - 4;
      const glow = p && p.t < 1.2 ? 1 - p.t / 1.2 : 0;
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2 + t * 0.3;
        ctx.fillStyle = glow ? '#fff3a0' : '#f7c531';
        ctx.beginPath();
        ctx.ellipse(cx + Math.cos(a) * 9, cy + Math.sin(a) * 9, 5, 3, a, 0, Math.PI * 2);
        ctx.fill();
      }
      circle(ctx, cx, cy, 7.5, '#a8692a');
      face(ctx, cx, cy, 0.9);
      break;
    }
    case 'spitter':
    case 'frost':
    case 'twin': {
      const body = id === 'frost' ? '#7fc8f0' : '#5cc04a';
      const dark = id === 'frost' ? '#3d8fc0' : '#3a8f2c';
      ctx.strokeStyle = dark;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x - 2, y + 18);
      ctx.lineTo(x - 2 + sway * 0.4, y);
      ctx.stroke();
      leaf(ctx, x - 2, y + 15, -0.4, dark);
      leaf(ctx, x - 2, y + 15, Math.PI + 0.4, dark);
      const heads = id === 'twin' ? [-6, 4] : [0];
      // A little recoil just after firing.
      const kick = p && p.t > 1.2 ? (p.t - 1.2) * 10 : 0;
      for (const dy of heads) {
        const hx = x + sway - kick;
        const hy = y - 4 + dy;
        circle(ctx, hx, hy, id === 'twin' ? 8 : 10, body);
        fillRound(ctx, hx + 5, hy - 4, 10, 8, 3, body);
        circle(ctx, hx + 15, hy, 3.5, dark);
        circle(ctx, hx + 1, hy - 3, 2, '#1d2a12');
        circle(ctx, hx + 1.6, hy - 3.6, 0.7, '#ffffff');
        if (id === 'frost') {
          ctx.strokeStyle = '#e6f8ff';
          ctx.lineWidth = 1;
          for (let k = 0; k < 3; k++) {
            ctx.beginPath();
            ctx.moveTo(hx - 6 + k * 3, hy - 9);
            ctx.lineTo(hx - 4 + k * 3, hy - 13);
            ctx.stroke();
          }
        }
      }
      break;
    }
    case 'shell': {
      const frac = p ? p.hp / PLANTS.shell.hp : 1;
      fillRound(ctx, x - 14, y - 14, 28, 32, 13, '#9a8f7b');
      fillRound(ctx, x - 11, y - 12, 18, 14, 7, '#b5ab96');
      face(ctx, x + 2, y + 2, 1.1);
      if (frac < 0.66) {
        ctx.strokeStyle = '#4d4537';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(x - 8, y - 12);
        ctx.lineTo(x - 3, y - 4);
        ctx.lineTo(x - 7, y + 4);
        if (frac < 0.33) {
          ctx.moveTo(x + 10, y - 8);
          ctx.lineTo(x + 5, y + 2);
          ctx.lineTo(x + 9, y + 12);
        }
        ctx.stroke();
      }
      break;
    }
    case 'popberry': {
      const swell = p ? 1 + Math.max(0, 1 - p.t) * 0.35 : 1;
      ctx.strokeStyle = '#3f8a2a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x - 6, y - 4);
      ctx.quadraticCurveTo(x, y - 18, x + 6, y - 4);
      ctx.stroke();
      circle(ctx, x - 6, y + 3, 9 * swell, '#d8322a');
      circle(ctx, x + 6, y + 3, 9 * swell, '#e8453c');
      circle(ctx, x - 8, y, 2.5, 'rgba(255,255,255,0.6)');
      circle(ctx, x + 4, y, 2.5, 'rgba(255,255,255,0.6)');
      break;
    }
    case 'mine': {
      const armed = p ? p.armed : true;
      ctx.fillStyle = '#7a5532';
      ctx.beginPath();
      ctx.ellipse(x, y + 12, 15, 7, 0, Math.PI, 0);
      ctx.fill();
      if (armed) {
        circle(ctx, x, y + 3, 7, '#a5794a');
        circle(ctx, x, y - 2, 2.5, Math.sin(t * 8) > 0 ? '#ff3b2f' : '#7a1d16');
      } else {
        ctx.fillStyle = '#5b3d22';
        ctx.fillRect(x - 1, y - 1, 2, 8);
      }
      break;
    }
  }
  ctx.restore();
}

/* ------------------------------------------------------------------- pests */
export function drawPest(ctx: CanvasRenderingContext2D, id: PestId, x: number, y: number, t: number, e?: Pest) {
  const walk = e && !e.eating ? Math.sin(t * 8) : 0;
  const chew = e && e.eating ? Math.sin(t * 14) : 0;
  const slow = e && e.slowT > 0;
  const flash = e && e.hurt > 0;
  ctx.save();
  ctx.translate(x, y);
  if (e && e.jumpT > 0) ctx.translate(0, -Math.sin((1 - e.jumpT / 0.6) * Math.PI) * 30);
  const tint = (c: string) => (flash ? '#ffffff' : slow ? mixBlue(c) : c);
  switch (id) {
    case 'snail': {
      fillRound(ctx, -14, 4, 30, 10, 5, tint('#c8a46a'));
      circle(ctx, 4, -2, 11, tint('#b5652e'));
      ctx.strokeStyle = tint('#7d3d14');
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let a = 0; a < 12; a += 0.4) ctx.lineTo(4 + Math.cos(a) * a * 0.75, -2 + Math.sin(a) * a * 0.75);
      ctx.stroke();
      // Head and eye stalks, facing left.
      ctx.strokeStyle = tint('#c8a46a');
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-12, 5);
      ctx.lineTo(-16, -6 + walk);
      ctx.moveTo(-10, 5);
      ctx.lineTo(-11, -7 - walk);
      ctx.stroke();
      circle(ctx, -16, -7 + walk, 2, '#222');
      circle(ctx, -11, -8 - walk, 2, '#222');
      if (chew) circle(ctx, -15, 9, 2 + chew, '#6b3d1f');
      break;
    }
    case 'helmet':
    case 'armor':
    case 'hopper': {
      const body = id === 'hopper' ? '#5aa83c' : '#3d4f8a';
      if (id === 'hopper') {
        ctx.strokeStyle = tint('#3f7a2a');
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(4, 2);
        ctx.lineTo(12, -10);
        ctx.lineTo(16, 14 + walk * 2);
        ctx.moveTo(-4, 4);
        ctx.lineTo(-8, 14 - walk * 2);
        ctx.stroke();
      } else {
        ctx.strokeStyle = tint('#1f2a4d');
        ctx.lineWidth = 1.5;
        for (const lx of [-8, -1, 6]) {
          ctx.beginPath();
          ctx.moveTo(lx, 6);
          ctx.lineTo(lx - 3 + walk * (lx % 2 ? 2 : -2), 14);
          ctx.stroke();
        }
      }
      ctx.fillStyle = tint(body);
      ctx.beginPath();
      ctx.ellipse(2, 0, 15, 9, 0, 0, Math.PI * 2);
      ctx.fill();
      circle(ctx, -13, -2 + chew, 7, tint(body));
      circle(ctx, -16, -4 + chew, 2, '#fff');
      circle(ctx, -16.5, -4 + chew, 1, '#111');
      // Antennae.
      ctx.strokeStyle = tint('#1f2a4d');
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-15, -8);
      ctx.lineTo(-20, -15);
      ctx.moveTo(-12, -8);
      ctx.lineTo(-13, -16);
      ctx.stroke();
      if (id === 'helmet' && (!e || e.hp > 200)) {
        ctx.fillStyle = tint('#8a5a2b');
        ctx.beginPath();
        ctx.ellipse(-12, -7, 8, 5, 0, Math.PI, 0);
        ctx.fill();
        ctx.fillStyle = tint('#6b4320');
        ctx.fillRect(-13, -15, 2, 4);
      }
      if (id === 'armor' && (!e || e.hp > 200)) {
        fillRound(ctx, -6, -16, 20, 16, 4, tint('#c0703a'));
        ctx.fillStyle = tint('#9a5228');
        ctx.fillRect(-7, -16, 22, 3);
      }
      break;
    }
    case 'boss': {
      ctx.fillStyle = tint('#4f8a3a');
      ctx.beginPath();
      ctx.ellipse(4, 0, 24, 18, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = tint('#9fcf6a');
      ctx.beginPath();
      ctx.ellipse(-2, 8, 14, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      circle(ctx, -14, -16, 7, tint('#4f8a3a'));
      circle(ctx, 2, -17, 7, tint('#4f8a3a'));
      circle(ctx, -14, -17, 4, '#f5e65a');
      circle(ctx, 2, -18, 4, '#f5e65a');
      circle(ctx, -15, -17, 2, '#111');
      circle(ctx, 1, -18, 2, '#111');
      ctx.strokeStyle = '#1f3a14';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-20, -2 + chew * 2);
      ctx.lineTo(-2, 0 + chew * 2);
      ctx.stroke();
      for (const [wx, wy] of [
        [10, -6],
        [16, 4],
        [0, -8],
      ])
        circle(ctx, wx, wy, 2.2, tint('#3d6e2c'));
      break;
    }
  }
  ctx.restore();
}

function mixBlue(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgb(${Math.round(r * 0.6 + 60)},${Math.round(g * 0.7 + 60)},${Math.min(255, Math.round(b * 0.6 + 140))})`;
}

function healthBar(ctx: CanvasRenderingContext2D, x: number, y: number, frac: number) {
  if (frac >= 1) return;
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(x - 12, y, 24, 3);
  ctx.fillStyle = frac > 0.5 ? '#7ddc4a' : frac > 0.25 ? '#f2c230' : '#e8453c';
  ctx.fillRect(x - 12, y, 24 * frac, 3);
}

/* -------------------------------------------------------------- bank, sun */
export function sunIcon(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, t: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(t);
  ctx.fillStyle = 'rgba(255,214,60,0.55)';
  for (let i = 0; i < 8; i++) {
    ctx.rotate(Math.PI / 4);
    ctx.beginPath();
    ctx.moveTo(r * 0.7, -r * 0.25);
    ctx.lineTo(r * 1.45, 0);
    ctx.lineTo(r * 0.7, r * 0.25);
    ctx.fill();
  }
  ctx.restore();
  const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, 1, x, y, r);
  g.addColorStop(0, '#fff7c0');
  g.addColorStop(1, '#f7b81c');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

function bank(ctx: CanvasRenderingContext2D, s: State) {
  fillRound(ctx, 0, 0, W, LAWN_Y - 2, 0, '#7a4f2a');
  ctx.fillStyle = '#5c3a1d';
  ctx.fillRect(0, LAWN_Y - 4, W, 2);
  fillRound(ctx, 4, BANK_Y, 60, CARD_H, 6, '#5c3a1d');
  sunIcon(ctx, 20, BANK_Y + CARD_H / 2, 9, s.time * 0.5);
  text(ctx, String(s.sun), 46, BANK_Y + CARD_H / 2, { size: 13, color: '#fff3c4', weight: 900 });
  const cards: (PlantId | 'shovel')[] = [...s.bank, 'shovel'];
  cards.forEach((id, i) => {
    const x = cardX(i);
    const sel = s.selected === id;
    fillRound(ctx, x, BANK_Y, CARD_W, CARD_H, 5, sel ? '#fff3c4' : '#efe2c2');
    if (id === 'shovel') {
      ctx.strokeStyle = '#6b6b6b';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x + 14, BANK_Y + 30);
      ctx.lineTo(x + 30, BANK_Y + 12);
      ctx.stroke();
      fillRound(ctx, x + 26, BANK_Y + 6, 10, 12, 3, '#9aa3ad');
      text(ctx, `${s.bank.length + 1}`, x + 6, BANK_Y + 8, { size: 7, color: '#7a5a3a', weight: 800 });
    } else {
      const def = PLANTS[id];
      ctx.save();
      ctx.beginPath();
      ctx.rect(x, BANK_Y, CARD_W, CARD_H - 11);
      ctx.clip();
      ctx.translate(x + CARD_W / 2, BANK_Y + 14);
      ctx.scale(0.62, 0.62);
      drawPlant(ctx, id, 0, 0, 0);
      ctx.restore();
      text(ctx, String(def.cost), x + CARD_W / 2, BANK_Y + CARD_H - 5, { size: 9, color: '#3b2a12', weight: 900 });
      text(ctx, `${i + 1}`, x + 6, BANK_Y + 8, { size: 7, color: '#7a5a3a', weight: 800 });
      const cool = s.cool[id] ?? 0;
      const broke = s.sun < def.cost;
      if (cool > 0) {
        const f = cool / def.recharge;
        ctx.fillStyle = 'rgba(0,0,0,0.45)';
        ctx.fillRect(x, BANK_Y, CARD_W, CARD_H * f);
      }
      if (broke) fillRound(ctx, x, BANK_Y, CARD_W, CARD_H, 5, 'rgba(60,40,20,0.35)');
    }
    if (sel) {
      ctx.strokeStyle = '#ffd34a';
      ctx.lineWidth = 2.5;
      ctx.strokeRect(x + 1, BANK_Y + 1, CARD_W - 2, CARD_H - 2);
    }
  });
}

/* ------------------------------------------------------------------ render */
export function render(ctx: CanvasRenderingContext2D, s: State) {
  lawn(ctx, s);
  // Planting preview and keyboard cursor.
  const target = s.hover ?? (s.selected ? s.cursor : null);
  if (target && s.selected && s.phase === 'play') {
    const x = LAWN_X + target.col * CELL_W;
    const y = LAWN_Y + target.row * CELL_H;
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    ctx.fillRect(x, y, CELL_W, CELL_H);
    if (s.selected !== 'shovel' && !s.plants.some((p) => p.row === target.row && p.col === target.col)) {
      ctx.globalAlpha = 0.45;
      drawPlant(ctx, s.selected, cellX(target.col), cellY(target.row), s.time);
      ctx.globalAlpha = 1;
    }
  }
  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([3, 3]);
  ctx.strokeRect(LAWN_X + s.cursor.col * CELL_W + 1, LAWN_Y + s.cursor.row * CELL_H + 1, CELL_W - 2, CELL_H - 2);
  ctx.setLineDash([]);

  // Rollers.
  for (let r = 0; r < ROWS; r++) {
    const x = s.rollers[r];
    if (x === null) continue;
    const y = cellY(r) + 10;
    const rx = x === PARKED ? LAWN_X - 14 : x;
    fillRound(ctx, rx - 10, y - 8, 20, 14, 6, '#c0392b');
    circle(ctx, rx - 5, y + 7, 4, '#333');
    circle(ctx, rx + 6, y + 7, 4, '#333');
    ctx.strokeStyle = '#7f8c8d';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(rx - 9, y - 6);
    ctx.lineTo(rx - 16, y - 16);
    ctx.stroke();
  }

  // Row by row, so things lower on the screen overlap the ones above.
  for (let r = 0; r < ROWS; r++) {
    for (const p of s.plants) if (p.row === r) drawPlant(ctx, p.id, cellX(p.col), cellY(p.row), s.time, p);
    for (const e of s.pests) {
      if (e.row !== r) continue;
      const y = cellY(r) + 4;
      drawPest(ctx, e.id, e.x, y, e.anim, e);
      healthBar(ctx, e.x, y - (e.id === 'boss' ? 34 : 22), e.hp / e.maxHp);
    }
    for (const sd of s.seeds) if (sd.row === r) circle(ctx, sd.x, cellY(r) - 4, 4, sd.frost ? '#bfe9ff' : '#7ddc4a');
  }
  for (const b of s.blasts) {
    const k = b.t / 0.6;
    const rad = (b.big ? 70 : 34) * (0.4 + k);
    circle(ctx, b.x, b.y, rad, `rgba(255,150,40,${0.7 * (1 - k)})`);
    circle(ctx, b.x, b.y, rad * 0.55, `rgba(255,240,180,${0.8 * (1 - k)})`);
  }
  for (const sun of s.suns) {
    if (sun.taken) {
      const k = Math.min(1, sun.t / 0.5);
      sunIcon(ctx, sun.x + (20 - sun.x) * k, sun.y + (BANK_Y + CARD_H / 2 - sun.y) * k, 10 * (1 - k * 0.4), s.time);
    } else {
      ctx.globalAlpha = sun.t > 10 ? Math.max(0, (12 - sun.t) / 2) : 1;
      sunIcon(ctx, sun.x, sun.y, 11, s.time);
      ctx.globalAlpha = 1;
    }
  }
  bank(ctx, s);
  // Wave progress along the bottom of the bank.
  const frac = s.wave / s.def.waves;
  fillRound(ctx, W - 92, LAWN_Y + CELL_H * ROWS - 12, 86, 8, 4, 'rgba(0,0,0,0.4)');
  fillRound(ctx, W - 91, LAWN_Y + CELL_H * ROWS - 11, 84 * frac, 6, 3, '#e8453c');
  if (s.banner) {
    const a = Math.min(1, (2.4 - s.banner.t) * 2, s.banner.t * 4);
    ctx.globalAlpha = Math.max(0, a);
    fillRound(ctx, W / 2 - 120, H / 2 - 18, 240, 36, 12, 'rgba(0,0,0,0.55)');
    text(ctx, s.banner.text, W / 2, H / 2, { size: 16, color: '#fff3c4', weight: 900 });
    ctx.globalAlpha = 1;
  }
  if (s.phase === 'won' || s.phase === 'lost') {
    fillRound(ctx, W / 2 - 130, H / 2 - 22, 260, 44, 12, 'rgba(0,0,0,0.6)');
    text(ctx, s.phase === 'won' ? 'The garden is safe!' : 'The pests got into the house!', W / 2, H / 2, { size: 15, color: '#fff3c4', weight: 900 });
  }
  void PESTS;
}
