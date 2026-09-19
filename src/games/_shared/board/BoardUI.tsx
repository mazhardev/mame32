import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import './board.css';

export type PlayMode = 'ai' | 'local';

/**
 * Plays the computer's move after a short pause so humans can follow it.
 * The timer is cancelled whenever the position changes, the game pauses or
 * the component unmounts, so an AI move can never land on a stale board.
 */
export function useComputerTurn<M>(
  active: boolean,
  think: () => M | null,
  play: (move: M) => void,
  positionKey: unknown,
  delay = 450,
): void {
  const thinkRef = useRef(think);
  const playRef = useRef(play);
  thinkRef.current = think;
  playRef.current = play;
  useEffect(() => {
    if (!active) return;
    const id = window.setTimeout(() => {
      const move = thinkRef.current();
      if (move !== null) playRef.current(move);
    }, delay);
    return () => window.clearTimeout(id);
  }, [active, positionKey, delay]);
}

export function ModePicker({
  mode,
  onChange,
  disabled,
  localLabel = '2 players',
}: {
  mode: PlayMode;
  onChange: (m: PlayMode) => void;
  disabled?: boolean;
  localLabel?: string;
}) {
  return (
    <div className="seg" role="radiogroup" aria-label="Opponent">
      {(['ai', 'local'] as const).map((m) => (
        <button
          key={m}
          type="button"
          role="radio"
          aria-checked={mode === m}
          className={mode === m ? 'on' : ''}
          disabled={disabled}
          onClick={() => onChange(m)}
        >
          {m === 'ai' ? 'vs Computer' : localLabel}
        </button>
      ))}
    </div>
  );
}

export function StatusBar({ children }: { children: ReactNode }) {
  return (
    <div className="board-status" role="status" aria-live="polite">
      {children}
    </div>
  );
}

/** Centered layout for board games: status, board, then controls. */
export function BoardLayout({ children }: { children: ReactNode }) {
  return <div className="board-layout">{children}</div>;
}
