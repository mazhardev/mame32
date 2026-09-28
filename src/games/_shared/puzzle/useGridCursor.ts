import { useCallback, useEffect, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';

/**
 * Roving-tabindex keyboard navigation for a grid of cells.
 *
 * Only the cell under the cursor is in the Tab order; arrow keys move the
 * cursor and focus with it, Home/End jump along the row. Cells stay native
 * buttons, so Enter and Space activate them without extra wiring.
 */
export function useGridCursor(rows: number, cols: number, start = 0) {
  const [cursor, setCursor] = useState(start);
  const refs = useRef<(HTMLElement | null)[]>([]);
  const focusNext = useRef(false);

  useEffect(() => {
    if (cursor >= rows * cols) setCursor(0);
  }, [cursor, rows, cols]);

  useEffect(() => {
    if (!focusNext.current) return;
    focusNext.current = false;
    refs.current[cursor]?.focus();
  }, [cursor]);

  const onKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const r = Math.floor(cursor / cols);
      const c = cursor % cols;
      let next = cursor;
      if (e.key === 'ArrowUp') next = r > 0 ? cursor - cols : cursor;
      else if (e.key === 'ArrowDown') next = r < rows - 1 ? cursor + cols : cursor;
      else if (e.key === 'ArrowLeft') next = c > 0 ? cursor - 1 : cursor;
      else if (e.key === 'ArrowRight') next = c < cols - 1 ? cursor + 1 : cursor;
      else if (e.key === 'Home') next = r * cols;
      else if (e.key === 'End') next = r * cols + cols - 1;
      else return;
      e.preventDefault();
      if (next !== cursor) {
        focusNext.current = true;
        setCursor(next);
      }
    },
    [cursor, rows, cols],
  );

  /** Spread onto each cell element. */
  const cellProps = useCallback(
    (i: number) => ({
      tabIndex: i === cursor ? 0 : -1,
      ref: (el: HTMLElement | null) => {
        refs.current[i] = el;
      },
      onFocus: () => {
        if (i !== cursor) setCursor(i);
      },
      onKeyDown,
    }),
    [cursor, onKeyDown],
  );

  return { cursor, setCursor, cellProps };
}

/** True when the player asked for reduced motion, in the app or the OS. */
export function prefersReducedMotion(): boolean {
  if (typeof document === 'undefined') return false;
  if (document.documentElement.getAttribute('data-reduced-motion') === 'true') return true;
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}
