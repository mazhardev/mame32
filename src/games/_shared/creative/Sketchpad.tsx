import { useCallback, useEffect, useRef } from 'react';

/** A freehand stroke in canvas units (0–1000 on both axes). */
export interface InkStroke {
  color: string;
  width: number;
  pts: [number, number][];
}

export const UNITS = 1000;

/**
 * A square freehand drawing surface. Strokes are kept in a resolution-free
 * 0–1000 space so they can be scored, replayed or resized.
 */
export function Sketchpad({
  strokes,
  onChange,
  color,
  width,
  disabled,
  overlay,
  ariaLabel,
  onStrokeEnd,
}: {
  strokes: InkStroke[];
  onChange: (s: InkStroke[]) => void;
  color: string;
  width: number;
  disabled?: boolean;
  overlay?: (ctx: CanvasRenderingContext2D, scale: number) => void;
  ariaLabel: string;
  onStrokeEnd?: (s: InkStroke[]) => void;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const drawing = useRef<InkStroke | null>(null);
  const strokesRef = useRef(strokes);
  strokesRef.current = strokes;

  const paint = useCallback(() => {
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
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, css, css);
    const k = css / UNITS;
    overlay?.(ctx, k);
    const all = drawing.current ? [...strokesRef.current, drawing.current] : strokesRef.current;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const s of all) {
      ctx.strokeStyle = s.color;
      ctx.lineWidth = s.width * k;
      ctx.beginPath();
      s.pts.forEach(([x, y], i) => (i ? ctx.lineTo(x * k, y * k) : ctx.moveTo(x * k, y * k)));
      if (s.pts.length === 1) ctx.lineTo(s.pts[0][0] * k + 0.1, s.pts[0][1] * k);
      ctx.stroke();
    }
  }, [overlay]);

  useEffect(() => {
    paint();
    const onResize = () => paint();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [paint, strokes]);

  const point = (e: React.PointerEvent<HTMLCanvasElement>): [number, number] => {
    const r = e.currentTarget.getBoundingClientRect();
    return [
      Math.round(((e.clientX - r.left) / r.width) * UNITS),
      Math.round(((e.clientY - r.top) / r.height) * UNITS),
    ];
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
        display: 'block',
        margin: '0 auto',
        borderRadius: 12,
        boxShadow: 'inset 0 0 0 2px var(--border)',
        touchAction: 'none',
        cursor: disabled ? 'default' : 'crosshair',
        background: '#fff',
      }}
      onPointerDown={(e) => {
        if (disabled) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        drawing.current = { color, width, pts: [point(e)] };
        paint();
      }}
      onPointerMove={(e) => {
        if (!drawing.current) return;
        const p = point(e);
        const last = drawing.current.pts[drawing.current.pts.length - 1];
        if (Math.hypot(p[0] - last[0], p[1] - last[1]) < 4) return;
        drawing.current.pts.push(p);
        paint();
      }}
      onPointerUp={() => {
        if (!drawing.current) return;
        const next = [...strokesRef.current, drawing.current];
        drawing.current = null;
        onChange(next);
        onStrokeEnd?.(next);
      }}
      onPointerCancel={() => {
        drawing.current = null;
        paint();
      }}
    />
  );
}
