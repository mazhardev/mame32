import { FORE, HEAD_R, SHIN, THIGH, TORSO, UPPER, solveLimb } from './pose';
import type { P2, Pose } from './pose';
import type { FighterDef, Style } from './fighters';

/**
 * Draws a fighter from a pose: limbs as thick rounded strokes with elbows
 * and knees solved by IK, a shaped torso, and a head with the fighter's
 * hair, face and accessories. All art is original and drawn on the canvas.
 */
export interface DrawOpts {
  /** Floor position on screen of the point between the feet. */
  x: number;
  floorY: number;
  /** Height above the floor (jumping), in screen pixels. */
  lift: number;
  face: 1 | -1;
  scale: number;
  /** 0–1 white flash when hit. */
  flash: number;
  alpha: number;
  /** Glow colour while using a special, if any. */
  glow?: string;
  time: number;
}

function mix(hex: string, to: string, t: number): string {
  if (t <= 0) return hex;
  const a = parseInt(hex.slice(1), 16);
  const b = parseInt(to.slice(1), 16);
  const ch = (s: number) => {
    const ca = (a >> s) & 255;
    const cb = (b >> s) & 255;
    return Math.round(ca + (cb - ca) * t);
  };
  return `#${((1 << 24) | (ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).slice(1)}`;
}

