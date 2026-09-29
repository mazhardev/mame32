/** Small canvas drawing helpers shared by the arcade games. */

export function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

export function fillRound(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, color: string) {
  roundRect(ctx, x, y, w, h, r);
  ctx.fillStyle = color;
  ctx.fill();
}

export function circle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string) {
  ctx.beginPath();
  ctx.arc(x, y, Math.max(0, r), 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
}

export function text(
  ctx: CanvasRenderingContext2D,
  str: string,
  x: number,
  y: number,
  opts: { size?: number; color?: string; align?: CanvasTextAlign; weight?: number; baseline?: CanvasTextBaseline } = {},
) {
  ctx.font = `${opts.weight ?? 700} ${opts.size ?? 16}px Inter, system-ui, sans-serif`;
  ctx.fillStyle = opts.color ?? '#fff';
  ctx.textAlign = opts.align ?? 'center';
  ctx.textBaseline = opts.baseline ?? 'middle';
  ctx.fillText(str, x, y);
}

/** Deterministic twinkling star field; `offset` scrolls it vertically. */
export function starfield(ctx: CanvasRenderingContext2D, w: number, h: number, offset = 0, count = 70) {
  for (let i = 0; i < count; i++) {
    const x = (i * 97.13) % w;
    const layer = (i % 3) + 1;
    const y = (((i * 61.7) % h) + offset * layer * 0.5) % h;
    ctx.globalAlpha = 0.3 + layer * 0.2;
    ctx.fillStyle = '#fff';
    ctx.fillRect(x, y, layer * 0.8, layer * 0.8);
  }
  ctx.globalAlpha = 1;
}

export function gradientBg(ctx: CanvasRenderingContext2D, w: number, h: number, top: string, bottom: string) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, top);
  g.addColorStop(1, bottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

/** Simple spark particles kept inside a game's state. */
export interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
}

export function burst(list: Spark[], x: number, y: number, color: string, n = 12, speed = 160, random = Math.random) {
  for (let i = 0; i < n; i++) {
    const a = random() * Math.PI * 2;
    const v = speed * (0.4 + random() * 0.8);
    list.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0.5 + random() * 0.4, color });
  }
}

export function updateSparks(list: Spark[], dt: number, gravity = 0) {
  for (let i = list.length - 1; i >= 0; i--) {
    const p = list[i];
    p.life -= dt;
    if (p.life <= 0) {
      list.splice(i, 1);
      continue;
    }
    p.vy += gravity * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
  }
}

export function drawSparks(ctx: CanvasRenderingContext2D, list: Spark[]) {
  for (const p of list) {
    ctx.globalAlpha = Math.min(1, p.life * 2);
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x - 1.5, p.y - 1.5, 3, 3);
  }
  ctx.globalAlpha = 1;
}
