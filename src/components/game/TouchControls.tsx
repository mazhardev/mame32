import type { ReactNode } from 'react';
import type { Direction } from '@/game-engine/InputManager';

interface DPadProps {
  onPress: (dir: Direction) => void;
  onRelease?: (dir: Direction) => void;
  /** Omit vertical arrows for games that only move left/right. */
  axis?: 'both' | 'horizontal';
}

/**
 * Large-hit-area virtual controls for touch devices.
 * Uses pointer events with capture so a held button keeps firing while the
 * finger drifts, and blocks the default gesture so the page never scrolls.
 */
export function DPad({ onPress, onRelease, axis = 'both' }: DPadProps) {
  const bind = (dir: Direction) => ({
    onPointerDown: (e: React.PointerEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId);
      onPress(dir);
    },
    onPointerUp: (e: React.PointerEvent<HTMLButtonElement>) => {
      e.preventDefault();
      onRelease?.(dir);
    },
    onPointerCancel: () => onRelease?.(dir),
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
    'aria-label': `Move ${dir}`,
  });

  return (
    <div className="dpad" role="group" aria-label="Direction pad">
      {axis === 'both' && (
        <button className="up" {...bind('up')}>
          ▲
        </button>
      )}
      <button className="left" {...bind('left')}>
        ◀
      </button>
      <button className="right" {...bind('right')}>
        ▶
      </button>
      {axis === 'both' && (
        <button className="down" {...bind('down')}>
          ▼
        </button>
      )}
    </div>
  );
}

interface ActionProps {
  label: string;
  onPress: () => void;
  onRelease?: () => void;
  ariaLabel?: string;
}

export function ActionButton({ label, onPress, onRelease, ariaLabel }: ActionProps) {
  return (
    <button
      className="action-btn"
      aria-label={ariaLabel ?? label}
      onPointerDown={(e) => {
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        onPress();
      }}
      onPointerUp={(e) => {
        e.preventDefault();
        onRelease?.();
      }}
      onPointerCancel={() => onRelease?.()}
      onContextMenu={(e) => e.preventDefault()}
    >
      {label}
    </button>
  );
}

export function TouchControls({ children }: { children: ReactNode }) {
  return <div className="touch-controls">{children}</div>;
}
