import { useRef } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';

/**
 * Pointer dragging across a grid of equal cells. Reports the cell under the
 * pointer on press, then every cell entered while dragging. Fast drags that
 * skip cells are filled in one orthogonal step at a time, so path-drawing
 * games always receive adjacent cells.
 */
export function useCellDrag(
  cols: number,
  rows: number,
  handlers: {
    onStart: (cell: number) => void;
    onEnter: (cell: number) => void;
    onEnd?: () => void;
  },
  enabled: boolean,
) {
  const last = useRef(-1);
  const active = useRef(false);
  const h = useRef(handlers);
  h.current = handlers;

  const cellAt = (el: HTMLElement, x: number, y: number) => {
    const rect = el.getBoundingClientRect();
    const c = Math.floor(((x - rect.left) / rect.width) * cols);
    const r = Math.floor(((y - rect.top) / rect.height) * rows);
    if (c < 0 || r < 0 || c >= cols || r >= rows) return -1;
    return r * cols + c;
  };

  return {
    onPointerDown: (e: ReactPointerEvent<HTMLElement>) => {
      if (!enabled || e.button > 0) return;
      const cell = cellAt(e.currentTarget, e.clientX, e.clientY);
      if (cell < 0) return;
      e.preventDefault();
      e.currentTarget.setPointerCapture?.(e.pointerId);
      active.current = true;
      last.current = cell;
      h.current.onStart(cell);
    },
    onPointerMove: (e: ReactPointerEvent<HTMLElement>) => {
      if (!active.current || !enabled) return;
      const cell = cellAt(e.currentTarget, e.clientX, e.clientY);
      if (cell < 0 || cell === last.current) return;
      // Walk from the previous cell to this one in unit steps.
      let at = last.current;
      let guard = cols + rows + 2;
      while (at !== cell && guard-- > 0) {
        const [ax, ay] = [at % cols, Math.floor(at / cols)];
        const [bx, by] = [cell % cols, Math.floor(cell / cols)];
        const dx = bx - ax;
        const dy = by - ay;
        at = Math.abs(dx) >= Math.abs(dy) ? at + Math.sign(dx) : at + Math.sign(dy) * cols;
        last.current = at;
        h.current.onEnter(at);
      }
    },
    onPointerUp: () => {
      if (!active.current) return;
      active.current = false;
      last.current = -1;
      h.current.onEnd?.();
    },
    onPointerCancel: () => {
      if (!active.current) return;
      active.current = false;
      last.current = -1;
      h.current.onEnd?.();
    },
  };
}
