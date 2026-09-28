import type { ReactNode } from 'react';
import './puzzle.css';

/** "Continue saved game?" card shown above the board while a save is pending. */
export function ResumePrompt({
  label,
  onContinue,
  onNew,
}: {
  label: ReactNode;
  onContinue: () => void;
  onNew: () => void;
}) {
  return (
    <div className="pz-resume card" role="group" aria-label="Saved game">
      <div>
        <strong>Saved game found</strong>
        <div className="small muted">{label}</div>
      </div>
      <div className="row" style={{ gap: 8 }}>
        <button type="button" className="btn btn-primary btn-sm" onClick={onContinue}>
          Continue
        </button>
        <button type="button" className="btn btn-sm" onClick={onNew}>
          New game
        </button>
      </div>
    </div>
  );
}

/** A row of secondary puzzle actions (undo, hint, reset…). */
export function PuzzleActions({ children }: { children: ReactNode }) {
  return <div className="pz-actions">{children}</div>;
}

/** Big friendly "Start" panel shown before a timed round begins. */
export function StartPanel({
  title,
  children,
  onStart,
  startLabel = 'Start',
}: {
  title: string;
  children?: ReactNode;
  onStart: () => void;
  startLabel?: string;
}) {
  return (
    <div className="pz-start card">
      <h2>{title}</h2>
      {children}
      <button type="button" className="btn btn-primary btn-lg" onClick={onStart}>
        {startLabel}
      </button>
    </div>
  );
}
