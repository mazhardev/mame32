import { useMemo, useRef, useState } from 'react';
import type { KeyboardEvent, PointerEvent as ReactPointerEvent } from 'react';
import { exitCells } from './engine';
import type { Candy, Piece } from './engine';
import type { View } from './usePlayer';

export const CANDY_COLORS = ['#f43f5e', '#fb923c', '#facc15', '#4ade80', '#38bdf8', '#c084fc'];
export const CANDY_NAMES = ['cherry drop', 'orange twist', 'lemon square', 'mint leaf', 'blueberry gem', 'grape heart'];
export const INGREDIENT_NAMES = ['hazelnut', 'cherry'];

/** Each flavour has its own shape as well as its colour. */
export function CandyShape({ color }: { color: number }) {
  const fill = CANDY_COLORS[color];
  const dark = `color-mix(in srgb, ${fill} 70%, #000)`;
  const body =
    color === 0 ? <circle cx="50" cy="52" r="36" fill={fill} stroke={dark} strokeWidth="3" />
    : color === 1 ? (
      <g stroke={dark} strokeWidth="3">
        <polygon points="8,50 26,34 26,66" fill={fill} />
        <polygon points="92,50 74,34 74,66" fill={fill} />
        <ellipse cx="50" cy="50" rx="28" ry="24" fill={fill} />
      </g>
    )
    : color === 2 ? <rect x="17" y="17" width="66" height="66" rx="18" fill={fill} stroke={dark} strokeWidth="3" />
    : color === 3 ? <path d="M50 9 C 86 30, 86 70, 50 91 C 14 70, 14 30, 50 9 Z" fill={fill} stroke={dark} strokeWidth="3" />
    : color === 4 ? <polygon points="50,11 87,39 73,87 27,87 13,39" fill={fill} stroke={dark} strokeWidth="3" strokeLinejoin="round" />
    : (
      <path
        d="M50 87 L15 51 C 3 35, 17 11, 36 17 C 44 20, 48 26, 50 31 C 52 26, 56 20, 64 17 C 83 11, 97 35, 85 51 Z"
        fill={fill}
        stroke={dark}
        strokeWidth="3"
        strokeLinejoin="round"
      />
    );
  return (
    <g>
      {body}
      <ellipse cx="38" cy="35" rx="11" ry="6" fill="rgba(255,255,255,0.65)" transform="rotate(-25 38 35)" />
    </g>
  );
}

const WEDGES = ['#ef4444', '#f59e0b', '#84cc16', '#06b6d4', '#6366f1', '#d946ef'];
function wedge(k: number): string {
  const a0 = (k / 6) * Math.PI * 2 - Math.PI / 2;
  const a1 = ((k + 1) / 6) * Math.PI * 2 - Math.PI / 2;
  const p = (a: number) => `${50 + 38 * Math.cos(a)} ${50 + 38 * Math.sin(a)}`;
  return `M50 50 L${p(a0)} A38 38 0 0 1 ${p(a1)} Z`;
}

export function RainbowFace() {
  return (
    <g className="cm-rainbow">
      {WEDGES.map((c, k) => (
        <path key={k} d={wedge(k)} fill={c} />
      ))}
      <circle cx="50" cy="50" r="38" fill="none" stroke="#fff" strokeWidth="4" />
      <circle cx="50" cy="50" r="13" fill="#fff" />
      <circle cx="50" cy="50" r="6" fill="#fde68a" />
    </g>
  );
}

