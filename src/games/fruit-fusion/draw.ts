import { circle, fillRound, text } from '../_shared/arcade/draw';
import { DROP_Y, FRUITS, H, JAR, LINE_Y, W, radius } from './engine';
import type { State } from './engine';

/** One fruit: a shaded ball with a few details so each kind is easy to tell apart. */
export function drawFruit(ctx: CanvasRenderingContext2D, tier: number, x: number, y: number, alpha = 1) {
  const f = FRUITS[tier];
  const r = f.r;
  ctx.globalAlpha = alpha;
  const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.18, f.color);
  g.addColorStop(1, shade(f.color, -0.28));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.18)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Details per kind.
  if (tier === 1) {
    // Strawberry seeds.
    ctx.fillStyle = '#fde68a';
    for (let k = 0; k < 7; k++) circle(ctx, x + Math.cos(k * 2.4) * r * 0.5, y + Math.sin(k * 2.4) * r * 0.5 + r * 0.1, 1.4, '#fde68a');
  } else if (tier === 3 || tier === 4) {
    // Citrus segments.
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 1.2;
    for (let k = 0; k < 6; k++) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos((k * Math.PI) / 3) * r * 0.75, y + Math.sin((k * Math.PI) / 3) * r * 0.75);
      ctx.stroke();
    }
  } else if (tier === 8) {
    // Pineapple diamonds.
    ctx.strokeStyle = 'rgba(146,64,14,0.45)';
    ctx.lineWidth = 1.5;
    for (let k = -3; k <= 3; k++) {
      ctx.beginPath();
      ctx.moveTo(x + k * r * 0.3 - r, y - r);
      ctx.lineTo(x + k * r * 0.3 + r, y + r);
      ctx.moveTo(x + k * r * 0.3 + r, y - r);
      ctx.lineTo(x + k * r * 0.3 - r, y + r);
      ctx.stroke();
    }
  } else if (tier === 9 || tier === 10) {
    // Melon stripes.
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, r - 1, 0, Math.PI * 2);
    ctx.clip();
    ctx.strokeStyle = tier === 10 ? '#14532d' : 'rgba(21,128,61,0.55)';
    ctx.lineWidth = tier === 10 ? 6 : 3;
    for (let k = -2; k <= 2; k++) {
      ctx.beginPath();
      ctx.ellipse(x + k * r * 0.42, y, r * 0.12, r * 1.05, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }
  // Stem and leaf on top.
  if (tier !== 2 && tier !== 9 && tier !== 10) {
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = Math.max(1.5, r * 0.08);
    ctx.beginPath();
    ctx.moveTo(x, y - r * 0.85);
    ctx.lineTo(x + r * 0.08, y - r * 1.12);
    ctx.stroke();
    ctx.fillStyle = '#16a34a';
    ctx.beginPath();
    ctx.ellipse(x + r * 0.22, y - r * 1.02, r * 0.2, r * 0.09, -0.5, 0, Math.PI * 2);
    ctx.fill();
  } else if (tier === 2) {
    // Grapes: a bunch of small bumps.
    for (let k = 0; k < 6; k++) circle(ctx, x + Math.cos(k * 1.05) * r * 0.45, y + Math.sin(k * 1.05) * r * 0.45, r * 0.32, 'rgba(255,255,255,0.12)');
  }
  // A friendly face.
  ctx.fillStyle = 'rgba(15,23,42,0.75)';
  const e = Math.max(1.6, r * 0.09);
  circle(ctx, x - r * 0.28, y - r * 0.02, e, 'rgba(15,23,42,0.75)');
  circle(ctx, x + r * 0.28, y - r * 0.02, e, 'rgba(15,23,42,0.75)');
  ctx.strokeStyle = 'rgba(15,23,42,0.7)';
  ctx.lineWidth = Math.max(1.2, r * 0.06);
  ctx.beginPath();
  ctx.arc(x, y + r * 0.12, r * 0.18, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.stroke();
  ctx.globalAlpha = 1;
}

function shade(hex: string, k: number) {
  const n = parseInt(hex.slice(1), 16);
  const f = (c: number) => Math.round(Math.max(0, Math.min(255, c + c * k)));
  return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
}

export function render(ctx: CanvasRenderingContext2D, s: State) {
  ctx.fillStyle = '#fef3c7';
  ctx.fillRect(0, 0, W, H);
  // The jar.
  fillRound(ctx, JAR.left - 8, JAR.top - 6, JAR.right - JAR.left + 16, JAR.bottom - JAR.top + 14, 18, '#fde68a');
  fillRound(ctx, JAR.left, JAR.top, JAR.right - JAR.left, JAR.bottom - JAR.top, 12, '#fffbeb');
  // The danger line, redder as a fruit lingers above it.
  ctx.strokeStyle = s.danger > 0 ? `rgba(220,38,38,${0.4 + s.danger * 0.6})` : 'rgba(180,83,9,0.35)';
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 6]);
  ctx.beginPath();
  ctx.moveTo(JAR.left, LINE_Y);
  ctx.lineTo(JAR.right, LINE_Y);
  ctx.stroke();
  ctx.setLineDash([]);

  for (const f of s.fruits) drawFruit(ctx, f.tier, f.x, f.y);
  for (const p of s.pops) {
    ctx.globalAlpha = Math.max(0, p.t / 0.3);
    ctx.strokeStyle = p.color;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r * (1.3 - p.t), 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  // Dropper: a guide line and the fruit waiting to drop.
  if (!s.over) {
    const r = radius(s.current);
    ctx.strokeStyle = 'rgba(120,53,15,0.25)';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 6]);
    ctx.beginPath();
    ctx.moveTo(s.aimX, DROP_Y + r);
    ctx.lineTo(s.aimX, JAR.bottom);
    ctx.stroke();
    ctx.setLineDash([]);
    drawFruit(ctx, s.current, s.aimX, DROP_Y, s.cooldown > 0 ? 0.5 : 1);
  }
  // Next fruit, top right.
  text(ctx, 'NEXT', W - 34, 18, { size: 10, color: '#92400e', weight: 700 });
  ctx.save();
  ctx.translate(W - 34, 46);
  const k = Math.min(1, 18 / radius(s.next));
  ctx.scale(k, k);
  drawFruit(ctx, s.next, 0, 0);
  ctx.restore();
  text(ctx, s.score.toLocaleString(), 18, 26, { size: 22, color: '#78350f', align: 'left', weight: 800 });
}
