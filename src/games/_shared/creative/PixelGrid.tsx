import { useCallback, useEffect, useRef } from 'react';

/**
 * A square grid of cells drawn on a canvas, painted with mouse, touch or pen
 * (drag to paint several cells). Keeps its pixels sharp on high-DPI screens.
 */
export function PixelGrid({
  size,
  colors,
  onPaint,
  onStrokeEnd,
  labels,
  highlight,
  ghost,
  cursor,
  grid = true,
  ariaLabel,
}: {
  size: number;
  colors: (string | null)[];
  onPaint: (index: number, first: boolean) => void;
  onStrokeEnd?: () => void;
  labels?: (index: number) => string | null;
  highlight?: (index: number) => boolean;
  ghost?: (index: number) => string | null;
  cursor?: number | null;
  grid?: boolean;
  ariaLabel: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const painting = useRef(false);
  const last = useRef(-1);

  const draw = useCallback(() => {
    const c = ref.current;
    if (!c) return;
    const css = c.clientWidth || 320;
    const dpr = window.devicePixelRatio || 1;
    if (c.width !== Math.round(css * dpr)) {
      c.width = Math.round(css * dpr);
      c.height = Math.round(css * dpr);
    }
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const cell = css / size;
    for (let i = 0; i < size * size; i++) {
      const x = (i % size) * cell;
      const y = Math.floor(i / size) * cell;
      const col = colors[i];
      // Checkerboard for empty cells, like an image editor.
      ctx.fillStyle = col ?? (((i % size) + Math.floor(i / size)) % 2 ? '#e5e7eb' : '#f8fafc');
      ctx.fillRect(x, y, cell + 0.5, cell + 0.5);
      if (!col && ghost) {
        const g = ghost(i);
        if (g) {
          ctx.globalAlpha = 0.28;
          ctx.fillStyle = g;
          ctx.fillRect(x, y, cell + 0.5, cell + 0.5);
          ctx.globalAlpha = 1;
        }
      }
      if (highlight?.(i)) {
        ctx.fillStyle = 'rgba(250,204,21,0.45)';
        ctx.fillRect(x, y, cell, cell);
      }
      const label = labels?.(i);
      if (label && !col) {
        ctx.fillStyle = '#334155';
        ctx.font = `600 ${Math.max(7, cell * 0.5)}px Inter, system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, x + cell / 2, y + cell / 2 + 0.5);
      }
    }
    if (grid) {
      ctx.strokeStyle = 'rgba(15,23,42,0.12)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let k = 0; k <= size; k++) {
        ctx.moveTo(k * cell, 0);
        ctx.lineTo(k * cell, css);
        ctx.moveTo(0, k * cell);
        ctx.lineTo(css, k * cell);
      }
      ctx.stroke();
    }
    if (cursor !== null && cursor !== undefined && cursor >= 0) {
      ctx.strokeStyle = '#4f46e5';
      ctx.lineWidth = 2.5;
      ctx.strokeRect(
        (cursor % size) * cell + 1,
        Math.floor(cursor / size) * cell + 1,
        cell - 2,
        cell - 2,
      );
    }
  }, [colors, cursor, ghost, grid, highlight, labels, size]);

  useEffect(() => {
    draw();
    const onResize = () => draw();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [draw]);

  const indexAt = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const x = Math.floor(((e.clientX - r.left) / r.width) * size);
    const y = Math.floor(((e.clientY - r.top) / r.height) * size);
    if (x < 0 || y < 0 || x >= size || y >= size) return -1;
    return y * size + x;
  };

  return (
    <canvas
      ref={ref}
      role="img"
      aria-label={ariaLabel}
      style={{
        width: '100%',
        maxWidth: 520,
        aspectRatio: '1',
        touchAction: 'none',
        borderRadius: 8,
        display: 'block',
        margin: '0 auto',
        cursor: 'crosshair',
      }}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        painting.current = true;
        const i = indexAt(e);
        last.current = i;
        if (i >= 0) onPaint(i, true);
      }}
      onPointerMove={(e) => {
        if (!painting.current) return;
        const i = indexAt(e);
        if (i >= 0 && i !== last.current) {
          last.current = i;
          onPaint(i, false);
        }
      }}
      onPointerUp={() => {
        painting.current = false;
        last.current = -1;
        onStrokeEnd?.();
      }}
      onPointerCancel={() => {
        painting.current = false;
      }}
    />
  );
}

/** Flood fill on a square grid; returns the new colours. */
export function floodFill(
  colors: (string | null)[],
  size: number,
  start: number,
  color: string | null,
): (string | null)[] {
  const target = colors[start];
  if (target === color) return colors;
  const out = [...colors];
  const stack = [start];
  while (stack.length) {
    const i = stack.pop() as number;
    if (out[i] !== target) continue;
    out[i] = color;
    const x = i % size;
    const y = Math.floor(i / size);
    if (x > 0) stack.push(i - 1);
    if (x < size - 1) stack.push(i + 1);
    if (y > 0) stack.push(i - size);
    if (y < size - 1) stack.push(i + size);
  }
  return out;
}

/** Renders colours to a PNG data URL at `scale` pixels per cell. */
export function toPng(colors: (string | null)[], size: number, scale = 16): string {
  const c = document.createElement('canvas');
  c.width = size * scale;
  c.height = size * scale;
  const ctx = c.getContext('2d');
  if (!ctx) return '';
  colors.forEach((col, i) => {
    if (!col) return;
    ctx.fillStyle = col;
    ctx.fillRect((i % size) * scale, Math.floor(i / size) * scale, scale, scale);
  });
  return c.toDataURL('image/png');
}

export function downloadDataUrl(url: string, name: string) {
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
}