export function IngredientFace({ type }: { type: number }) {
  if (type === 1) {
    return (
      <g>
        <path d="M50 14 C 48 34, 38 44, 34 54 M50 14 C 56 34, 64 42, 68 54" stroke="#15803d" strokeWidth="5" fill="none" strokeLinecap="round" />
        <path d="M50 14 C 62 8, 74 12, 78 20 C 66 22, 58 20, 50 14 Z" fill="#22c55e" />
        <circle cx="33" cy="65" r="20" fill="#dc2626" stroke="#7f1d1d" strokeWidth="3" />
        <circle cx="68" cy="65" r="20" fill="#dc2626" stroke="#7f1d1d" strokeWidth="3" />
        <circle cx="27" cy="58" r="5" fill="rgba(255,255,255,0.7)" />
        <circle cx="62" cy="58" r="5" fill="rgba(255,255,255,0.7)" />
      </g>
    );
  }
  return (
    <g>
      <path d="M18 56 C 18 30, 82 30, 82 56 C 82 80, 64 92, 50 92 C 36 92, 18 80, 18 56 Z" fill="#a16207" stroke="#713f12" strokeWidth="3" />
      <path d="M14 52 C 16 26, 84 26, 86 52 C 70 44, 30 44, 14 52 Z" fill="#78350f" />
      <path d="M50 30 L50 14" stroke="#713f12" strokeWidth="5" strokeLinecap="round" />
      <ellipse cx="36" cy="64" rx="7" ry="11" fill="rgba(255,255,255,0.3)" />
    </g>
  );
}

function PieceFace({ piece }: { piece: Piece }) {
  if (piece.kind === 'ingredient') return <IngredientFace type={piece.type} />;
  if (piece.special === 'rainbow') return <RainbowFace />;
  return (
    <g>
      {piece.special === 'wrap' && (
        <g className="cm-wrapper" fill={CANDY_COLORS[piece.color]} stroke="#fff" strokeWidth="3" strokeLinejoin="round">
          <polygon points="50,2 60,18 40,18" />
          <polygon points="50,98 60,82 40,82" />
          <polygon points="2,50 18,40 18,60" />
          <polygon points="98,50 82,40 82,60" />
        </g>
      )}
      <CandyShape color={piece.color} />
      {(piece.special === 'row' || piece.special === 'col') && (
        <g className="cm-stripes" transform={piece.special === 'col' ? 'rotate(90 50 50)' : undefined}>
          <rect x="16" y="35" width="68" height="8" rx="4" />
          <rect x="16" y="57" width="68" height="8" rx="4" />
        </g>
      )}
      {piece.special === 'wrap' && <circle cx="50" cy="50" r="41" fill="none" stroke="#fff" strokeWidth="4" strokeDasharray="7 5" />}
    </g>
  );
}

function describe(p: Piece | null): string {
  if (!p) return 'empty';
  if (p.kind === 'ingredient') return INGREDIENT_NAMES[p.type];
  const c = p as Candy;
  if (c.special === 'rainbow') return 'rainbow candy';
  const extra = c.special === 'wrap' ? ' wrapped' : c.special === 'none' ? '' : ' striped';
  return `${CANDY_NAMES[c.color]}${extra}`;
}

export type BoardMode = 'play' | 'hammer' | 'swap';

/**
 * The candy board. Pieces are absolutely positioned by cell and keyed by id,
 * so moves, falls and shuffles animate with plain CSS transitions. Drag a
 * candy towards a neighbour (or tap one, then the neighbour) to swap. The
 * keyboard moves a cursor; Enter picks a candy up and an arrow swaps it.
 */
