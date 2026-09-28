/**
 * Original procedural landscapes for the jigsaw: every picture is painted on
 * a canvas from a seed (sky, sun or moon, layered hills, trees, a lake and
 * a few details), so no image files are needed and each puzzle is unique.
 */
import { createRng } from '@/utils/random';

export const THEMES = ['sunset', 'daylight', 'night', 'autumn'] as const;
export type Theme = (typeof THEMES)[number];

const PALETTES: Record<Theme, { sky: [string, string]; hills: string[]; sun: string; water: string; tree: string }> = {
  sunset: { sky: ['#f97316', '#fde68a'], hills: ['#7c2d12', '#9a3412', '#c2410c', '#ea580c'], sun: '#fef3c7', water: '#fb923c', tree: '#431407' },
  daylight: { sky: ['#38bdf8', '#e0f2fe'], hills: ['#166534', '#15803d', '#16a34a', '#4ade80'], sun: '#fde047', water: '#0ea5e9', tree: '#14532d' },
  night: { sky: ['#0f172a', '#3730a3'], hills: ['#020617', '#0f172a', '#1e1b4b', '#312e81'], sun: '#f8fafc', water: '#1e40af', tree: '#020617' },
  autumn: { sky: ['#a5b4fc', '#fef9c3'], hills: ['#78350f', '#b45309', '#d97706', '#f59e0b'], sun: '#fff7ed', water: '#60a5fa', tree: '#7c2d12' },
};

export function paintLandscape(ctx: CanvasRenderingContext2D, w: number, h: number, seed: string): Theme {
  const rng = createRng(seed);
  const theme = THEMES[rng.int(0, THEMES.length)];
  const pal = PALETTES[theme];

  const sky = ctx.createLinearGradient(0, 0, 0, h * 0.7);
  sky.addColorStop(0, pal.sky[0]);
  sky.addColorStop(1, pal.sky[1]);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  if (theme === 'night') {
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    for (let i = 0; i < 90; i++) {
      const r = rng.range(0.5, 1.8);
      ctx.beginPath();
      ctx.arc(rng.range(0, w), rng.range(0, h * 0.55), r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Sun or moon with a soft glow.
  const sx = rng.range(w * 0.15, w * 0.85);
  const sy = rng.range(h * 0.12, h * 0.32);
  const sr = rng.range(h * 0.06, h * 0.1);
  const glow = ctx.createRadialGradient(sx, sy, sr * 0.5, sx, sy, sr * 3.5);
  glow.addColorStop(0, 'rgba(255,255,255,0.55)');
  glow.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = pal.sun;
  ctx.beginPath();
  ctx.arc(sx, sy, sr, 0, Math.PI * 2);
  ctx.fill();

  // Clouds.
  if (theme !== 'night') {
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    for (let c = 0; c < rng.int(2, 5); c++) {
      const cx = rng.range(0, w);
      const cy = rng.range(h * 0.08, h * 0.35);
      for (let k = 0; k < 5; k++) {
        ctx.beginPath();
        ctx.ellipse(cx + k * w * 0.025, cy + rng.range(-6, 6), w * 0.04, h * 0.03, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // Layered hills, each a smooth random ridge.
  pal.hills.forEach((color, layer) => {
    const base = h * (0.45 + layer * 0.1);
    const amp = h * (0.12 - layer * 0.02);
    const phase = rng.range(0, Math.PI * 2);
    const freq = rng.range(1.2, 3);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, h);
    for (let x = 0; x <= w; x += 4) {
      const y = base - Math.sin((x / w) * Math.PI * freq + phase) * amp - Math.sin((x / w) * 11 + phase) * amp * 0.15;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fill();

    // Trees along the ridge of the nearer hills.
    if (layer >= 2) {
      ctx.fillStyle = pal.tree;
      for (let t = 0; t < rng.int(3, 8); t++) {
        const x = rng.range(0, w);
        const y = base - Math.sin((x / w) * Math.PI * freq + phase) * amp;
        const th = rng.range(h * 0.05, h * 0.1);
        ctx.beginPath();
        ctx.moveTo(x, y - th);
        ctx.lineTo(x - th * 0.35, y + 2);
        ctx.lineTo(x + th * 0.35, y + 2);
        ctx.closePath();
        ctx.fill();
      }
    }
  });

  // A lake with sun reflection.
  const lakeY = h * 0.82;
  ctx.fillStyle = pal.water;
  ctx.beginPath();
  ctx.ellipse(rng.range(w * 0.3, w * 0.7), lakeY, w * rng.range(0.25, 0.4), h * 0.07, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  for (let k = 0; k < 6; k++) ctx.fillRect(sx - 20 + rng.range(-10, 10), lakeY - 10 + k * 5, rng.range(20, 50), 2);

  // Flowers or fireflies in the foreground.
  for (let i = 0; i < 40; i++) {
    ctx.fillStyle = theme === 'night' ? 'rgba(253,224,71,0.8)' : ['#f472b6', '#fde047', '#f8fafc', '#a78bfa'][i % 4];
    ctx.beginPath();
    ctx.arc(rng.range(0, w), rng.range(h * 0.88, h), rng.range(1.5, 3.5), 0, Math.PI * 2);
    ctx.fill();
  }
  return theme;
}
