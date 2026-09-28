import { useRef, useState } from 'react';
import type { KeyboardEvent, PointerEvent as ReactPointerEvent, ReactNode } from 'react';
import type { Board, Config, Piece } from './engine';
import './match3.css';

export interface Skin {
  colors: string[];
  names: string[];
  /** Draws a piece's face (in a 100×100 viewBox). */
  face: (color: number) => ReactNode;
  className?: string;
}

/**
 * Renders a match-three board with animated swaps, pops and falls. Pieces
 * are positioned absolutely by cell so React keeps each piece's element
 * while it moves. Drag a piece towards a neighbour to swap, or tap one
 * piece then an adjacent one; the keyboard moves a cursor and swaps with
 * Enter + arrow.
 */
export function Match3Board({
  cfg,
  board,
  popping,
  spawned,
  skin,
  disabled,
  hint,
  underlay,
  onSwap,
  label,
}: {
  cfg: Config;
  board: Board;
  popping: Set<number>;
  spawned: Map<number, number>;
  skin: Skin;
  disabled: boolean;
  hint?: [number, number] | null;
  /** Extra per-cell layer drawn beneath pieces (e.g. jelly). */
  underlay?: (cell: number) => ReactNode;
  onSwap: (a: number, b: number) => void;
  label: string;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const [cursor, setCursor] = useState(0);
  const press = useRef<{ cell: number; x: number; y: number; done: boolean } | null>(null);
  const boardEl = useRef<HTMLDivElement>(null);

  const cellAt = (x: number, y: number) => {
    const r = boardEl.current?.getBoundingClientRect();
    if (!r) return -1;
    const c = Math.floor(((x - r.left) / r.width) * cfg.w);
    const row = Math.floor(((y - r.top) / r.height) * cfg.h);
    return c < 0 || row < 0 || c >= cfg.w || row >= cfg.h ? -1 : row * cfg.w + c;
  };

  const neighbour = (cell: number, dx: number, dy: number) => {
    const c = (cell % cfg.w) + dx;
    const r = Math.floor(cell / cfg.w) + dy;
    return c < 0 || r < 0 || c >= cfg.w || r >= cfg.h ? -1 : r * cfg.w + c;
  };

  const tryPair = (a: number, b: number) => {
    setSelected(null);
    if (b >= 0) onSwap(a, b);
  };

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (disabled) return;
    const cell = cellAt(e.clientX, e.clientY);
    if (cell < 0) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    press.current = { cell, x: e.clientX, y: e.clientY, done: false };
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const p = press.current;
    if (!p || p.done || disabled) return;
    const dx = e.clientX - p.x;
    const dy = e.clientY - p.y;
    const size = (boardEl.current?.getBoundingClientRect().width ?? 320) / cfg.w;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < size * 0.35) return;
    p.done = true;
    const target = Math.abs(dx) > Math.abs(dy) ? neighbour(p.cell, Math.sign(dx), 0) : neighbour(p.cell, 0, Math.sign(dy));
    tryPair(p.cell, target);
  };

  const onPointerUp = () => {
    const p = press.current;
    press.current = null;
    if (!p || p.done || disabled) return;
    // A tap: select, or swap with the selected neighbour.
    if (selected === null) setSelected(p.cell);
    else if (selected === p.cell) setSelected(null);
    else {
      const [a, b] = [selected, p.cell];
      const isNeighbour = Math.abs(a - b) === cfg.w || (Math.abs(a - b) === 1 && Math.floor(a / cfg.w) === Math.floor(b / cfg.w));
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
      const n = neighbour(cursor, dx, dy);
      if (n < 0) return;
      if (selected !== null) tryPair(selected, neighbour(selected, dx, dy));
      else setCursor(n);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setSelected(selected === cursor ? null : cursor);
    } else if (e.key === 'Escape') setSelected(null);
  };

  const describe = (p: Piece | null) =>
    p ? `${skin.names[p.color]}${p.special !== 'none' ? ` ${p.special === 'rainbow' ? 'rainbow' : p.special === 'bomb' ? 'bomb' : 'striped'}` : ''}` : 'empty';

  return (
    <div
      ref={boardEl}
      className={`m3-board ${skin.className ?? ''}`}
      style={{ ['--w' as string]: cfg.w, ['--h' as string]: cfg.h }}
      role="application"
      tabIndex={0}
      aria-label={`${label}. Cursor on row ${Math.floor(cursor / cfg.w) + 1}, column ${(cursor % cfg.w) + 1}: ${describe(board[cursor])}. Arrow keys move, Enter picks up, then an arrow swaps.`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={() => (press.current = null)}
      onKeyDown={onKeyDown}
    >
      {underlay &&
        Array.from({ length: cfg.w * cfg.h }, (_, i) => (
          <div
            key={`u${i}`}
            className="m3-under"
            style={{ left: `${((i % cfg.w) / cfg.w) * 100}%`, top: `${(Math.floor(i / cfg.w) / cfg.h) * 100}%` }}
          >
            {underlay(i)}
          </div>
        ))}
      {board.map((p, i) =>
        p ? (
          <div
            key={p.id}
            className={`m3-piece${popping.has(i) ? ' pop' : ''}${selected === i ? ' sel' : ''}${hint && (hint[0] === i || hint[1] === i) ? ' hint' : ''}${spawned.has(p.id) ? ' spawn' : ''} sp-${p.special}`}
            style={{
              left: `${((i % cfg.w) / cfg.w) * 100}%`,
              top: `${(Math.floor(i / cfg.w) / cfg.h) * 100}%`,
              ['--drop' as string]: spawned.get(p.id) ?? 0,
              ['--piece' as string]: skin.colors[p.color],
            }}
            aria-hidden="true"
          >
            <svg viewBox="0 0 100 100" className="m3-face">
              {p.special === 'rainbow' ? <RainbowFace /> : skin.face(p.color)}
              {(p.special === 'row' || p.special === 'col') && (
                <g className="m3-stripes" transform={p.special === 'col' ? 'rotate(90 50 50)' : undefined}>
                  <rect x="12" y="36" width="76" height="7" rx="3" />
                  <rect x="12" y="57" width="76" height="7" rx="3" />
                </g>
              )}
              {p.special === 'bomb' && <circle cx="50" cy="50" r="44" className="m3-bomb" />}
            </svg>
          </div>
        ) : null,
      )}
      <div
        className="m3-cursor"
        style={{ left: `${((cursor % cfg.w) / cfg.w) * 100}%`, top: `${(Math.floor(cursor / cfg.w) / cfg.h) * 100}%` }}
        aria-hidden="true"
      />
    </div>
  );
}

const WEDGES = ['#ef4444', '#f59e0b', '#84cc16', '#06b6d4', '#6366f1', '#d946ef'];

function wedge(k: number): string {
  const a0 = (k / 6) * Math.PI * 2 - Math.PI / 2;
  const a1 = ((k + 1) / 6) * Math.PI * 2 - Math.PI / 2;
  const p = (a: number) => `${50 + 40 * Math.cos(a)} ${50 + 40 * Math.sin(a)}`;
  return `M50 50 L${p(a0)} A40 40 0 0 1 ${p(a1)} Z`;
}

function RainbowFace() {
  return (
    <g>
      {WEDGES.map((c, k) => (
        <path key={k} d={wedge(k)} fill={c} />
      ))}
      <circle cx="50" cy="50" r="40" className="m3-rainbow" />
      <circle cx="50" cy="50" r="12" fill="#fff" />
    </g>
  );
}