export function CandyBoard({
  view,
  disabled,
  hint,
  mode,
  showExits,
  onSwap,
  onCell,
  label,
}: {
  view: View;
  disabled: boolean;
  hint: [number, number] | null;
  mode: BoardMode;
  showExits: boolean;
  onSwap: (a: number, b: number) => void;
  onCell: (cell: number) => void;
  label: string;
}) {
  const s = view.state;
  const { w, h } = s;
  const [selected, setSelected] = useState<number | null>(null);
  const [cursor, setCursor] = useState(() => Math.floor(h / 2) * w + Math.floor(w / 2));
  const press = useRef<{ cell: number; x: number; y: number; done: boolean } | null>(null);
  const boardEl = useRef<HTMLDivElement>(null);
  const exits = useMemo(() => (showExits ? exitCells(s) : []), [showExits, s]);

  const pos = (i: number) => ({ left: `${((i % w) / w) * 100}%`, top: `${(Math.floor(i / w) / h) * 100}%` });

  const cellAt = (x: number, y: number) => {
    const r = boardEl.current?.getBoundingClientRect();
    if (!r) return -1;
    const c = Math.floor(((x - r.left) / r.width) * w);
    const row = Math.floor(((y - r.top) / r.height) * h);
    return c < 0 || row < 0 || c >= w || row >= h ? -1 : row * w + c;
  };

  const neighbour = (cell: number, dx: number, dy: number) => {
    const c = (cell % w) + dx;
    const r = Math.floor(cell / w) + dy;
    return c < 0 || r < 0 || c >= w || r >= h ? -1 : r * w + c;
  };

  const tryPair = (a: number, b: number) => {
    setSelected(null);
    if (b >= 0) onSwap(a, b);
  };

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (disabled) return;
    const cell = cellAt(e.clientX, e.clientY);
    if (cell < 0) return;
    if (mode === 'hammer') {
      onCell(cell);
      return;
    }
    e.currentTarget.setPointerCapture?.(e.pointerId);
    press.current = { cell, x: e.clientX, y: e.clientY, done: false };
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const p = press.current;
    if (!p || p.done || disabled) return;
    const dx = e.clientX - p.x;
    const dy = e.clientY - p.y;
    const size = (boardEl.current?.getBoundingClientRect().width ?? 320) / w;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < size * 0.3) return;
    p.done = true;
    const target = Math.abs(dx) > Math.abs(dy) ? neighbour(p.cell, Math.sign(dx), 0) : neighbour(p.cell, 0, Math.sign(dy));
    tryPair(p.cell, target);
  };

  const onPointerUp = () => {
    const p = press.current;
    press.current = null;
    if (!p || p.done || disabled) return;
    if (selected === null) setSelected(p.cell);
    else if (selected === p.cell) setSelected(null);
    else {
      const [a, b] = [selected, p.cell];
      const isNeighbour = Math.abs(a - b) === w || (Math.abs(a - b) === 1 && Math.floor(a / w) === Math.floor(b / w));
      if (isNeighbour) tryPair(a, b);
      else setSelected(p.cell);
    }
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (disabled) return;
    const dirs: Record<string, [number, number]> = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] };
    if (e.key in dirs) {
      e.preventDefault();
      const [dx, dy] = dirs[e.key];
      if (selected !== null) tryPair(selected, neighbour(selected, dx, dy));
      else {
        const n = neighbour(cursor, dx, dy);
        if (n >= 0) setCursor(n);
      }
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (mode === 'hammer') onCell(cursor);
      else setSelected(selected === cursor ? null : cursor);
    } else if (e.key === 'Escape') setSelected(null);
  };

  const cursorCell = s.cells[cursor];
  const cursorText = !cursorCell?.playable
    ? 'no cell'
    : cursorCell.chocolate
      ? 'chocolate'
      : cursorCell.icing
        ? `icing, ${cursorCell.icing} layer${cursorCell.icing > 1 ? 's' : ''}`
        : `${cursorCell.lock ? 'locked ' : ''}${describe(s.pieces[cursor])}${cursorCell.jelly ? ` on ${cursorCell.jelly === 2 ? 'double ' : ''}jelly` : ''}`;

  return (
    <div
      ref={boardEl}
      className={`cm-board mode-${mode}${disabled ? ' is-busy' : ''}`}
      style={{ ['--w' as string]: w, ['--h' as string]: h }}
      role="application"
      tabIndex={0}
      aria-label={`${label}. Cursor on row ${Math.floor(cursor / w) + 1}, column ${(cursor % w) + 1}: ${cursorText}. Arrow keys move, Enter picks up, then an arrow swaps.`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={() => (press.current = null)}
      onKeyDown={onKeyDown}
    >
      {s.cells.map((c, i) =>
        c.playable ? (
          <div key={`t${i}`} className={`cm-tile${(Math.floor(i / w) + (i % w)) % 2 ? ' alt' : ''}`} style={pos(i)}>
            {c.jelly > 0 && <span className={`cm-jelly j${c.jelly}`} />}
          </div>
        ) : null,
      )}
      {exits.map((i) => (
        <div key={`x${i}`} className="cm-exit" style={pos(i)} aria-hidden="true">
          <svg viewBox="0 0 100 100">
            <path d="M34 80 L50 94 L66 80" />
          </svg>
        </div>
      ))}
      {s.pieces.map((p, i) =>
        p ? (
          <div
            key={p.id}
            className={`cm-piece${view.popping.has(i) ? ' pop' : ''}${selected === i ? ' sel' : ''}${hint && (hint[0] === i || hint[1] === i) ? ' hint' : ''}${view.spawned.has(p.id) ? ' spawn' : ''}${p.kind === 'candy' && p.special !== 'none' ? ' special' : ''}`}
            style={{ ...pos(i), ['--drop' as string]: view.spawned.get(p.id) ?? 0 }}
            aria-hidden="true"
          >
            <svg viewBox="0 0 100 100" className="cm-face">
              <PieceFace piece={p} />
            </svg>
          </div>
        ) : null,
      )}
      {s.cells.map((c, i) => {
        if (!c.playable) return null;
        const cracked = view.cracked.has(i) ? ' cracked' : '';
        if (c.chocolate)
          return (
            <div key={`o${i}`} className={`cm-block cm-choc${cracked}`} style={pos(i)} aria-hidden="true">
              <svg viewBox="0 0 100 100">
                <rect x="6" y="6" width="88" height="88" rx="12" fill="#6b3a1e" />
                <path d="M6 50 H94 M50 6 V94" stroke="#3f200e" strokeWidth="5" />
                <rect x="12" y="12" width="32" height="32" rx="6" fill="#8b4a24" />
                <rect x="56" y="56" width="32" height="32" rx="6" fill="#8b4a24" />
              </svg>
            </div>
          );
        if (c.icing > 0)
          return (
            <div key={`o${i}`} className={`cm-block cm-icing i${c.icing}${cracked}`} style={pos(i)} aria-hidden="true">
              <svg viewBox="0 0 100 100">
                <rect x="5" y="5" width="90" height="90" rx="16" />
                <path d="M5 30 Q 20 44 30 30 T 55 30 T 80 30 T 95 34" className="drip" />
                {c.icing > 1 && <path d="M20 70 H80 M20 58 H80" className="layer" />}
              </svg>
            </div>
          );
        if (c.lock)
          return (
            <div key={`o${i}`} className={`cm-block cm-lock${cracked}`} style={pos(i)} aria-hidden="true">
              <svg viewBox="0 0 100 100">
                <path d="M8 30 H92 M8 70 H92 M30 8 V92 M70 8 V92" />
              </svg>
            </div>
          );
        return cracked ? <div key={`o${i}`} className="cm-block cm-poof" style={pos(i)} aria-hidden="true" /> : null;
      })}
      {view.effects.map(({ key, fired }) => {
        const r = Math.floor(fired.cell / w);
        const c = fired.cell % w;
        if (fired.special === 'row') return <div key={key} className="cm-fx fx-row" style={{ top: `${(r / h) * 100}%` }} />;
        if (fired.special === 'col') return <div key={key} className="cm-fx fx-col" style={{ left: `${(c / w) * 100}%` }} />;
        return (
          <div
            key={key}
            className={`cm-fx ${fired.special === 'rainbow' ? 'fx-rainbow' : 'fx-ring'}`}
            style={{ left: `${((c + 0.5) / w) * 100}%`, top: `${((r + 0.5) / h) * 100}%`, ['--fx' as string]: CANDY_COLORS[fired.color] ?? '#fff' }}
          />
        );
      })}
      {view.floaters.map((f) => (
        <div
          key={f.key}
          className={`cm-float${f.big ? ' big' : ''}`}
          style={f.cell >= 0 ? { left: `${(((f.cell % w) + 0.5) / w) * 100}%`, top: `${((Math.floor(f.cell / w) + 0.5) / h) * 100}%` } : undefined}
          aria-hidden="true"
        >
          {f.text}
        </div>
      ))}
      <div className="cm-cursor" style={pos(cursor)} aria-hidden="true" />
    </div>
  );
}
