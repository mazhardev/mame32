import { useEffect, useRef } from 'react';
import type { Direction } from '@/game-engine/InputManager';

const KEYS: Record<string, Direction> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  w: 'up',
  W: 'up',
  s: 'down',
  S: 'down',
  a: 'left',
  A: 'left',
  d: 'right',
  D: 'right',
};

function isTyping(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  return !!el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));
}

/**
 * Arrow keys / WASD for puzzles moved as a whole (sliding tiles, a maze
 * runner). Ignores form fields and shortcuts, and only suppresses page
 * scrolling for keys it actually handled.
 */
export function useDirectionKeys(
  onDirection: (dir: Direction, event: KeyboardEvent) => void,
  enabled: boolean,
  extra?: Record<string, () => void>,
) {
  const dirRef = useRef(onDirection);
  const extraRef = useRef(extra);
  dirRef.current = onDirection;
  extraRef.current = extra;

  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || e.defaultPrevented || isTyping(e.target)) return;
      const dir = KEYS[e.key];
      if (dir) {
        e.preventDefault();
        dirRef.current(dir, e);
        return;
      }
      const action = extraRef.current?.[e.key];
      if (action && !e.repeat) {
        e.preventDefault();
        action();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [enabled]);
}

/** Pointer swipe detection for an element; taps (short moves) are ignored. */
export function swipeDirection(dx: number, dy: number, threshold = 24): Direction | null {
  if (Math.max(Math.abs(dx), Math.abs(dy)) < threshold) return null;
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? 'right' : 'left';
  return dy > 0 ? 'down' : 'up';
}