export function drawFighter(ctx: CanvasRenderingContext2D, def: FighterDef, p: Pose, o: DrawOpts) {
  const st = def.style;
  const k = o.scale;
  const tint = (c: string, dark = 0) => mix(dark ? mix(c, '#000000', dark) : c, '#ffffff', o.flash * 0.75);
  // Local (x forward, y up) → screen, rotated about the hips for tumbles.
  const cos = Math.cos(p.rot);
  const sin = Math.sin(p.rot);
  const [hx, hy] = p.hip;
  const S = (q: P2): P2 => {
    const dx = q[0] - hx;
    const dy = q[1] - hy;
    const rx = hx + dx * cos - dy * sin;
    const ry = hy + dx * sin + dy * cos;
    return [o.x + o.face * rx * k, o.floorY - o.lift - ry * k];
  };
  const up: P2 = [Math.sin(p.lean), Math.cos(p.lean)];
  const shoulder: P2 = [hx + up[0] * TORSO, hy + up[1] * TORSO];
  const neck: P2 = [hx + up[0] * (TORSO + 3), hy + up[1] * (TORSO + 3)];
  const head: P2 = [hx + up[0] * (TORSO + 3 + HEAD_R), hy + up[1] * (TORSO + 3 + HEAD_R)];
  const hipF: P2 = [hx + 2, hy];
  const hipB: P2 = [hx - 2, hy];
  const shF: P2 = [shoulder[0] + 3, shoulder[1] - 2];
  const shB: P2 = [shoulder[0] - 4, shoulder[1] - 1];

  ctx.save();
  ctx.globalAlpha = o.alpha;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const limb = (a: P2, b: P2, c: P2, w1: number, w2: number, c1: string, c2: string) => {
    const [pa, pb, pc] = [S(a), S(b), S(c)];
    ctx.strokeStyle = c1;
    ctx.lineWidth = w1 * k;
    ctx.beginPath();
    ctx.moveTo(pa[0], pa[1]);
    ctx.lineTo(pb[0], pb[1]);
    ctx.stroke();
    ctx.strokeStyle = c2;
    ctx.lineWidth = w2 * k;
    ctx.beginPath();
    ctx.moveTo(pb[0], pb[1]);
    ctx.lineTo(pc[0], pc[1]);
    ctx.stroke();
  };
  const dot = (q: P2, r: number, color: string) => {
    const [x, y] = S(q);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, r * k, 0, Math.PI * 2);
    ctx.fill();
  };

  if (o.glow) {
    const [gx, gy] = S([hx, hy + 18]);
    const g = ctx.createRadialGradient(gx, gy, 4, gx, gy, 60 * k);
    g.addColorStop(0, `${o.glow}88`);
    g.addColorStop(1, `${o.glow}00`);
    ctx.fillStyle = g;
    ctx.fillRect(gx - 60 * k, gy - 60 * k, 120 * k, 120 * k);
  }

  const sleeve = st.bare ? st.skin : st.top;
  const arm = (from: P2, hand: P2, dark: number) => {
    const [elbow, end] = solveLimb(from, hand, UPPER, FORE, -1);
    limb(from, elbow, end, 8.5, 7, tint(sleeve, dark), tint(st.skin, dark));
    dot(end, 5, tint(st.gloves, dark));
    return end;
  };
  const leg = (from: P2, foot: P2, dark: number) => {
    const [knee, end] = solveLimb(from, foot, THIGH, SHIN, 1);
    limb(from, knee, end, 11, 9, tint(st.pants, dark), tint(st.pants, dark));
    // Foot: a short stroke pointing forward.
    const [fx, fy] = S(end);
    ctx.strokeStyle = tint(st.bare || st.hairStyle === 'bald' ? st.skin : '#2a2420', dark);
    ctx.lineWidth = 5 * k;
    ctx.beginPath();
    ctx.moveTo(fx - o.face * 1 * k, fy);
    ctx.lineTo(fx + o.face * 7 * k, fy + 1 * k);
    ctx.stroke();
  };

  // Staff behind the body, held in both hands.
  let staffHands: [P2, P2] | null = null;

  // Back limbs first, darker.
  const handB = arm(shB, p.handB, 0.25);
  leg(hipB, p.footB, 0.22);

  // Torso.
  const side: P2 = [up[1], -up[0]];
  const quad = (pts: P2[], color: string) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    pts.forEach((q, i) => {
      const [x, y] = S(q);
      if (i) ctx.lineTo(x, y);
      else ctx.moveTo(x, y);
    });
    ctx.closePath();
    ctx.fill();
  };
  const w0 = 8;
  const w1 = 11;
  const torso: P2[] = [
    [hx - side[0] * w0, hy - side[1] * w0],
    [hx + side[0] * w0, hy + side[1] * w0],
    [shoulder[0] + side[0] * w1, shoulder[1] + side[1] * w1],
    [shoulder[0] - side[0] * w1, shoulder[1] - side[1] * w1],
  ];
  quad(torso, tint(st.bare ? st.skin : st.top));
  if (st.bare) {
    // Chest and abs lines.
    ctx.strokeStyle = tint(st.skin, 0.25);
    ctx.lineWidth = 1 * k;
    const c1 = S([hx + up[0] * 20 + side[0] * 2, hy + up[1] * 20 + side[1] * 2]);
    const c2 = S([hx + up[0] * 20 + side[0] * 9, hy + up[1] * 20 + side[1] * 9]);
    ctx.beginPath();
    ctx.moveTo(c1[0], c1[1]);
    ctx.lineTo(c2[0], c2[1]);
    ctx.stroke();
  } else if (!st.staff) {
    // The gi's crossed lapels.
    ctx.strokeStyle = tint(st.top, 0.3);
    ctx.lineWidth = 1.4 * k;
    const a = S([shoulder[0] + side[0] * 4, shoulder[1] + side[1] * 4]);
    const b = S([hx + up[0] * 10 - side[0] * 3, hy + up[1] * 10 - side[1] * 3]);
    ctx.beginPath();
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(b[0], b[1]);
    ctx.stroke();
  } else {
    // A monk's sash across the chest.
    ctx.strokeStyle = tint('#f2c94c');
    ctx.lineWidth = 3 * k;
    const a = S([shoulder[0] - side[0] * 8, shoulder[1] - side[1] * 8]);
    const b = S([hx + side[0] * 7, hy + side[1] * 7]);
    ctx.beginPath();
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(b[0], b[1]);
    ctx.stroke();
  }
  // Belt.
  quad(
    [
      [hx - side[0] * 8.5 + up[0] * 2, hy - side[1] * 8.5 + up[1] * 2],
      [hx + side[0] * 8.5 + up[0] * 2, hy + side[1] * 8.5 + up[1] * 2],
      [hx + side[0] * 8.8 + up[0] * 6, hy + side[1] * 8.8 + up[1] * 6],
      [hx - side[0] * 8.8 + up[0] * 6, hy - side[1] * 8.8 + up[1] * 6],
    ],
    tint(st.belt),
  );

  // Front leg, head, front arm.
  leg(hipF, p.footF, 0);
  drawHead(ctx, st, S, head, neck, up, side, o, tint, p.out ?? false);
  const handF = arm(shF, p.handF, 0);
  if (st.staff) staffHands = [handB, handF];
  if (staffHands) {
    const [a, b] = staffHands;
    let dx = b[0] - a[0];
    let dy = b[1] - a[1];
    const len = Math.hypot(dx, dy) || 1;
    dx /= len;
    dy /= len;
    if (len < 4) {
      dx = 0.3;
      dy = 0.95;
    }
    const s0 = S([a[0] - dx * 26, a[1] - dy * 26]);
    const s1 = S([b[0] + dx * 30, b[1] + dy * 30]);
    ctx.strokeStyle = tint('#8a5a2b');
    ctx.lineWidth = 3.5 * k;
    ctx.beginPath();
    ctx.moveTo(s0[0], s0[1]);
    ctx.lineTo(s1[0], s1[1]);
    ctx.stroke();
    dot([b[0] + dx * 30, b[1] + dy * 30], 2.2, tint('#c9a227'));
  }
  if (st.aura && o.glow) {
    for (const h of [handF, handB]) {
      const [x, y] = S(h);
      ctx.fillStyle = `${st.aura}aa`;
      ctx.beginPath();
      ctx.arc(x, y, (7 + Math.sin(o.time * 20) * 2) * k, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawHead(
  ctx: CanvasRenderingContext2D,
  st: Style,
  S: (q: P2) => P2,
  head: P2,
  neck: P2,
  up: P2,
  side: P2,
  o: DrawOpts,
  tint: (c: string, dark?: number) => string,
  out: boolean,
) {
  const k = o.scale;
  const [x, y] = S(head);
  const r = HEAD_R * k;
  const [nx, ny] = S(neck);
  ctx.strokeStyle = tint(st.skin, 0.1);
  ctx.lineWidth = 6 * k;
  ctx.beginPath();
  ctx.moveTo(nx, ny);
  ctx.lineTo(x, y);
  ctx.stroke();
  // Head tilt follows the torso.
  const ang = Math.atan2(-up[0] * o.face, up[1]);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);
  ctx.scale(o.face, 1);
  void side;
  const hair = tint(st.hair);
  // Hair behind the head.
  if (st.hairStyle === 'ponytail') {
    ctx.fillStyle = hair;
    ctx.beginPath();
    ctx.ellipse(-r * 1.1, -r * 0.1, r * 0.45, r * 0.75, 0.6 + Math.sin(o.time * 6) * 0.15, 0, Math.PI * 2);
    ctx.fill();
  } else if (st.hairStyle === 'long') {
    ctx.fillStyle = hair;
    ctx.beginPath();
    ctx.moveTo(-r * 0.9, -r * 0.6);
    ctx.quadraticCurveTo(-r * 1.9, r * 0.8, -r * 1.3, r * 2.1);
    ctx.lineTo(-r * 0.2, r * 0.6);
    ctx.closePath();
    ctx.fill();
  } else if (st.hairStyle === 'dreads') {
    ctx.strokeStyle = hair;
    ctx.lineWidth = 2.6 * k;
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.moveTo(-r * 0.3 - i * r * 0.15, -r * 0.6);
      ctx.quadraticCurveTo(-r * 1.2 - i * r * 0.1, r * 0.2, -r * 0.9 - i * r * 0.2, r * 1.4 + Math.sin(o.time * 5 + i) * r * 0.1);
      ctx.stroke();
    }
  }
  // Face.
  ctx.fillStyle = tint(st.skin);
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  // Hair on top.
  ctx.fillStyle = hair;
  switch (st.hairStyle) {
    case 'spiky':
      ctx.beginPath();
      ctx.moveTo(-r * 1.05, r * 0.05);
      for (let i = 0; i <= 5; i++) {
        const a = Math.PI * (1.05 + i * 0.19);
        ctx.lineTo(Math.cos(a) * r * 1.55, Math.sin(a) * r * 1.55);
        ctx.lineTo(Math.cos(a + 0.1) * r * 0.85, Math.sin(a + 0.1) * r * 0.85);
      }
      ctx.lineTo(r * 0.9, -r * 0.3);
      ctx.closePath();
      ctx.fill();
      break;
    case 'flame':
      ctx.beginPath();
      ctx.moveTo(-r, r * 0.1);
      for (let i = 0; i <= 4; i++) {
        const a = Math.PI * (1.1 + i * 0.2);
        const flick = Math.sin(o.time * 14 + i) * 0.15;
        ctx.lineTo(Math.cos(a) * r * (1.7 + flick), Math.sin(a) * r * (1.7 + flick) - r * 0.3);
        ctx.lineTo(Math.cos(a + 0.12) * r * 0.9, Math.sin(a + 0.12) * r * 0.9);
      }
      ctx.lineTo(r, -r * 0.2);
      ctx.closePath();
      ctx.fill();
      break;
    case 'ponytail':
    case 'short':
    case 'dreads':
    case 'long':
      ctx.beginPath();
      ctx.arc(0, -r * 0.05, r * 1.04, Math.PI * 1.02, Math.PI * 1.98);
      ctx.quadraticCurveTo(r * 0.2, -r * 0.55, -r * 1.02, -r * 0.05);
      ctx.fill();
      break;
    case 'mask':
      ctx.beginPath();
      ctx.arc(0, 0, r * 1.05, Math.PI * 0.95, Math.PI * 2.05);
      ctx.fill();
      // Mask over the lower face.
      ctx.fillRect(-r * 0.4, r * 0.1, r * 1.45, r * 0.75);
      ctx.beginPath();
      ctx.moveTo(-r * 0.9, -r * 0.4);
      ctx.lineTo(-r * 2, -r * 0.1 + Math.sin(o.time * 8) * r * 0.3);
      ctx.lineTo(-r * 0.9, r * 0.05);
      ctx.fill();
      break;
    case 'bald':
      ctx.fillStyle = 'rgba(255,255,255,0.22)';
      ctx.beginPath();
      ctx.arc(-r * 0.2, -r * 0.45, r * 0.35, 0, Math.PI * 2);
      ctx.fill();
      break;
  }
  if (st.headband) {
    ctx.fillStyle = tint(st.headband);
    ctx.fillRect(-r * 1.02, -r * 0.45, r * 2.04, r * 0.3);
    ctx.fillRect(-r * 1.7, -r * 0.35 + Math.sin(o.time * 7) * r * 0.15, r * 0.75, r * 0.2);
  }
  if (st.beard) {
    ctx.fillStyle = st.hairStyle === 'long' ? tint(st.hair) : tint(st.hair, 0.1);
    ctx.beginPath();
    ctx.moveTo(-r * 0.2, r * 0.35);
    ctx.quadraticCurveTo(r * 0.5, r * (st.hairStyle === 'long' ? 2 : 1.35), r * 1, r * 0.25);
    ctx.lineTo(r * 0.85, r * 0.55);
    ctx.closePath();
    ctx.fill();
  }
  // Eye and brow, looking forward.
  if (out) {
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 1.2 * k;
    ctx.beginPath();
    ctx.moveTo(r * 0.3, -r * 0.25);
    ctx.lineTo(r * 0.7, r * 0.05);
    ctx.moveTo(r * 0.7, -r * 0.25);
    ctx.lineTo(r * 0.3, r * 0.05);
    ctx.stroke();
  } else {
    ctx.fillStyle = st.eyes ?? '#1d1d1d';
    ctx.beginPath();
    ctx.ellipse(r * 0.55, -r * 0.1, r * 0.13, r * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = st.hairStyle === 'bald' || st.hairStyle === 'mask' ? '#3a2a20' : hair;
    ctx.lineWidth = 1.4 * k;
    ctx.beginPath();
    ctx.moveTo(r * 0.3, -r * 0.42);
    ctx.lineTo(r * 0.85, -r * 0.3);
    ctx.stroke();
    if (st.hairStyle !== 'mask' && !st.beard) {
      ctx.strokeStyle = tint(st.skin, 0.35);
      ctx.lineWidth = 1 * k;
      ctx.beginPath();
      ctx.moveTo(r * 0.45, r * 0.5);
      ctx.lineTo(r * 0.8, r * 0.45);
      ctx.stroke();
    }
  }
  ctx.restore();
}
