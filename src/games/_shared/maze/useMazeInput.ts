import { useRef } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import type { Direction } from '@/game-engine/InputManager';
import { swipeDirection, useDirectionKeys } from '../puzzle/useDirectionKeys';

/**
 * Keyboard and swipe input for maze runners. A key press is a single step;
 * Shift + arrow or a swipe runs along the corridor to the next junction.
 */
export function useMazeInput(
  enabled: boolean,
  onStep: (dir: Direction) => void,
  onRun: (dir: Direction) => void,
) {
  const start = useRef<{ x: number; y: number; id: number } | null>(null);

  useDirectionKeys((dir, e) => (e.shiftKey ? onRun(dir) : onStep(dir)), enabled);

  return {
    onPointerDown: (e: ReactPointerEvent<SVGSVGElement>) => {
      if (!enabled) return;
      start.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
      e.currentTarget.setPointerCapture?.(e.pointerId);
    },
    onPointerUp: (e: ReactPointerEvent<SVGSVGElement>) => {
      const s = start.current;
      start.current = null;
      if (!enabled || !s || s.id !== e.pointerId) return;
      const dir = swipeDirection(e.clientX - s.x, e.clientY - s.y);
      if (dir) onRun(dir);
    },
  };
}
