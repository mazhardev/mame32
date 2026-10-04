import { createElement, useCallback, useEffect, useRef, useState } from 'react';
import type { Region } from './regions';
import { COLOR_PALETTE } from './regions';
import { downloadDataUrl } from './PixelGrid';

/**
 * A tap-to-fill colouring canvas built from SVG regions. Supports undo,
 * symmetry fill (whole group at once), keyboard selection and PNG export.
 */
export function ColorRegions({
  regions,
  viewBox,
  fills,
  onFill,
  symmetry,
  stroke = '#1f2937',
  strokeWidth = 1.2,
  title,
}: {
  regions: Region[];
  viewBox: string;
  fills: Record<string, string>;
  onFill: (ids: string[], color: string) => void;
  symmetry: boolean;
  stroke?: string;
  strokeWidth?: number;
  title: string;
}) {
  const [color, setColor] = useState(COLOR_PALETTE[0]);
  const [focus, setFocus] = useState(0);
  const svgRef = useRef<SVGSVGElement>(null);
  const paintable = regions.filter((r) => !r.fixed);

  const fill = useCallback(
    (r: Region) => {
      if (r.fixed) return;
      const ids =
        symmetry && r.group ? regions.filter((x) => x.group === r.group).map((x) => x.id) : [r.id];
      onFill(ids, color);
    },
    [color, onFill, regions, symmetry],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT') return;
      if (e.key === ']' || e.key === 'ArrowRight') setFocus((f) => (f + 1) % paintable.length);
      else if (e.key === '[' || e.key === 'ArrowLeft')
        setFocus((f) => (f + paintable.length - 1) % paintable.length);
      else if ((e.key === ' ' || e.key === 'Enter') && tag !== 'BUTTON') {
        e.preventDefault();
        const r = paintable[focus];
        if (r) fill(r);
      } else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [fill, focus, paintable]);

  const focused = paintable[focus];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <svg
        ref={svgRef}
        viewBox={viewBox}
        role="img"
        aria-label={title}
        style={{
          width: '100%',
          maxWidth: 560,
          margin: '0 auto',
          display: 'block',
          background: '#fff',
          borderRadius: 12,
          touchAction: 'manipulation',
        }}
      >
        {regions.map((r) =>
          createElement(r.shape, {
            key: r.id,
            ...r.attrs,
            fill: r.fixed ?? fills[r.id] ?? '#ffffff',
            stroke,
            strokeWidth,
            strokeLinejoin: 'round',
            style: { cursor: r.fixed ? 'default' : 'pointer' },
            onClick: () => fill(r),
          }),
        )}
        {focused &&
          createElement(focused.shape, {
            ...focused.attrs,
            fill: 'none',
            stroke: '#4f46e5',
            strokeWidth: strokeWidth * 2.5,
            strokeDasharray: '4 3',
            pointerEvents: 'none',
          })}
      </svg>
      <div className="cr-swatches" role="radiogroup" aria-label="Colours">
        {COLOR_PALETTE.map((c) => (
          <button
            key={c}
            type="button"
            className="cr-swatch"
            style={{ background: c }}
            aria-label={`Colour ${c}`}
            aria-pressed={color === c}
            onClick={() => setColor(c)}
          />
        ))}
      </div>
      <p className="small muted" style={{ margin: 0 }}>
        Tap a shape to fill it. Keyboard: ← → choose a shape, Space fills it.
      </p>
      <div className="cr-row">
        <button
          type="button"
          className="btn btn-sm"
          onClick={() => {
            const svg = svgRef.current;
            if (!svg) return;
            const [, , w, h] = viewBox.split(' ').map(Number);
            const data = new XMLSerializer().serializeToString(svg);
            const img = new Image();
            img.onload = () => {
              const c = document.createElement('canvas');
              c.width = w * 4;
              c.height = h * 4;
              const ctx = c.getContext('2d');
              if (!ctx) return;
              ctx.fillStyle = '#fff';
              ctx.fillRect(0, 0, c.width, c.height);
              ctx.drawImage(img, 0, 0, c.width, c.height);
              downloadDataUrl(
                c.toDataURL('image/png'),
                `${title.toLowerCase().replace(/\W+/g, '-')}.png`,
              );
            };
            img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(data)}`;
          }}
        >
          ⬇️ Download PNG
        </button>
      </div>
    </div>
  );
}

export function filledCount(regions: Region[], fills: Record<string, string>): number {
  return regions.filter((r) => !r.fixed && fills[r.id] && fills[r.id] !== '#ffffff').length;
}

export const paintableCount = (regions: Region[]) => regions.filter((r) => !r.fixed).length;
